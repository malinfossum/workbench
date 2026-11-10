using System.Globalization;

namespace App.Tests.Auth;

// A clock the tests move by hand. Timers still run on real time.
public sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => Now;
    public void Advance(TimeSpan by) => Now += by;
}

// TestServer has no socket, so every request gets this client address, or the one in X-Test-Client-Ip.
// It runs before the app's own middleware, forwarded headers included.
public sealed class FixedRemoteIp : IStartupFilter
{
    public static readonly IPAddress Address = IPAddress.Parse("203.0.113.7");
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        app.Use((ctx, inner) =>
        {
            ctx.Connection.RemoteIpAddress = ctx.Request.Headers.TryGetValue("X-Test-Client-Ip", out var ip) ? IPAddress.Parse(ip.ToString()) : Address;
            return inner(ctx);
        });
        next(app);
    };
}

public static class Source
{
    // The scaffold's root: the folder holding App.slnx, with App.Core, App.Data and App.Api beside it.
    public static string Root { get; } = Find();
    private static string Find()
    {
        for (var d = new DirectoryInfo(TestContext.CurrentContext.TestDirectory); d is not null; d = d.Parent)
        {
            if (File.Exists(Path.Combine(d.FullName, "App.slnx"))) return d.FullName;
        }
        throw new DirectoryNotFoundException("App.slnx not found above the test folder");
    }
}

public sealed class CapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<string> Lines { get; } = new();
    public ILogger CreateLogger(string categoryName) => new Logger(this, categoryName);
    public void Dispose() { }
    private sealed class Logger(CapturingLoggerProvider owner, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? ex, Func<TState, Exception?, string> format) =>
            owner.Lines.Enqueue($"{category}: {format(state, ex)} {ex}");
    }
}

// RFC 6238 with Identity's defaults (SHA-1, 30 seconds, six digits), the way an authenticator app reads the key.
public static class Totp
{
    public static string Code(string base32Key, DateTimeOffset at)
    {
        var step = BitConverter.GetBytes(at.ToUnixTimeSeconds() / 30);
        if (BitConverter.IsLittleEndian) Array.Reverse(step);
        using var hmac = IncrementalHash.CreateHMAC(HashAlgorithmName.SHA1, FromBase32(base32Key)); // RFC 6238's default, which Identity uses
        hmac.AppendData(step);
        var hash = hmac.GetHashAndReset();
        var at4 = hash[^1] & 0xf;
        var value = ((hash[at4] & 0x7f) << 24) | (hash[at4 + 1] << 16) | (hash[at4 + 2] << 8) | hash[at4 + 3];
        return (value % 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
    }

    private static byte[] FromBase32(string text)
    {
        const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bytes = new List<byte>();
        int buffer = 0, bits = 0;
        foreach (var ch in text.TrimEnd('=').ToUpperInvariant())
        {
            buffer = (buffer << 5) | Alphabet.IndexOf(ch);
            bits += 5;
            if (bits >= 8) { bytes.Add((byte)(buffer >> (bits - 8))); bits -= 8; }
        }
        return bytes.ToArray();
    }
}

// A passkey the test holds itself: a P-256 key whose public half is stored as COSE, and an assertion signed the way an
// authenticator signs one. It covers sign-in only. Registration still needs a real browser.
public sealed class SoftPasskey : IDisposable
{
    private readonly ECDsa _key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    public byte[] Id { get; } = RandomNumberGenerator.GetBytes(16);

    // COSE_Key, EC2: { 1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y }
    public byte[] PublicKey()
    {
        var q = _key.ExportParameters(false).Q;
        return [0xA5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20, .. q.X!, 0x22, 0x58, 0x20, .. q.Y!];
    }

