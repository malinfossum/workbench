namespace App.Api.Auth;

public sealed class CurrentUser : ICurrentUser { public UserContext? Value { get; set; } }

public sealed class CurrentTenant(CurrentUser user) : ITenantProvider
{
    public string TenantId => user.Value?.TenantId ?? "";
}

public sealed class UserContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, UserManager<AppUser> users, CurrentUser current)
    {
        if (http.User.Identity?.IsAuthenticated == true)
        {
            AppUser? user;
            try { user = await users.GetUserAsync(http.User); }
            catch (Exception ex) when (ex is not OperationCanceledException) { throw new SessionLookupException(ex); } // 503, like the session row
            if (user is null) { http.Response.StatusCode = StatusCodes.Status401Unauthorized; return; }
            var secondFactor = CurrentSession.Of(http)?.SecondFactorUsed == true;
            current.Value = new UserContext(user.Id, user.TenantId, user.Role, user.EmailConfirmed, user.TwoFactorEnabled, secondFactor);
        }
        await next(http);
    }
}

// A session that used no second factor. Once the account has TOTP or a passkey, any role needs a session that used it
// to add or remove a factor or get new recovery codes. So a stolen password can't enrol the thief's own factor, remove
// the owner's to make room for one, or mint codes that stand in for one in a reset. Above a plain member such a session
// reaches sign-out, and the setup paths only while the account has no second factor yet. Paths are matched by route,
// so case and a trailing slash change nothing. Endpoints open to anyone (health, the /auth group) are never gated:
// they give a session nothing a stranger lacks, and the passkey sign-in that lifts the gate is one of them.
public sealed class SecondFactorGate(RequestDelegate next)
{
    public const string SignOut = "/auth/sign-out", NewCodes = "/account/mfa/codes", RemovePasskey = "/account/passkey/{credentialId}", DisableMfa = "/account/mfa/disable";
    public static readonly string[] SetupPaths = ["/account/mfa/enrol", "/account/passkey/creation-options", "/account/passkey"];

    public async Task InvokeAsync(HttpContext http, CurrentUser current, UserManager<AppUser> users)
    {
        var endpoint = http.GetEndpoint();
        if (current.Value is { SecondFactorUsed: false } u && endpoint?.Metadata.GetMetadata<IAllowAnonymous>() is null
            && (endpoint as RouteEndpoint)?.RoutePattern.RawText is var route && route != SignOut)
        {
            var changesFactor = route is NewCodes or RemovePasskey or DisableMfa || SetupPaths.Contains(route);
            var refused = MfaPolicy.NeedsSecondFactor(u)
                ? !SetupPaths.Contains(route) || await HasSecondFactorAsync(users, u)
                : changesFactor && await HasSecondFactorAsync(users, u);
            if (refused)
            {
                http.Response.StatusCode = StatusCodes.Status403Forbidden;
                await http.Response.WriteAsJsonAsync(new { error = "second_factor_required" });
                return;
            }
        }
        await next(http);
    }

    // A passkey doesn't turn TwoFactorEnabled on, so both count. The user row is already tracked from UserContextMiddleware.
    private static async Task<bool> HasSecondFactorAsync(UserManager<AppUser> users, UserContext u) =>
        u.TwoFactorEnabled || (await users.FindByIdAsync(u.Id) is { } user && (await users.GetPasskeysAsync(user)).Count > 0);
}

// Per account, on top of the per-IP limit (authn.md, Recovery and email). Counts failures only: the first
// five cost nothing, then each attempt must wait a gap that doubles from 1 second up to 60. A success
// resets it. Never a lockout: a stranger can slow an account, not close it. Passkey sign-in never asks.
// In memory, so one instance only; a multi-instance deploy moves it to the database.
public sealed class SignInThrottle(TimeProvider clock)
{
    public const int FreeFailures = 5;
    public static readonly TimeSpan MaxGap = TimeSpan.FromSeconds(60);
    private readonly Dictionary<string, (int Failures, DateTimeOffset Last)> _state = [];
    private readonly Lock _gate = new();

    public static TimeSpan GapAfter(int failures) =>
        failures < FreeFailures ? TimeSpan.Zero : TimeSpan.FromSeconds(Math.Min(Math.Pow(2, failures - FreeFailures), MaxGap.TotalSeconds));

    // One step, under a lock: either the time the caller must still wait, or Zero and the attempt is reserved.
    // A reserved attempt counts as a failure until Succeeded resets the key, so a parallel burst can't all
    // pass the check before the first failure lands. A refused attempt reserves nothing. The caller passes
    // a normalised key (UserManager.NormalizeEmail, or a user id).
    public TimeSpan Begin(string key)
    {
        var now = clock.GetUtcNow();
        lock (_gate)
        {
            if (_state.TryGetValue(key, out var s) && s.Last + GapAfter(s.Failures) - now is var left && left > TimeSpan.Zero) return left;
            _state[key] = (s.Failures + 1, now);
            if (_state.Count > 10_000) // a flood of made-up emails: forget the ones quiet for 15 minutes
                foreach (var (k, old) in _state.ToList()) if (now - old.Last > TimeSpan.FromMinutes(15)) _state.Remove(k);
            return TimeSpan.Zero;
        }
    }

