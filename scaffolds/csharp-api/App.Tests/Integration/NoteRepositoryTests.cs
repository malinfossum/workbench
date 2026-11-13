using App.Data.Repositories;
using App.Tests.Auth;

namespace App.Tests.Integration;

// Real SQLite on an in-memory connection: the connection must stay open for the
// database to live, and EnsureCreated builds the schema (tests only: the app migrates).
public sealed class NoteRepositoryTests
{
    private readonly UpperInvariantLookupNormalizer _normalizer = new();
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private NoteRepository _repo = null!;

    [SetUp]
    public void SetUp()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _db = TestDb.Context(_connection, "t1");
        _db.Database.EnsureCreated();
        _db.Users.Add(new AppUser { Id = "u1", UserName = "u1", TenantId = "t1" });
        _db.SaveChanges();
        _repo = new NoteRepository(_db, _normalizer);
    }

    [TearDown]
    public void TearDown()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private static Note Sample(string title = "First") => new()
    {
        OwnerId = "u1",
        TenantId = "t1",
        Title = title,
        Body = "hello",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    private static Expression<Func<Note, bool>> OwnerReads => NotePolicy.Filter(NoteActions.Read, TestUsers.Owner);

    [Test]
    public async Task Add_then_find_round_trips_through_sqlite()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        var fetched = await _repo.FindAsync(OwnerReads, note.Id);
        Assert.That(fetched, Is.Not.Null);
        Assert.That(fetched.Title, Is.EqualTo("First"));
    }

    [Test]
    public async Task List_returns_notes_ordered_by_id()
    {
        await _repo.AddAsync(Sample("A"));
        await _repo.AddAsync(Sample("B"));
        var all = await _repo.ListAsync(OwnerReads);
        string[] expected = ["A", "B"];
        Assert.That(all.Select(n => n.Title), Is.EqualTo(expected));
    }

    [Test]
    public async Task Remove_deletes_the_row()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        await _repo.RemoveAsync(note);
        Assert.That(await _repo.FindAsync(OwnerReads, note.Id), Is.Null);
    }

    [Test]
    public async Task Find_misses_when_the_filter_hides_the_note()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        Assert.That(await _repo.FindAsync(NotePolicy.Filter(NoteActions.Read, TestUsers.Stranger), note.Id), Is.Null);
    }

    [Test]
    public async Task FindShareableUserId_matches_only_a_confirmed_email_in_the_tenant()
    {
        _db.Users.AddRange(
            Account("bob", "bob@example.test", "t1", true),
            Account("carol", "carol@example.test", "t1", false),
            Account("dave", "dave@example.test", "t2", true));
        await _db.SaveChangesAsync();
        Assert.Multiple(async () =>
        {
            Assert.That(await _repo.FindShareableUserIdAsync("bob@example.test", "t1"), Is.EqualTo("bob"));
            Assert.That(await _repo.FindShareableUserIdAsync(" BOB@example.TEST ", "t1"), Is.EqualTo("bob"));
            Assert.That(await _repo.FindShareableUserIdAsync("carol@example.test", "t1"), Is.Null);
            Assert.That(await _repo.FindShareableUserIdAsync("dave@example.test", "t1"), Is.Null);
        });
    }

    private AppUser Account(string id, string email, string tenant, bool confirmed) => new()
    {
        Id = id,
        UserName = id,
        Email = email,
        NormalizedEmail = _normalizer.NormalizeEmail(email),
        EmailConfirmed = confirmed,
        TenantId = tenant,
    };
}
