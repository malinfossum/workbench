using App.Core.Dtos;
using App.Core.Services;

namespace App.Tests.Unit;

public class NoteServiceTests
{
    private static readonly DateTimeOffset T0 = new(2026, 7, 16, 12, 0, 0, TimeSpan.Zero);
    private FakeNoteRepository _repo = null!;
    private FixedTimeProvider _time = null!;
    private NoteService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _repo = new FakeNoteRepository();
        _time = new FixedTimeProvider(T0);
        _service = new NoteService(_repo, _time);
    }

    [Test]
    public async Task Create_assigns_id_and_stamps_both_timestamps_from_time_provider()
    {
        var note = await _service.CreateAsync(new CreateNoteDto("First", "hello"));
        Assert.That(note.Id, Is.EqualTo(1));
        Assert.That(note.CreatedAt, Is.EqualTo(T0.UtcDateTime));
        Assert.That(note.UpdatedAt, Is.EqualTo(T0.UtcDateTime));
    }

    [Test]
    public async Task Create_with_null_body_stores_empty_string()
    {
        var note = await _service.CreateAsync(new CreateNoteDto("First", null));
        Assert.That(note.Body, Is.EqualTo(""));
    }

    [Test]
    public async Task Get_unknown_id_returns_null()
    {
        Assert.That(await _service.GetAsync(999), Is.Null);
    }

    [Test]
    public async Task Update_moves_UpdatedAt_but_not_CreatedAt()
    {
        var created = await _service.CreateAsync(new CreateNoteDto("First", "hello"));
        _time.Now = T0.AddHours(2);
        var updated = await _service.UpdateAsync(created.Id, new UpdateNoteDto("Renamed", "world"));
        Assert.That(updated, Is.Not.Null);
        Assert.That(updated.Title, Is.EqualTo("Renamed"));
        Assert.That(updated.CreatedAt, Is.EqualTo(T0.UtcDateTime));
        Assert.That(updated.UpdatedAt, Is.EqualTo(T0.AddHours(2).UtcDateTime));
    }

    [Test]
    public async Task Update_unknown_id_returns_null()
    {
        Assert.That(await _service.UpdateAsync(999, new UpdateNoteDto("x", null)), Is.Null);
    }

    [Test]
    public async Task Delete_existing_returns_true_and_removes_it()
    {
        var created = await _service.CreateAsync(new CreateNoteDto("First", null));
        Assert.That(await _service.DeleteAsync(created.Id), Is.True);
        Assert.That(await _service.GetAsync(created.Id), Is.Null);
    }

    [Test]
    public async Task Delete_unknown_id_returns_false()
    {
        Assert.That(await _service.DeleteAsync(999), Is.False);
    }

    [Test]
    public async Task GetAll_returns_created_notes_in_order()
    {
        await _service.CreateAsync(new CreateNoteDto("A", null));
        await _service.CreateAsync(new CreateNoteDto("B", null));
        var all = await _service.GetAllAsync();
        string[] expected = ["A", "B"];
        Assert.That(all.Select(n => n.Title), Is.EqualTo(expected));
    }
}