    public void Succeeded(string key)
    {
        lock (_gate) _state.Remove(key);
    }
}

public interface IAuthEmail
{
    public Task SendAsync(string recipient, string kind, string link);
}

// Swap for the project's email provider. It is a processor: name it, its DPA and its region in the adoption spec.
public sealed class LogOnlyAuthEmail(ILogger<LogOnlyAuthEmail> log) : IAuthEmail
{
    public Task SendAsync(string recipient, string kind, string link)
    {
        log.EmailQueued(kind); // never the address, never the link
        return Task.CompletedTask;
    }
}

// Sends auth mail without making the request wait (a slow provider would tell a known email from an unknown
// one), and at most three per address per hour, skipped silently, so nobody can bomb an inbox through the app.
public sealed class AuthMailer(IAuthEmail email, ILogger<AuthMailer> log) : IDisposable
{
    private readonly PartitionedRateLimiter<string> _perRecipient = PartitionedRateLimiter.Create<string, string>(key =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions { PermitLimit = 3, Window = TimeSpan.FromHours(1), QueueLimit = 0 }));

    public void Send(string to, string kind, string link)
    {
        using var lease = _perRecipient.AttemptAcquire("mail:" + to.Trim().ToUpperInvariant());
        if (!lease.IsAcquired) return;
        _ = SendQuietly(to, kind, link);
    }

    private async Task SendQuietly(string to, string kind, string link)
    {
        try { await email.SendAsync(to, kind, link); }
        catch (Exception ex) { log.EmailFailed(kind, ex.GetType().Name); }
    }

    public void Dispose() => _perRecipient.Dispose();
}

// Links carry the token in the fragment: it never reaches a server log or a Referer header.
public sealed class AuthLinks(string origin)
{
    private static string Encode(string token) => Base64Url.EncodeToString(Encoding.UTF8.GetBytes(token));

    public string Reset(string userId, string token) => $"{origin}/reset#uid={Uri.EscapeDataString(userId)}&token={Encode(token)}";
    public string Confirm(string userId, string token) => $"{origin}/confirm-email#uid={Uri.EscapeDataString(userId)}&token={Encode(token)}";

    // The other half: null for anything that isn't valid Base64Url, which the endpoints answer as an expired link.
    public static string? Decode(string token)
    {
        try { return Encoding.UTF8.GetString(Base64Url.DecodeFromChars(token)); }
        catch (FormatException) { return null; }
    }
}

public sealed class AuthLog; // the logger category for auth events

// Every auth log line, written once. The source generator builds them, so a line costs nothing while its level is off.
public static partial class AuthLogMessages
{
    [LoggerMessage(Level = LogLevel.Information, Message = "auth.email.queued kind={Kind}")]
    public static partial void EmailQueued(this ILogger log, string kind); // never the address, never the link

    [LoggerMessage(Level = LogLevel.Error, Message = "auth.email.failed kind={Kind} error={Error}")]
    public static partial void EmailFailed(this ILogger log, string kind, string error);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.signin.success user={UserId}")]
    public static partial void SignInSuccess(this ILogger log, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.signin.failure user={UserId}")]
    public static partial void SignInFailure(this ILogger log, string? userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.passkey.added user={UserId}")]
    public static partial void PasskeyAdded(this ILogger log, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.passkey.removed user={UserId}")]
    public static partial void PasskeyRemoved(this ILogger log, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.password.changed user={UserId}")]
    public static partial void PasswordChanged(this ILogger log, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.account.deleted user={UserId}")]
    public static partial void AccountDeleted(this ILogger log, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.forbidden user={UserId} path={Path}")]
    public static partial void Forbidden(this ILogger log, string? userId, string? path);

    [LoggerMessage(Level = LogLevel.Warning, Message = "auth.breached_check.unavailable error={Error}")]
    public static partial void BreachedCheckUnavailable(this ILogger log, string error);

    [LoggerMessage(Level = LogLevel.Error, Message = "auth.session.revokeFailed error={Error}")]
    public static partial void SessionRevokeFailed(this ILogger log, string error); // never the key or an id

    [LoggerMessage(Level = LogLevel.Information, Message = "auth.cleanup sessions={Sessions} events={Events}")]
    public static partial void Cleanup(this ILogger log, int sessions, int events);

    [LoggerMessage(Level = LogLevel.Error, Message = "auth.cleanup.failed error={Error}")]
    public static partial void CleanupFailed(this ILogger log, string error);
}
