using App.Core.Models;
using App.Data;
using App.Data.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace App.Tests.Integration;

// Real SQLite on an in-memory connection: the connection must stay open for the
// database to live, and EnsureCreated builds the schema (tests only — the app migrates).
public sealed class NoteRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly AppDbContext _db;
    private readonly NoteRepository _repo;

    public NoteRepositoryTests()
    {
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();
        _repo = new NoteRepository(_db);
    }

    public void Dispose() { _db.Dispose(); _connection.Dispose(); }

    private static Note Sample(string title = "First") => new()
    {
        Title = title,
        Body = "hello",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task Add_then_get_round_trips_through_sqlite()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        var fetched = await _repo.GetAsync(note.Id);
        Assert.NotNull(fetched);
        Assert.Equal("First", fetched.Title);
    }

    [Fact]
    public async Task GetAll_returns_notes_ordered_by_id()
    {
        await _repo.AddAsync(Sample("A"));
        await _repo.AddAsync(Sample("B"));
        var all = await _repo.GetAllAsync();
        Assert.Equal(["A", "B"], all.Select(n => n.Title));
    }

    [Fact]
    public async Task Delete_removes_the_row()
    {
        var note = Sample();
        await _repo.AddAsync(note);
        await _repo.DeleteAsync(note);
        Assert.Null(await _repo.GetAsync(note.Id));
    }
}
