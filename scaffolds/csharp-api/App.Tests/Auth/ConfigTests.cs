namespace App.Tests.Auth;

public static class ConfigCheck
{
    public static void Check(IServiceProvider sp)
    {
        var cookies = sp.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>();
        foreach (var scheme in new[] { IdentityConstants.ApplicationScheme, IdentityConstants.TwoFactorUserIdScheme, IdentityConstants.TwoFactorRememberMeScheme })
        {
            var c = cookies.Get(scheme).Cookie;
            Require(c.HttpOnly && c.SecurePolicy == CookieSecurePolicy.Always && c.SameSite == SameSiteMode.Strict, $"{scheme} cookie HttpOnly, Secure, SameSite=Strict");
        }
        var cookie = cookies.Get(IdentityConstants.ApplicationScheme);
        Require(cookie.SessionStore is EfTicketStore, "server-side session store");
        Require(cookie.ExpireTimeSpan == TimeSpan.FromDays(7) && cookie.SlidingExpiration, "7-day idle window");
        var identity = sp.GetRequiredService<IOptions<IdentityOptions>>().Value;
        Require(!identity.Lockout.AllowedForNewUsers, "Identity lockout off");
        Require(identity.SignIn.RequireConfirmedEmail, "email confirmed before the first sign-in");
        Require(identity.Stores.SchemaVersion == IdentitySchemaVersions.Version3, "passkey schema");
        Require(identity.Password.RequiredLength >= 15, "15-character minimum");
        Require(sp.GetServices<IPasswordValidator<AppUser>>().Any(v => v is BreachedPasswordValidator), "breached-password check");
        var passkeys = sp.GetRequiredService<IOptions<IdentityPasskeyOptions>>().Value;
        Require(!string.IsNullOrEmpty(passkeys.ServerDomain), "passkey relying party set");
        Require(passkeys.UserVerificationRequirement == "required", "passkey user verification required");
        Require(passkeys.ValidateOrigin is not null, "passkey origin checked against Auth:Origin");
        Require(sp.GetRequiredService<IOptions<RateLimiterOptions>>().Value.RejectionStatusCode == 429, "limiter answers 429");
        Require(sp.GetRequiredService<IOptions<AuthorizationOptions>>().Value.FallbackPolicy is not null, "fallback policy");
        Require(sp.GetRequiredService<IOptions<DataProtectionTokenProviderOptions>>().Value.TokenLifespan == TimeSpan.FromMinutes(15), "15-minute reset links");
        Require(sp.GetRequiredService<IOptions<EmailConfirmationTokenProviderOptions>>().Value.TokenLifespan == TimeSpan.FromHours(24), "24-hour confirmation links");
        Require(sp.GetRequiredService<IConfiguration>()["AllowedHosts"] is { Length: > 0 } hosts && hosts != "*", "AllowedHosts names the app's host");
        Require(sp.GetService<SessionCleanup>() is not null, "daily session cleanup");
        using var scope = sp.CreateScope();
        Require(scope.ServiceProvider.GetRequiredService<IUserStore<AppUser>>() is HashedRecoveryCodeStore, "recovery codes stored as hashes");
    }

    private static void Require(bool ok, string what)
    {
        if (!ok) throw new InvalidOperationException($"Config: {what}");
    }
}

public class ConfigTests
{
    private AuthApiFactory _app = null!;
    [SetUp] public void SetUp() => _app = new AuthApiFactory();
    [TearDown] public void TearDown() => _app.Dispose();

    [Test]
    public async Task Auth_settings_protect_users()
    {
        ConfigCheck.Check(_app.Services);
        var res = await _app.Client().GetAsync("/health");
        Assert.That(res.Headers.GetValues("Content-Security-Policy").Single(), Does.Contain("frame-ancestors 'none'"));
        Assert.That(res.Headers.GetValues("Strict-Transport-Security").Single(), Does.StartWith("max-age="));
        Assert.That(res.Headers.GetValues("Permissions-Policy").Single(), Does.Contain("publickey-credentials-get=(self)"));
    }

    [Test]
    public void Turns_red_on_the_broken_fixture()
    {
        using var broken = _app.WithWebHostBuilder(b => b.ConfigureServices(s =>
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.Cookie.HttpOnly = false)));
        Assert.Throws<InvalidOperationException>(() => ConfigCheck.Check(broken.Services));
    }
}
