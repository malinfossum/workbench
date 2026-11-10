namespace App.Tests.Auth;

using static TestUsers;

public class MatrixTests
{
    private static readonly Note Own = new() { Title = "Note", Id = 1, OwnerId = "u1", TenantId = "t1", Members = [new NoteMember { NoteId = 1, UserId = "u2" }] };
    private static readonly Note OtherTenant = new() { Title = "Note", Id = 2, OwnerId = "u5", TenantId = "t2" };

    // Every cell is an explicit allow or deny. A new action with no rows fails the coverage check.
    private static readonly (UserContext User, string Action, Note Note, bool Expected)[] Matrix =
    [
        (Owner, NoteActions.Read, Own, true), (Member, NoteActions.Read, Own, true), (Admin, NoteActions.Read, Own, true),
        (Stranger, NoteActions.Read, Own, false), (Foreign, NoteActions.Read, Own, false), (Nobody, NoteActions.Read, Own, false),
        (Owner, NoteActions.Read, OtherTenant, false),
        (Owner, NoteActions.Create, Own, true), (Stranger, NoteActions.Create, Own, false), (Foreign, NoteActions.Create, Own, false),
        (Owner, NoteActions.Update, Own, true), (Member, NoteActions.Update, Own, true), (Admin, NoteActions.Update, Own, false), (Stranger, NoteActions.Update, Own, false),
        (Owner, NoteActions.Delete, Own, true), (Admin, NoteActions.Delete, Own, true), (Member, NoteActions.Delete, Own, false), (Foreign, NoteActions.Delete, Own, false),
        (AdminNoMfa, NoteActions.Read, Own, false), (AdminNoMfa, NoteActions.Delete, Own, false), // the second-factor gate, inside the policy too
        (Owner, NoteActions.Archive, Own, true), (Member, NoteActions.Archive, Own, false),
        (Owner, NoteActions.Share, Own, true), (Member, NoteActions.Share, Own, false),
        (Owner, "publish", Own, false), // an action with no rule is denied
    ];

    public static void CheckMatrix(Func<UserContext, string, Note, bool> can)
    {
        foreach (var action in NoteActions.All)
            if (!Matrix.Any(r => r.Action == action)) throw new InvalidOperationException($"No matrix rows for action \"{action}\"");
        foreach (var (user, action, note, expected) in Matrix)
            if (can(user, action, note) != expected) throw new InvalidOperationException($"{user.Id} {action} note {note.Id}: expected {expected}");
    }

    [Test] public void Matches_every_cell() { CheckMatrix(NotePolicy.Can); Assert.Pass(); }
    [Test] public void Turns_red_on_the_broken_fixture() => Assert.Throws<InvalidOperationException>(() => CheckMatrix((_, _, _) => true));
}
