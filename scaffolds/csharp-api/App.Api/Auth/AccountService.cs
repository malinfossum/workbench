namespace App.Api.Auth;

public sealed record AuthEventDto(string Kind, DateTime At);
public sealed record AccountExport(string Email, string Name, string?[] Passkeys, List<SessionDto> Sessions, List<AuthEventDto> Events);

// The account page's export (authn.md, Privacy): email, name, passkey names, active sessions, 90 days of auth events.
public sealed class AccountService(AppDbContext db, UserManager<AppUser> users, SessionService sessions, TimeProvider clock)
{
    public async Task<AccountExport> ExportAsync(string userId, string? currentKey)
    {
        var user = await users.FindByIdAsync(userId) ?? throw new NotFoundException();
        var since = clock.GetUtcNow().UtcDateTime - AuthEventLog.Retention;
        var passkeys = (await users.GetPasskeysAsync(user)).Select(p => p.Name).ToArray();
        var events = await db.AuthEvents.Where(e => e.UserId == userId && e.At > since).OrderByDescending(e => e.At)
            .Select(e => new AuthEventDto(e.Kind, e.At)).ToListAsync();
        return new(user.Email!, user.UserName!, passkeys, await sessions.ListAsync(userId, currentKey), events);
    }
}