    // What PublicKeyCredential.toJSON() gives for navigator.credentials.get, answering the server's request options.
    public string Assertion(string requestOptionsJson, string origin, string rpId, string userId)
    {
        using var options = JsonDocument.Parse(requestOptionsJson);
        var challenge = options.RootElement.GetProperty("challenge").GetString()!;
        var clientData = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { type = "webauthn.get", challenge, origin, crossOrigin = false }));
        byte[] authData = [.. SHA256.HashData(Encoding.UTF8.GetBytes(rpId)), 0x05, 0, 0, 0, 1]; // user present and verified, sign count 1
        var signature = _key.SignData([.. authData, .. SHA256.HashData(clientData)], HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
        return JsonSerializer.Serialize(new
        {
            id = Base64Url.EncodeToString(Id),
            rawId = Base64Url.EncodeToString(Id),
            type = "public-key",
            clientExtensionResults = new { },
            response = new
            {
                clientDataJSON = Base64Url.EncodeToString(clientData),
                authenticatorData = Base64Url.EncodeToString(authData),
                signature = Base64Url.EncodeToString(signature),
                userHandle = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(userId)),
            },
        });
    }

    public void Dispose() => _key.Dispose();
}

public sealed class RecordingAuthEmail : IAuthEmail
{
    public ConcurrentQueue<(string To, string Kind, string Link)> Sent { get; } = new();
    public Task SendAsync(string recipient, string kind, string link) { Sent.Enqueue((recipient, kind, link)); return Task.CompletedTask; }
}

public sealed class NoBreaches : IBreachedPasswords
{
    public Task<bool> IsBreachedAsync(string password) => Task.FromResult(false);
}


public sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    public const string TestPhrase = "correct horse battery staple";
    public const string NewTestPhrase = "a different long passphrase";
    public const string Origin = "https://localhost";
    private readonly string _connection = $"Data Source=file:auth{Guid.NewGuid():N}?mode=memory&cache=shared;Pooling=False";
    public SqliteConnection KeepAlive { get; } // the in-memory database lives while this is open
    public CapturingLoggerProvider Logs { get; } = new();
    public RecordingAuthEmail Mail { get; } = new();
    public TestClock Clock { get; } = new();

    // The schema exists before the host starts, so the cleanup's first run at start finds its tables.
    public AuthApiFactory()
    {
        KeepAlive = new SqliteConnection(_connection);
        KeepAlive.Open();
        using var db = RawDb();
        db.Database.EnsureCreated();
    }

    private AppDbContext RawDb() => TestDb.Context(KeepAlive, "");

    // Rows that must exist before the host and its hosted services start. Call before anything touches Services.
    public void SeedBeforeStart(Action<AppDbContext> seed)
    {
        using var db = RawDb();
        seed(db);
        db.SaveChanges();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", _connection);
        builder.UseSetting("AllowedHosts", "localhost");
        builder.UseSetting("Auth:Origin", Origin);
        builder.UseSetting("Auth:PasskeyDomain", "localhost");
        builder.ConfigureLogging(l => l
            .AddProvider(Logs)
            // TestServer can't cap a request body, so routing warns on every /auth and /account request. Kestrel can (the 413 test).
            .AddFilter("Microsoft.AspNetCore.Routing.EndpointRoutingMiddleware", LogLevel.Error));
        builder.ConfigureServices(s =>
        {
            s.AddSingleton<IStartupFilter, FixedRemoteIp>();
            s.AddSingleton<TimeProvider>(Clock);
            s.AddSingleton<IAuthEmail>(Mail);
            s.AddSingleton<IBreachedPasswords>(new NoBreaches());
        });
    }

    public HttpClient Client(bool cookies = true) => ClientOf(this, cookies);

    // A browser sends Origin on every POST, PATCH and DELETE, so the test client does too.
    public static HttpClient ClientOf(WebApplicationFactory<Program> app, bool cookies = true)
    {
        var c = app.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri(Origin), AllowAutoRedirect = false, HandleCookies = cookies });
        c.DefaultRequestHeaders.Add("Origin", Origin);
        return c;
    }

    public async Task<T> With<T>(Func<IServiceProvider, Task<T>> work)
    {
        using var scope = Services.CreateScope();
        return await work(scope.ServiceProvider);
    }

    public Task<AppUser> SeedUser(string email, string tenant = "t1", Role role = Role.Member, bool twoFactor = false) => With(async sp =>
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        var user = new AppUser { UserName = email, Email = email, EmailConfirmed = true, TenantId = tenant, Role = role };
        var created = await users.CreateAsync(user, TestPhrase);
        if (!created.Succeeded) throw new InvalidOperationException(string.Join(", ", created.Errors.Select(e => e.Code)));
        if (twoFactor) { await users.ResetAuthenticatorKeyAsync(user); await users.SetTwoFactorEnabledAsync(user, true); }
        return user;
    });

    public Task<string[]> NewRecoveryCodes(AppUser user) => With(async sp =>
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        return (await users.GenerateNewTwoFactorRecoveryCodesAsync((await users.FindByIdAsync(user.Id))!, 10))!.ToArray();
    });

    // A stored passkey, as AddPasskey leaves one. Registration can't run headless; the gates only ask whether one exists.
    // With a SoftPasskey its public key is real, so the test can sign in with it.
    public Task<byte[]> SeedPasskey(AppUser user, string? name = null, SoftPasskey? key = null) => With(async sp =>
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        var id = key?.Id ?? RandomNumberGenerator.GetBytes(16);
        var publicKey = key?.PublicKey() ?? RandomNumberGenerator.GetBytes(77); // 77 bytes: the size of a P-256 COSE key
        var passkey = new UserPasskeyInfo(id, publicKey, Clock.GetUtcNow(), 0, null, true, false, false, [], []) { Name = name };
        var added = await users.AddOrUpdatePasskeyAsync((await users.FindByIdAsync(user.Id))!, passkey);
        if (!added.Succeeded) throw new InvalidOperationException(string.Join(", ", added.Errors.Select(e => e.Code)));
        return id;
    });

    public Task<int> SeedNote(string ownerId, string tenant, params string[] memberIds) => With(async sp =>
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var note = new Note { OwnerId = ownerId, TenantId = tenant, Title = "Note", Members = memberIds.Select(id => new NoteMember { UserId = id }).ToList() };
        db.Notes.Add(note);
        await db.SaveChangesAsync();
        return note.Id;
    });

    // Moves the sign-in time of every session the user has back by the given span.
    public Task<int> AgeSessions(string userId, TimeSpan by)
    {
        var signedIn = Clock.GetUtcNow().UtcDateTime - by;
        return With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.Where(s => s.UserId == userId).ExecuteUpdateAsync(u => u.SetProperty(s => s.CreatedAt, signedIn)));
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) KeepAlive.Dispose();
    }
}

