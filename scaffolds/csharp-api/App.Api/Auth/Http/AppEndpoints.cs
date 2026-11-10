namespace App.Api.Auth.Http;

public static class AppEndpoints
{
    public const int MaxPasskeys = 10, MaxPasskeyName = 64;

    private static string UserId(HttpContext http) => http.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private static async Task<AppUser> Me(HttpContext http, UserManager<AppUser> users) => await users.GetUserAsync(http.User) ?? throw new NotFoundException();

    private static async Task<IResult> CreationOptions(HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        var entity = new PasskeyUserEntity { Id = user.Id, Name = user.UserName!, DisplayName = user.UserName! };
        return Results.Content(await signIn.MakePasskeyCreationOptionsAsync(entity), "application/json");
    }

    private static async Task<IResult> AddPasskey(PasskeyRequest req, HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events, ILogger<AuthLog> log)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        if (req.Name is { Length: > MaxPasskeyName }) throw new InvalidFieldException("name");
        if ((await users.GetPasskeysAsync(user)).Count >= MaxPasskeys) throw new InvalidFieldException("credential"); // a cap, not a flow anyone meets
        var attestation = await signIn.PerformPasskeyAttestationAsync(req.Credential);
        if (!attestation.Succeeded) return AuthResults.Fail("auth.error.passkeyUnknown");
        attestation.Passkey.Name = req.Name; // may be null: the account page shows "Passkey" and the date
        if (!(await users.AddOrUpdatePasskeyAsync(user, attestation.Passkey)).Succeeded) return AuthResults.Fail("auth.error.passkeyUnknown"); // no codes, no event
        var codes = await RecoveryCodes.IssueFirstAsync(users, user);
        await ChangedAsync(http, user, signIn, sessions, events, "passkey-added");
        log.PasskeyAdded(user.Id);
        return codes is null ? Results.NoContent() : Results.Ok(new { recoveryCodes = codes }); // shown once, with the first factor
    }

    private static async Task<IResult> RemovePasskey(string credentialId, HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events, ILogger<AuthLog> log)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        byte[] id;
        try { id = Base64Url.DecodeFromChars(credentialId); }
        catch (FormatException) { return AuthResults.Fail("auth.error.passkeyUnknown"); }
        // Not this account's passkey: nothing changes, so no event and no sign-out elsewhere.
        if (await users.GetPasskeyAsync(user, id) is null) return AuthResults.Fail("auth.error.passkeyUnknown");
        if ((await users.GetPasskeysAsync(user)).Count == 1 && !await users.HasPasswordAsync(user))
            return AuthResults.Fail("auth.error.lastSignInMethod");
        if (!(await users.RemovePasskeyAsync(user, id)).Succeeded) return AuthResults.Fail("auth.error.passkeyUnknown");
        await ChangedAsync(http, user, signIn, sessions, events, "passkey-removed");
        log.PasskeyRemoved(user.Id);
        return Results.NoContent();
    }

    // The account page's list: each passkey's name and date, and the id its remove button sends.
    private static async Task<IResult> ListPasskeys(HttpContext http, UserManager<AppUser> users) =>
        Results.Ok((await users.GetPasskeysAsync(await Me(http, users))).OrderBy(p => p.CreatedAt)
            .Select(p => new { id = Base64Url.EncodeToString(p.CredentialId), name = p.Name, createdAt = p.CreatedAt }));

    // Any password, MFA or passkey change: every other session ends now, and this one gets a fresh ticket under
    // the same key (the security stamp moved). RefreshSignInAsync renews; it never calls StoreAsync.
    private static async Task ChangedAsync(HttpContext http, AppUser user, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events, string kind)
    {
        await sessions.RevokeOthersAsync(user.Id, CurrentSession.Of(http)!.Key);
        await signIn.RefreshSignInAsync(user);
        await events.RecordAsync(user.Id, kind);
    }

    private static async Task<IResult> ChangePassword(ChangePasswordRequest req, HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events, ILogger<AuthLog> log)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        var changed = await users.ChangePasswordAsync(user, req.Current, req.New);
        if (!changed.Succeeded)
            return AuthResults.Fail(changed.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.PasswordMismatch)) ? "auth.error.currentPasswordWrong" : "auth.error.passwordRejected");
        await ChangedAsync(http, user, signIn, sessions, events, "password-changed");
        log.PasswordChanged(user.Id);
        return Results.NoContent();
    }

    // Two calls: without a code it returns a fresh key for the authenticator app; with a code it turns TOTP on.
    private static async Task<IResult> EnrolMfa(MfaEnrolRequest req, HttpContext http, UserManager<AppUser> users, IUserStore<AppUser> store, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        if (user.TwoFactorEnabled) return AuthResults.Fail("auth.error.wrongCode"); // disable first; a second key would orphan the first
        if (string.IsNullOrWhiteSpace(req.Code))
        {
            // Not ResetAuthenticatorKeyAsync: it also moves the security stamp, so an enrolment nobody finishes would sign
            // every session out at the next stamp check. TOTP is still off here, so there is nothing to revoke.
            await ((IUserAuthenticatorKeyStore<AppUser>)store).SetAuthenticatorKeyAsync(user, users.GenerateNewAuthenticatorKey(), http.RequestAborted);
            if (!(await users.UpdateAsync(user)).Succeeded) return AuthResults.Fail("auth.error.unavailable", StatusCodes.Status503ServiceUnavailable); // never a key that wasn't saved
            var key = await users.GetAuthenticatorKeyAsync(user);
            var label = Uri.EscapeDataString("Example:" + user.Email);
            return Results.Ok(new { key, uri = $"otpauth://totp/{label}?secret={key}&issuer=Example&digits=6" });
        }
        if (!await users.VerifyTwoFactorTokenAsync(user, users.Options.Tokens.AuthenticatorTokenProvider, req.Code)) return AuthResults.Fail("auth.error.wrongCode");
        await users.SetTwoFactorEnabledAsync(user, true);
        var codes = await RecoveryCodes.IssueFirstAsync(users, user);
        await ChangedAsync(http, user, signIn, sessions, events, "mfa-enabled");
        return Results.Ok(new { recoveryCodes = codes });
    }

    private static async Task<IResult> DisableMfa(HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        await users.SetTwoFactorEnabledAsync(user, false);
        await users.ResetAuthenticatorKeyAsync(user); // the old key is useless from here on
        await ChangedAsync(http, user, signIn, sessions, events, "mfa-disabled");
        return Results.NoContent();
    }

    private static async Task<IResult> NewRecoveryCodes(HttpContext http, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, AuthEventLog events)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        // A code stands in for a factor, so an account without one gets none. Its first factor brings fresh ones.
        if (!user.TwoFactorEnabled && (await users.GetPasskeysAsync(user)).Count == 0) return AuthResults.Fail("auth.error.secondFactorRequired");
        var codes = (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10))!.ToArray();
        await ChangedAsync(http, user, signIn, sessions, events, "recovery-codes-renewed");
        return Results.Ok(new { recoveryCodes = codes });
    }

    public static void Map(WebApplication app)
    {
        var account = app.MapGroup("/account").WithMetadata(BodyLimit.Auth);
        account.MapPost("/password", ChangePassword).RequireRateLimiting("auth"); // no StartsSession: it keeps this session
        account.MapPost("/passkey/creation-options", CreationOptions);
        account.MapPost("/passkey", AddPasskey);
        account.MapDelete("/passkey/{credentialId}", RemovePasskey);
        account.MapGet("/passkeys", ListPasskeys);
        account.MapPost("/mfa/enrol", EnrolMfa).RequireRateLimiting("auth");
        account.MapPost("/mfa/disable", DisableMfa);
        account.MapPost("/mfa/codes", NewRecoveryCodes);
        account.MapGet("/sessions", (HttpContext http, SessionService s) => s.ListAsync(UserId(http), CurrentSession.Of(http)?.Key));
        account.MapDelete("/sessions/{id:int}", async (int id, HttpContext http, SessionService s) => { await s.RevokeAsync(UserId(http), id); return Results.NoContent(); });
        account.MapGet("/export", async (HttpContext http, AccountService a) => Results.Json(await a.ExportAsync(UserId(http), CurrentSession.Of(http)?.Key)));
        account.MapDelete("", DeleteAccount);
        app.MapPost("/auth/sign-out", SignOut);
    }

    private static async Task<IResult> SignOut(HttpContext http, SignInManager<AppUser> signIn)
    {
        await signIn.SignOutAsync(); // the session store removes the row
        http.Response.Headers["Clear-Site-Data"] = SecurityHeaders.ClearSiteData;
        return Results.NoContent();
    }

    private static async Task<IResult> DeleteAccount(HttpContext http, UserManager<AppUser> users, SessionService sessions, ILogger<AuthLog> log)
    {
        FreshSession.Require(http);
        var user = await Me(http, users);
        await sessions.RevokeAllAsync(user.Id);
        await users.DeleteAsync(user); // cascades passkeys, logins, claims and tokens (recovery codes live in tokens); auth events stay their 90 days
        log.AccountDeleted(user.Id);
        http.Response.Headers["Clear-Site-Data"] = SecurityHeaders.ClearSiteData;
        return Results.NoContent();
    }
}
