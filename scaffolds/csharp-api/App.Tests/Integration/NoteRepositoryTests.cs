using App.Core.Models;
using App.Data;
using App.Data.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace App.Tests.Integration;

// Real SQLite on an in-memory connection: the connection must stay open for the
// database to live, and EnsureCreated builds the schema (tests only — the app migrates).
public sealed class NoteRepositoryTests
{
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private NoteRepository _repo = null!;

    [SetUp]
    public void SetUp()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();
        _repo = new NoteRepository(_db);
    }

    [TearDown]
    public void TearDown()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private static Note Sample(string title = "First") => new()
    {
        Title = title,
        Body = "hello",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    [Test]
    public async Task Add_then_get_round_trips_through_sqlite()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        var fetched = await _repo.GetAsync(note.Id);
        Assert.That(fetched, Is.Not.Null);
        Assert.That(fetched.Title, Is.EqualTo("First"));
    }

    [Test]
    public async Task GetAll_returns_notes_ordered_by_id()
    {
        await _repo.AddAsync(Sample("A"));
        await _repo.AddAsync(Sample("B"));
        var all = await _repo.GetAllAsync();
        string[] expected = ["A", "B"];
        Assert.That(all.Select(n => n.Title), Is.EqualTo(expected));
    }

    [Test]
    public async Task Delete_removes_the_row()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        await _repo.DeleteAsync(note);
        Assert.That(await _repo.GetAsync(note.Id), Is.Null);
    }
}
