namespace App.Api.Auth.Http;

public sealed record SignInRequest(string Email, string Password);
public sealed record EmailRequest(string Email);
public sealed record CodeRequest(string Code);
public sealed record LinkRequest(string UserId, string Token);
public sealed record ResetConfirmRequest(string UserId, string Token, string NewPassword, string? Code);
public sealed record PasskeyRequest(string Credential, string? Name);
public sealed record ChangePasswordRequest(string Current, string New);
public sealed record MfaEnrolRequest(string? Code);

public static class AuthEndpoints
{
    private static IResult Fail(string key, int status = 400) => AuthResults.Fail(key, status);

    private static async Task<IResult> PasskeySignIn(PasskeyRequest req, SignInManager<AppUser> signIn)
    {
        try
        {
            return (await signIn.PasskeySignInAsync(req.Credential)).Succeeded ? Results.NoContent() : Fail("auth.error.passkeyUnknown");
        }
        catch (InvalidOperationException) // no request options in this browser's state: a replay, or a stale tab
        {
            return Fail("auth.error.passkeyUnknown");
        }
    }
    private static async Task<IResult> SignUp(SignInRequest req, UserManager<AppUser> users, AuthMailer mail, AuthLinks links)
    {
        // The password is checked first, so a known and an unknown email get the same answer.
        foreach (var v in users.PasswordValidators)
            if (!(await v.ValidateAsync(users, new AppUser(), req.Password)).Succeeded) return Fail("auth.error.passwordRejected");
        // Both branches hash the password once, and the validators ran once above, so the answer time doesn't name a
        // known email. What is left is one database write.
        var existing = await users.FindByEmailAsync(req.Email);
        if (existing is not null)
        {
            users.PasswordHasher.HashPassword(existing, req.Password);
            mail.Send(existing.Email!, "account-exists", "");
            return Results.Accepted(value: new { message = "auth.notice.checkInbox" });
        }
        var user = new AppUser { UserName = req.Email, Email = req.Email, TenantId = Guid.NewGuid().ToString() };
        user.PasswordHash = users.PasswordHasher.HashPassword(user, req.Password); // validated above; CreateAsync(user, password) would run the validators again
        if ((await users.CreateAsync(user)).Succeeded)
            mail.Send(user.Email!, "confirm", links.Confirm(user.Id, await users.GenerateEmailConfirmationTokenAsync(user)));
        return Results.Accepted(value: new { message = "auth.notice.checkInbox" });
    }

    private static async Task<IResult> ConfirmEmail(LinkRequest req, UserManager<AppUser> users)
    {
        var user = await users.FindByIdAsync(req.UserId);
        var token = AuthLinks.Decode(req.Token);
        if (user is null || token is null || !(await users.ConfirmEmailAsync(user, token)).Succeeded) return Fail("auth.error.expiredLink");
        return Results.NoContent();
    }

    private static async Task<IResult> SignIn(SignInRequest req, string? returnUrl, HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn,
        SignInThrottle throttle, AuthEventLog events, ILogger<AuthLog> log)
    {
        var key = "sign-in:" + users.NormalizeEmail(req.Email); // Identity's normaliser: NFC and NFD spellings share one bucket
        if (throttle.Begin(key) is var wait && wait > TimeSpan.Zero) return AuthResults.TooSoon(http, wait);
        var user = await users.FindByEmailAsync(req.Email);
        // Identity answers NotAllowed for an unconfirmed email before it looks at the password, which would tell
        // anyone the address is registered. So the password is checked first, here.
        if (user is { EmailConfirmed: false } && await users.CheckPasswordAsync(user, req.Password))
        {
            throttle.Succeeded(key);
            return Fail("auth.error.emailUnverified");
        }
        if (user is null) DummyHash.Check(users, req.Password); // an unknown email costs one hash too, like a known one
        var result = user is null or { EmailConfirmed: false }
            ? Microsoft.AspNetCore.Identity.SignInResult.Failed
            : await signIn.PasswordSignInAsync(user, req.Password, isPersistent: false, lockoutOnFailure: false);
        if (result.RequiresTwoFactor)
        {
            throttle.Succeeded(key); // the password was right; the second step has its own key
            return Results.Ok(new { next = "mfa" });
        }
        if (!result.Succeeded) // the attempt Begin reserved stays a failure
        {
            log.SignInFailure(user?.Id);
            if (user is not null) await events.RecordAsync(user.Id, "sign-in-failed");
            return Fail("auth.error.signInFailed");
        }
        throttle.Succeeded(key);
        log.SignInSuccess(user!.Id);
        return Results.LocalRedirect(SafeRedirect.Path(returnUrl));
    }

    // Lockout is off, and recovery-code sign-in never counts failures anyway, so the throttle covers both steps.
    private static async Task<IResult> SecondStep(HttpContext http, SignInManager<AppUser> signIn, SignInThrottle throttle, AuthEventLog events, string wrongKey,
        Func<Task<Microsoft.AspNetCore.Identity.SignInResult>> attempt)
    {
        var pending = await signIn.GetTwoFactorAuthenticationUserAsync();
        if (pending is null) return Fail("auth.error.sessionExpired");
        var key = "mfa:" + pending.Id;
        if (throttle.Begin(key) is var wait && wait > TimeSpan.Zero) return AuthResults.TooSoon(http, wait);
        if ((await attempt()).Succeeded) { throttle.Succeeded(key); return Results.NoContent(); }
        await events.RecordAsync(pending.Id, "second-step-failed");
        return Fail(wrongKey);
    }

