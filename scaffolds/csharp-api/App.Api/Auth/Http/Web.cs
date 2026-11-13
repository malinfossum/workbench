using System.Globalization;
using Microsoft.AspNetCore.Mvc;

namespace App.Api.Auth.Http;

public static class PublicEndpoints
{
    // The named public list. Everything else needs a session (the fallback policy); the HTTP test checks both ways.
    public static readonly string[] Paths =
    [
        "/health", "/auth/sign-up", "/auth/sign-in", "/auth/mfa", "/auth/recovery", "/auth/reset", "/auth/reset/confirm",
        "/auth/confirm-email", "/auth/passkey/request-options", "/auth/passkey/sign-in",
    ];
}

public static class AuthResults
{
    public static IResult Fail(string key, int status = 400) => Results.Json(new { error = key }, statusCode: status);

    public static IResult TooSoon(HttpContext http, TimeSpan wait)
    {
        http.Response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(wait.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        return Fail("auth.error.tooManyAttempts", StatusCodes.Status429TooManyRequests);
    }
}

public static class SafeRedirect
{
    private const string Same = "https://same.invalid";

    // Same-origin paths only. Decoded first, so "/%2F%2Fhost" can't pass as a path. "//host", "/\host", "https:host",
    // "https://this-host:8443/x" and control characters (an encoded CR or LF too) fall back to "/". The check runs
    // again on the normalised result, because dot segments turn "/.//host" into "//host": the value returned is the
    // value checked, never the raw input.
    public static string Path(string? url)
    {
        var path = Uri.UnescapeDataString(url ?? "");
        if (!IsLocal(path) || path.Contains('\\')) return "/";
        var parsed = new Uri(new Uri(Same), path);
        var result = parsed.PathAndQuery + parsed.Fragment;
        return parsed.GetLeftPart(UriPartial.Authority) == Same && IsLocal(result) ? result : "/";
    }

    private static bool IsLocal(string path) => path.StartsWith('/') && (path.Length == 1 || path[1] is not ('/' or '\\')) && !path.Any(char.IsControl);
}

// A form-style POST, PUT, PATCH or DELETE from another origin gets 403 before anything else runs: the same rule as
// Hono's csrf(). A cross-site form can only send these content types (or none). A cross-site JSON request needs a
// CORS preflight, which this app never answers. Browsers send Origin on every such request.
public sealed class CrossSiteGuard(RequestDelegate next, string origin)
{
    private static readonly string[] FormTypes = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain", "text/ping"];

    public Task InvokeAsync(HttpContext http)
    {
        var req = http.Request;
        var formStyle = req.ContentType is not { Length: > 0 } type || FormTypes.Any(f => type.StartsWith(f, StringComparison.OrdinalIgnoreCase));
        if (HttpMethods.IsGet(req.Method) || HttpMethods.IsHead(req.Method) || !formStyle
            || req.Headers["Sec-Fetch-Site"] == "same-origin" || req.Headers.Origin == origin)
            return next(http);
        http.Response.StatusCode = StatusCodes.Status403Forbidden;
        return http.Response.WriteAsJsonAsync(new { error = "forbidden" });
    }
}

public static class BodyLimit
{
    // On the /auth and /account groups. A WebAuthn response is a few KB; the rest of the app keeps Kestrel's 30 MB.
    public static readonly Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute Auth = new(16 * 1024);
    public const long NotesBytes = 32 * 1024; // a 4000-character body fits in any script, even fully \u-escaped
}

public static class SecurityHeaders
{
    public const string Csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    public const string ClearSiteData = "\"cache\", \"cookies\", \"storage\"";
    // WebAuthn on this origin only, and nothing the app doesn't use.
    public const string PermissionsPolicy = "publickey-credentials-get=(self), publickey-credentials-create=(self), camera=(), microphone=(), geolocation=()";

    public static void Apply(IHeaderDictionary h, bool hsts)
    {
        h.ContentSecurityPolicy = Csp;
        // Off in Development only: HSTS on localhost would pin every dev server on this machine to https (spec § 4.3).
        if (hsts)
        {
            h.StrictTransportSecurity = "max-age=31536000; includeSubDomains"; // set here, because UseHsts skips localhost and the test host
        }
        h["Permissions-Policy"] = PermissionsPolicy;
        h.XContentTypeOptions = "nosniff";
        h["Referrer-Policy"] = "strict-origin-when-cross-origin";
    }
}

public sealed class AuthExceptionHandler(ILogger<AuthLog> log, IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        (int Status, string Error, string? Field) result = exception switch
        {
            NotFoundException => (404, "not_found", null),
            ForbiddenException f => (403, "forbidden", f.Field),
            UnknownFieldException u => (400, "unknown_field", u.Field),
            InvalidFieldException i => (400, "invalid_field", i.Field),
            ReauthRequiredException => (401, "auth.error.reauthRequired", null),
            SessionLookupException => (503, "unavailable", null),
            BadHttpRequestException b => (b.StatusCode, "bad_request", null), // a malformed body, too large, or a bad header
            _ => (500, "server_error", null),
        };
        if (result.Status == 403 && log.IsEnabled(LogLevel.Information))
        {
            log.Forbidden(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), httpContext.Request.Path.Value);
        }
        httpContext.Response.StatusCode = result.Status;
        var details = new ProblemDetails { Status = result.Status };
        details.Extensions["error"] = result.Error;
        if (result.Field is not null)
        {
            details.Extensions["field"] = result.Field;
        }
        // No Exception on the context: its message never reaches the client. The answer is handled even when the
        // client's Accept header rules out JSON and nothing is written, so a 404 or 403 never falls through to a 500.
        await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = details });
        return true;
    }
}
