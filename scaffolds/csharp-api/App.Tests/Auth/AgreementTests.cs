namespace App.Tests.Auth;

public class AgreementTests
{
    private SqliteConnection _conn = null!;

    [SetUp]
    public void SetUp()
    {
        _conn = new SqliteConnection("Data Source=:memory:");
        _conn.Open();
        using var db = Db("t1");
        db.Database.EnsureCreated();
        // Owner and member ids are foreign keys to AspNetUsers: one user per distinct id, the empty id included.
        db.Users.AddRange(TestUsers.All.DistinctBy(u => u.Id).Select(u => new AppUser { Id = u.Id, UserName = u.Id, TenantId = u.TenantId, Role = u.Role }));
        db.SaveChanges();
        db.Notes.AddRange(
            new Note { Title = "Note", OwnerId = "u1", TenantId = "t1", Members = [new NoteMember { UserId = "u2" }] },
            new Note { Title = "Note", OwnerId = "u2", TenantId = "t1" },
            new Note { Title = "Note", OwnerId = "u5", TenantId = "t2", Members = [new NoteMember { UserId = "u1" }] },
            new Note { Title = "Note", OwnerId = "u1", TenantId = "t1", Archived = true },
            new Note { Title = "Note", OwnerId = "", TenantId = "t1" }, // unowned rows: an empty user id must never reach them
            new Note { Title = "Note", OwnerId = "", TenantId = "" });
        db.SaveChanges();
    }

    [TearDown] public void TearDown() => _conn.Dispose();

    private AppDbContext Db(string tenant) => TestDb.Context(_conn, tenant);

    public static void CheckNobodySeesNothing(AppDbContext db, IEnumerable<Expression<Func<UserContext, Note, bool>>> rules,
        Func<Expression<Func<UserContext, Note, bool>>, UserContext, Expression<Func<Note, bool>>> bind)
    {
        foreach (var rule in rules)
            if (db.Notes.IgnoreQueryFilters(["Tenant"]).Count(bind(rule, TestUsers.Nobody)) is var n and > 0)
                throw new InvalidOperationException($"a rule bound to an empty user matched {n} rows: {rule}");
    }

    // The broken fixture: the same swap as PolicyBinder.Bind, without its guard.
    private static Expression<Func<Note, bool>> BindUnguarded(Expression<Func<UserContext, Note, bool>> rule, UserContext user) =>
        Expression.Lambda<Func<Note, bool>>(new Swap(rule.Parameters[0], Expression.Constant(user)).Visit(rule.Body), rule.Parameters[1]);

    private sealed class Swap(ParameterExpression from, Expression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }

    public static void CheckAgreement(AppDbContext db, Expression<Func<UserContext, Note, bool>> rule, Func<UserContext, Note, bool> oneByOne, UserContext user)
    {
        var all = db.Notes.IgnoreQueryFilters(["Tenant"]).Include(b => b.Members).AsNoTracking().ToList();
        var byEach = all.Where(b => oneByOne(user, b)).Select(b => b.Id).OrderBy(id => id).ToList();
        var byQuery = db.Notes.IgnoreQueryFilters(["Tenant"]).Where(PolicyBinder.Bind(rule, user)).Select(b => b.Id).OrderBy(id => id).ToList();
        if (!byEach.SequenceEqual(byQuery))
            throw new InvalidOperationException($"{user.Id}: single [{string.Join(",", byEach)}] vs query [{string.Join(",", byQuery)}]");
    }

    [Test]
    public void Every_rule_agrees_for_every_user()
    {
        using var db = Db("t1");
        foreach (var (action, rule) in NotePolicy.Rules)
            foreach (var user in TestUsers.All)
                CheckAgreement(db, rule, (u, b) => NotePolicy.Can(u, action, b), user);
        Assert.Pass();
    }

    [Test]
    public void An_empty_tenant_sees_no_rows()
    {
        using var db = Db("");
        Assert.That(db.Notes.Count(), Is.Zero);
    }

    [Test]
    public void Turns_red_on_the_broken_fixture()
    {
        Expression<Func<UserContext, Note, bool>> noMembership = (u, b) => b.TenantId == u.TenantId && b.OwnerId == u.Id;
        using var db = Db("t1");
        Assert.Throws<InvalidOperationException>(() => CheckAgreement(db, noMembership, (u, b) => NotePolicy.Can(u, NoteActions.Read, b), TestUsers.Member));
    }

    [Test]
    public void Every_rule_bound_to_Nobody_returns_no_rows()
    {
        using var db = Db("t1");
        CheckNobodySeesNothing(db, NotePolicy.Rules.Values, PolicyBinder.Bind);
        Assert.Pass();
    }

    [Test]
    public void Turns_red_on_an_unguarded_rule()
    {
        Expression<Func<UserContext, Note, bool>> ownerOnly = (u, b) => b.OwnerId == u.Id;
        using var db = Db("t1");
        Assert.Throws<InvalidOperationException>(() => CheckNobodySeesNothing(db, [ownerOnly], BindUnguarded));
    }
}