    private static async Task<IResult> Reset(EmailRequest req, UserManager<AppUser> users, AuthMailer mail, AuthLinks links)
    {
        var user = await users.FindByEmailAsync(req.Email);
        if (user is not null) mail.Send(user.Email!, "reset", links.Reset(user.Id, await users.GeneratePasswordResetTokenAsync(user)));
        return Results.Accepted(value: new { message = "auth.notice.resetSent" });
    }

    private static async Task<IResult> ResetConfirm(ResetConfirmRequest req, HttpContext http, UserManager<AppUser> users, SessionService sessions, SignInThrottle throttle, AuthEventLog events)
    {
        // The link first. An unknown user or a bad token is an expired link, before any factor is looked at,
        // so a guessed token can't be used to test or spend recovery codes.
        var user = await users.FindByIdAsync(req.UserId);
        var token = AuthLinks.Decode(req.Token);
        if (user is null || token is null
            || !await users.VerifyUserTokenAsync(user, users.Options.Tokens.PasswordResetTokenProvider, UserManager<AppUser>.ResetPasswordTokenPurpose, token))
            return Fail("auth.error.expiredLink");
        // The new password next, so a password the validators refuse never spends a recovery code.
        foreach (var v in users.PasswordValidators)
            if (!(await v.ValidateAsync(users, user, req.NewPassword)).Succeeded) return Fail("auth.error.passwordRejected");
        // A reset never skips a factor the account has. A password-only account resets with the link alone.
        // The throttle guards the code guess only, so a refused password or a missing code costs no attempt.
        if (user.TwoFactorEnabled || (await users.GetPasskeysAsync(user)).Count > 0)
        {
            if (string.IsNullOrWhiteSpace(req.Code)) return Fail("auth.error.secondFactorNeeded");
            var key = "reset:" + user.Id;
            if (throttle.Begin(key) is var wait && wait > TimeSpan.Zero) return AuthResults.TooSoon(http, wait);
            if (!await SecondFactorOk(users, user, req.Code)) return Fail("auth.error.wrongCode"); // the reserved attempt stays a failure
            throttle.Succeeded(key);
        }
        if (!(await users.ResetPasswordAsync(user, token, req.NewPassword)).Succeeded) return Fail("auth.error.passwordRejected");
        await sessions.RevokeAllAsync(user.Id);
        await events.RecordAsync(user.Id, "password-reset");
        return Results.NoContent();
    }

    // A TOTP code counts only while TOTP is on: a key from an enrolment nobody finished is no factor.
    private static async Task<bool> SecondFactorOk(UserManager<AppUser> users, AppUser user, string? code) =>
        !string.IsNullOrWhiteSpace(code)
        && ((user.TwoFactorEnabled && await users.VerifyTwoFactorTokenAsync(user, users.Options.Tokens.AuthenticatorTokenProvider, code))
            || (await users.RedeemTwoFactorRecoveryCodeAsync(user, code)).Succeeded);

    public static void Map(WebApplication app)
    {
        app.MapGet("/health", () => Results.Ok()).AllowAnonymous();
        var auth = app.MapGroup("/auth").AllowAnonymous().RequireRateLimiting("auth").WithMetadata(BodyLimit.Auth);
        auth.MapPost("/sign-up", SignUp);
        auth.MapPost("/confirm-email", ConfirmEmail);
        auth.MapPost("/sign-in", SignIn).WithMetadata(new StartsSession("password"));
        auth.MapPost("/mfa", (CodeRequest r, HttpContext h, SignInManager<AppUser> s, SignInThrottle t, AuthEventLog e) =>
            SecondStep(h, s, t, e, "auth.error.wrongCode", () => s.TwoFactorAuthenticatorSignInAsync(r.Code, false, false))).WithMetadata(new StartsSession("second-factor"));
        auth.MapPost("/recovery", (CodeRequest r, HttpContext h, SignInManager<AppUser> s, SignInThrottle t, AuthEventLog e) =>
            SecondStep(h, s, t, e, "auth.error.recoveryCodeWrong", () => s.TwoFactorRecoveryCodeSignInAsync(r.Code))).WithMetadata(new StartsSession("second-factor"));
        auth.MapPost("/reset", Reset);
        auth.MapPost("/reset/confirm", ResetConfirm);
        // Conditional UI only before the password step: the passkey state shares Identity's two-factor cookie.
        auth.MapPost("/passkey/request-options", async (SignInManager<AppUser> s) => Results.Content(await s.MakePasskeyRequestOptionsAsync(null), "application/json"));
        auth.MapPost("/passkey/sign-in", PasskeySignIn).WithMetadata(new StartsSession("passkey")); // never asks the account throttle
    }
}