public static class ClientExtensions
{
    public static Task<HttpResponseMessage> SignIn(this HttpClient c, string email, string password, string? returnUrl = null) =>
        c.PostAsJsonAsync("/auth/sign-in" + (returnUrl is null ? "" : "?returnUrl=" + Uri.EscapeDataString(returnUrl)), new { email, password });

    public static string SessionCookie(HttpResponseMessage r) =>
        r.Headers.GetValues("Set-Cookie").Single(h => h.StartsWith(".AspNetCore.Identity.Application=", StringComparison.Ordinal)).Split(';')[0];

    public static bool SetsSessionCookie(HttpResponseMessage r) =>
        r.Headers.TryGetValues("Set-Cookie", out var set) && set.Any(h => h.StartsWith(".AspNetCore.Identity.Application=", StringComparison.Ordinal));

    // "https://app/reset#uid=…&token=…" into { uid, token }. The fragment never reaches a server log or a Referer.
    public static Dictionary<string, string> Fragment(string link) =>
        new Uri(link).Fragment.TrimStart('#').Split('&').Select(p => p.Split('=', 2)).ToDictionary(p => p[0], p => Uri.UnescapeDataString(p[1]));

    // "403 {...}": the status and the raw body, so a wrong answer shows what came back.
    public static async Task<string> Said(HttpResponseMessage r) => $"{(int)r.StatusCode} {await r.Content.ReadAsStringAsync()}";

    public static async Task<string?> ErrorOf(HttpResponseMessage r) =>
        (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString();
}
