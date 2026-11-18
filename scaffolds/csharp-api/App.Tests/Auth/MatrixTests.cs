namespace App.Tests.Auth;

using static TestUsers;

public class MatrixTests
{
    private static readonly Note Own = new() { Title = "Note", Id = 1, OwnerId = "u1", TenantId = "t1", Members = [new NoteMember { NoteId = 1, UserId = "u2" }] };
    private static readonly Note OtherTenant = new() { Title = "Note", Id = 2, OwnerId = "u5", TenantId = "t2" };

    // Every cell is an explicit allow or deny: each user in TestUsers.All against each action on Own. A new action or a
    // new user with a missing cell fails the coverage check.
    private static readonly (UserContext User, string Action, Note Note, bool Expected)[] Matrix =
    [
        (Owner, NoteActions.Read, Own, true), (Member, NoteActions.Read, Own, true), (Admin, NoteActions.Read, Own, true),
        (Stranger, NoteActions.Read, Own, false), (Foreign, NoteActions.Read, Own, false), (Nobody, NoteActions.Read, Own, false),
        (Owner, NoteActions.Read, OtherTenant, false),
        (Owner, NoteActions.Create, Own, true), (Member, NoteActions.Create, Own, false), (Stranger, NoteActions.Create, Own, false),
        (Admin, NoteActions.Create, Own, false), (Foreign, NoteActions.Create, Own, false), (Nobody, NoteActions.Create, Own, false),
        (Owner, NoteActions.Update, Own, true), (Member, NoteActions.Update, Own, true), (Admin, NoteActions.Update, Own, false),
        (Stranger, NoteActions.Update, Own, false), (Foreign, NoteActions.Update, Own, false), (Nobody, NoteActions.Update, Own, false),
        (Owner, NoteActions.Delete, Own, true), (Admin, NoteActions.Delete, Own, true), (Member, NoteActions.Delete, Own, false),
        (Stranger, NoteActions.Delete, Own, false), (Foreign, NoteActions.Delete, Own, false), (Nobody, NoteActions.Delete, Own, false),
        (Owner, NoteActions.Archive, Own, true), (Member, NoteActions.Archive, Own, false), (Stranger, NoteActions.Archive, Own, false),
        (Admin, NoteActions.Archive, Own, false), (Foreign, NoteActions.Archive, Own, false), (Nobody, NoteActions.Archive, Own, false),
        (Owner, NoteActions.Share, Own, true), (Member, NoteActions.Share, Own, false), (Stranger, NoteActions.Share, Own, false),
        (Admin, NoteActions.Share, Own, false), (Foreign, NoteActions.Share, Own, false), (Nobody, NoteActions.Share, Own, false),
        // The second-factor gate, inside the policy too: an admin session without one is denied everything.
        (AdminNoMfa, NoteActions.Read, Own, false), (AdminNoMfa, NoteActions.Create, Own, false), (AdminNoMfa, NoteActions.Update, Own, false),
        (AdminNoMfa, NoteActions.Delete, Own, false), (AdminNoMfa, NoteActions.Archive, Own, false), (AdminNoMfa, NoteActions.Share, Own, false),
        (Owner, "publish", Own, false), // an action with no rule is denied
    ];

    // Reports every missing cell and every wrong answer at once, so one run shows the whole gap.
    public static void CheckMatrix(Func<UserContext, string, Note, bool> can) => Check(Matrix, can);

    private static void Check((UserContext User, string Action, Note Note, bool Expected)[] matrix, Func<UserContext, string, Note, bool> can)
    {
        var missing = from action in NoteActions.All
                      from user in All
                      where !matrix.Any(r => r.User == user && r.Action == action && r.Note == Own)
                      select $"no matrix cell for {user.Id} (second factor used: {user.SecondFactorUsed}) {action}";
        var wrong = from r in matrix
                    where can(r.User, r.Action, r.Note) != r.Expected
                    select $"{r.User.Id} {r.Action} note {r.Note.Id}: expected {r.Expected}";
        var problems = missing.Concat(wrong).ToList();
        if (problems.Count > 0) throw new InvalidOperationException(string.Join("; ", problems));
    }

    [Test] public void Matches_every_cell() { CheckMatrix(NotePolicy.Can); Assert.Pass(); }

    [Test]
    public void Turns_red_on_the_broken_fixture()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => CheckMatrix((_, _, _) => true));
        Assert.That(ex!.Message.Split("; "), Has.Length.EqualTo(Matrix.Count(r => !r.Expected))); // every wrong cell, in one run
    }

    [Test]
    public void Turns_red_on_a_missing_cell()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => Check(Matrix[1..], NotePolicy.Can)); // the first row is the owner's read
        Assert.That(ex!.Message, Is.EqualTo("no matrix cell for u1 (second factor used: False) read"));
    }
}
