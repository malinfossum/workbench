namespace App.Api.Auth;

public sealed record AuthEventDto(string Kind, DateTime At);
public sealed record NoteExport(int Id, string Title, string Body, bool Archived, DateTime CreatedAt, DateTime UpdatedAt);
public sealed record MembershipExport(int NoteId, string? Title);
public sealed record AccountExport(string Email, string Name, string?[] Passkeys, List<SessionDto> Sessions, List<AuthEventDto> Events, List<NoteExport> Notes, List<MembershipExport> Memberships);

// The account page's export (authn.md, Privacy): email, name, passkey names, active sessions, 90 days of auth events, the notes the account owns and the notes it is a member of.
public sealed class AccountService(AppDbContext db, UserManager<AppUser> users, SessionService sessions, TimeProvider clock)
{
    public async Task<AccountExport> ExportAsync(string userId, string? currentKey)
    {
        var user = await users.FindByIdAsync(userId) ?? throw new NotFoundException();
        var since = clock.GetUtcNow().UtcDateTime - AuthEventLog.Retention;
        var passkeys = (await users.GetPasskeysAsync(user)).Select(p => p.Name).ToArray();
        var events = await db.AuthEvents.Where(e => e.UserId == userId && e.At > since).OrderByDescending(e => e.At)
            .Select(e => new AuthEventDto(e.Kind, e.At)).ToListAsync();
        // Both lists are read past the Tenant filter, keyed on the account alone: deleting the account removes these rows in
        // every tenant, so the export holds them in every tenant. GuardTests holds every such line in this file to that key.
        var notes = await db.Notes.IgnoreQueryFilters(["Tenant"]).Where(n => n.OwnerId == userId).OrderBy(n => n.Id)
            .Select(n => new NoteExport(n.Id, n.Title, n.Body, n.Archived, n.CreatedAt, n.UpdatedAt)).ToListAsync();
        // A membership is the account's own row, so it is listed everywhere. The title is another account's text, so it
        // shows only in the account's tenant, where the policy lets a member read the note.
        var tenantId = user.TenantId;
        var memberships = await db.Notes.IgnoreQueryFilters(["Tenant"]).Where(n => n.Members.Any(m => m.UserId == userId)).OrderBy(n => n.Id)
            .Select(n => new MembershipExport(n.Id, n.TenantId == tenantId ? n.Title : null)).ToListAsync();
        return new(user.Email!, user.UserName!, passkeys, await sessions.ListAsync(userId, currentKey), events, notes, memberships);
    }
}
