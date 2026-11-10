namespace App.Api.Auth;

public sealed class SessionLookupException(Exception inner) : Exception("Session lookup failed", inner);
public sealed class ReauthRequiredException() : Exception("Sign in again to continue");

// Endpoint metadata on every endpoint that signs a user in, naming how. The ticket store never renews an
// incoming key on these, so every sign-in gets a fresh key and a session planted before it is worthless.
// Needs app.UseRouting() before app.UseAuthentication(), or the store can't see the endpoint.
public sealed record StartsSession(string Method);

public sealed record CurrentSession(string Key, DateTime CreatedAt, string SignInMethod)
{
    public const string ItemKey = "auth.session";
    public static CurrentSession? Of(HttpContext http) => http.Items[ItemKey] as CurrentSession;
    public bool SecondFactorUsed => SignInMethod is "passkey" or "second-factor";
}

public static class FreshSession
{
    public static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(10);

    public static void Require(HttpContext http)
    {
        var now = http.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        if (CurrentSession.Of(http) is not { } s || now - s.CreatedAt > MaxAge) throw new ReauthRequiredException();
    }
}

// The cookie holds only a session key. The ticket lives here, so one session can be revoked and
// "sign out everywhere" takes effect on the next request instead of after the security stamp interval.
public sealed class EfTicketStore(IServiceScopeFactory scopes, IHttpContextAccessor http, TimeProvider clock, ILogger<AuthLog> log) : ITicketStore
{
    public static readonly TimeSpan Idle = TimeSpan.FromDays(7), Absolute = TimeSpan.FromDays(30);
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public Task<string> StoreAsync(AuthenticationTicket ticket) => Use(async db =>
    {
        var key = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var ctx = http.HttpContext;
        var userId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        db.UserSessions.Add(new UserSession
        {
            Key = key,
            UserId = userId,
            Ticket = TicketSerializer.Default.Serialize(ticket),
            SignInMethod = ctx?.GetEndpoint()?.Metadata.GetMetadata<StartsSession>()?.Method ?? "password",
            CreatedAt = Now,
            LastSeenAt = Now,
            ExpiresAt = Now + Idle,
            IpAddress = ctx?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = ctx?.Request.Headers.UserAgent.ToString(),
        });
        db.AuthEvents.Add(new AuthEvent { UserId = userId, Kind = "sign-in", At = Now }); // every sign-in method passes here
        await db.SaveChangesAsync();
        return key;
    });

    // A refresh (password change, MFA change, the sliding window) keeps the key, the user and the sign-in method.
    // A key never changes hands: a ticket for another user throws, so a sign-in endpoint that forgot StartsSession
    // fails instead of adopting a planted key. A row that is already gone (revoked mid-request) is left gone.
    public Task RenewAsync(string key, AuthenticationTicket ticket) => Use(async db =>
    {
        var userId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var renewed = await db.UserSessions.Where(s => s.Key == key && s.UserId == userId)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.Ticket, TicketSerializer.Default.Serialize(ticket)));
        if (renewed == 0 && await db.UserSessions.AnyAsync(s => s.Key == key))
            throw new InvalidOperationException("A session key can't change users. Is StartsSession missing on a sign-in endpoint?");
        return renewed;
    });

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        try
        {
            // On a sign-in endpoint the incoming session ends here. Returning null leaves the cookie handler
            // without a key, so the sign-in that follows calls StoreAsync with a fresh one.
            if (http.HttpContext?.GetEndpoint()?.Metadata.GetMetadata<StartsSession>() is not null)
            {
                await Use(db => db.UserSessions.Where(s => s.Key == key).ExecuteDeleteAsync());
                return null;
            }
            return await Use<AuthenticationTicket?>(async db =>
            {
                var row = await db.UserSessions.SingleOrDefaultAsync(s => s.Key == key);
                if (row is null) return null;
                if (Now >= row.ExpiresAt || Now >= row.CreatedAt + Absolute)
                {
                    // Fails closed: if the aged session can't be ended, the request gets 503, never the route.
                    db.UserSessions.Remove(row);
                    try { await db.SaveChangesAsync(); }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        log.SessionRevokeFailed(ex.GetType().Name); // never the key or an id
                        throw;
                    }
                    return null;
                }
                row.LastSeenAt = Now;
                row.ExpiresAt = Now + Idle;
                await db.SaveChangesAsync();
                if (http.HttpContext is { } c) c.Items[CurrentSession.ItemKey] = new CurrentSession(row.Key, row.CreatedAt, row.SignInMethod);
                return TicketSerializer.Default.Deserialize(row.Ticket);
            });
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new SessionLookupException(ex); // mapped to 503: the route never runs
        }
    }

    public Task RemoveAsync(string key) => Use(db => db.UserSessions.Where(s => s.Key == key).ExecuteDeleteAsync());

    private async Task<T> Use<T>(Func<AppDbContext, Task<T>> work)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}

public sealed class SessionCleanup(IServiceScopeFactory scopes, TimeProvider clock, ILogger<SessionCleanup> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1), clock);
        do // once at start, so a restart never skips a day, then daily
        {
            try
            {
                var (sessions, events) = await RunOnce(stoppingToken);
                log.Cleanup(sessions, events);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.CleanupFailed(ex.GetType().Name); }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task<(int Sessions, int Events)> RunOnce(CancellationToken ct = default)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = clock.GetUtcNow().UtcDateTime;
        var capStart = now - EfTicketStore.Absolute;
        var eventsBefore = now - AuthEventLog.Retention;
        var sessions = await db.UserSessions.Where(s => s.ExpiresAt <= now || s.CreatedAt <= capStart).ExecuteDeleteAsync(ct);
        var events = await db.AuthEvents.Where(e => e.At < eventsBefore).ExecuteDeleteAsync(ct);
        return (sessions, events);
    }
}

public sealed record SessionDto(int Id, string? Device, string? IpAddress, DateTime LastSeenAt, bool Current);

public sealed class SessionService(AppDbContext db)
{
    public Task<List<SessionDto>> ListAsync(string userId, string? currentKey) =>
        db.UserSessions.Where(s => s.UserId == userId).OrderByDescending(s => s.LastSeenAt)
            .Select(s => new SessionDto(s.Id, s.UserAgent, s.IpAddress, s.LastSeenAt, s.Key == currentKey)).ToListAsync();

    public Task<int> RevokeAsync(string userId, int id) => db.UserSessions.Where(s => s.UserId == userId && s.Id == id).ExecuteDeleteAsync();

    // Password, MFA or recovery-code change: every other session ends now, this one stays.
    public Task<int> RevokeOthersAsync(string userId, string keepKey) => db.UserSessions.Where(s => s.UserId == userId && s.Key != keepKey).ExecuteDeleteAsync();

    // Reset and account deletion: every session ends.
    public Task<int> RevokeAllAsync(string userId) => db.UserSessions.Where(s => s.UserId == userId).ExecuteDeleteAsync();
}

// Auth events: who and what, never an IP, a secret or an email (authn.md, Privacy). Sign-ins are recorded
// by the ticket store; failures and changes by the endpoints.
public sealed class AuthEventLog(AppDbContext db, TimeProvider clock)
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(90);

    public async Task RecordAsync(string userId, string kind)
    {
        db.AuthEvents.Add(new AuthEvent { UserId = userId, Kind = kind, At = clock.GetUtcNow().UtcDateTime });
        await db.SaveChangesAsync();
    }
}
