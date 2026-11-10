using System.Text.Json;
using App.Core.Dtos;
using App.Core.Services;
using App.Tests.Auth;

namespace App.Tests.Unit;

public class NoteServiceTests
{
    private static readonly DateTimeOffset T0 = new(2026, 7, 16, 12, 0, 0, TimeSpan.Zero);
    private FakeNoteRepository _repository = null!;
    private StubCurrentUser _current = null!;
    private FixedTimeProvider _time = null!;
    private NoteService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _repository = new FakeNoteRepository();
        _current = new StubCurrentUser(TestUsers.Owner);
        _time = new FixedTimeProvider(T0);
        _service = new NoteService(_repository, _current, _time);
    }

    private static JsonElement Json(string s) => JsonDocument.Parse(s).RootElement.Clone();

    private async Task<int> SeedAsync(UserContext owner, params string[] memberIds)
    {
        var note = new Note
        {
            Title = "Note",
            OwnerId = owner.Id,
            TenantId = owner.TenantId,
            CreatedAt = T0.UtcDateTime,
            UpdatedAt = T0.UtcDateTime,
            Members = [.. memberIds.Select(id => new NoteMember { UserId = id })],
        };
        await _repository.AddAsync(note);
        return note.Id;
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
    public void Get_unknown_id_throws_NotFound()
    {
        Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync(999));
    }

    [Test]
    public async Task Update_moves_UpdatedAt_but_not_CreatedAt()
    {
        var created = await _service.CreateAsync(new CreateNoteDto("First", "hello"));
        _time.Now = T0.AddHours(2);
        var updated = await _service.UpdateAsync(created.Id, Json("{\"title\": \"Renamed\", \"body\": \"world\"}"));
        Assert.That(updated.Title, Is.EqualTo("Renamed"));
        Assert.That(updated.CreatedAt, Is.EqualTo(T0.UtcDateTime));
        Assert.That(updated.UpdatedAt, Is.EqualTo(T0.AddHours(2).UtcDateTime));
    }

    [Test]
    public void Update_unknown_id_throws_NotFound()
    {
        Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync(999, Json("{\"title\": \"x\"}")));
    }

    [Test]
    public async Task Delete_existing_removes_it()
    {
        var created = await _service.CreateAsync(new CreateNoteDto("First", null));
        await _service.DeleteAsync(created.Id);
        Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync(created.Id));
    }

    [Test]
    public void Delete_unknown_id_throws_NotFound()
    {
        Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(999));
    }

    [Test]
    public async Task List_returns_created_notes_in_order()
    {
        await _service.CreateAsync(new CreateNoteDto("A", null));
        await _service.CreateAsync(new CreateNoteDto("B", null));
        var all = await _service.ListAsync();
        string[] expected = ["A", "B"];
        Assert.That(all.Select(n => n.Title), Is.EqualTo(expected));
    }

    [TestCase("{\"title\": null}", "title")]
    [TestCase("{\"archived\": null}", "archived")]
    [TestCase("{\"body\": 5}", "body")]
    [TestCase("{\"title\": \"a\", \"title\": \"b\"}", "title")]
    public async Task Patch_rejects_a_wrong_type(string json, string field)
    {
        var id = await SeedAsync(TestUsers.Owner);
        var ex = Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json(json)));
        Assert.That(ex!.Field, Is.EqualTo(field));
    }

    [Test]
    public async Task Patch_rejects_a_blank_title()
    {
        var id = await SeedAsync(TestUsers.Owner);
        Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json("{\"title\": \"   \"}")));
    }

    [Test]
    public async Task Patch_accepts_a_4000_character_body_and_rejects_4001()
    {
        var id = await SeedAsync(TestUsers.Owner);
        await _service.UpdateAsync(id, Json($"{{\"body\": \"{new string('x', 4000)}\"}}"));
        Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json($"{{\"body\": \"{new string('x', 4001)}\"}}")));
    }

    [Test]
    public async Task Members_are_listed_for_the_owner_and_null_for_a_member()
    {
        var id = await SeedAsync(TestUsers.Owner, TestUsers.Member.Id);
        _repository.Emails[TestUsers.Member.Id] = "member@example.test";
        Assert.That((await _service.GetAsync(id)).Members, Is.EqualTo(new[] { new NoteMemberDto(TestUsers.Member.Id, "member@example.test") }));
        _current.Value = TestUsers.Member;
        Assert.That((await _service.GetAsync(id)).Members, Is.Null);
    }

    private sealed class StubCurrentUser(UserContext? value) : ICurrentUser
    {
        public UserContext? Value { get; set; } = value;
    }

    private sealed class FakeNoteRepository : INoteRepository
    {
        private readonly List<Note> _notes = [];
        private int _nextId = 1;

        public Dictionary<string, string> Emails { get; } = [];

        public Task<List<Note>> ListAsync(Expression<Func<Note, bool>> filter) =>
            Task.FromResult(_notes.AsQueryable().Where(filter).OrderBy(n => n.Id).ToList());

        public Task<Note?> FindAsync(Expression<Func<Note, bool>> filter, int id) =>
            Task.FromResult(_notes.AsQueryable().Where(filter).FirstOrDefault(n => n.Id == id));

        public Task AddAsync(Note note)
        {
            note.Id = _nextId++;
            _notes.Add(note);
            return Task.CompletedTask;
        }

        public Task SaveAsync() => Task.CompletedTask;

        public Task RemoveAsync(Note note)
        {
            _notes.Remove(note);
            return Task.CompletedTask;
        }

        public Task<string?> FindShareableUserIdAsync(string email, string tenantId) =>
            Task.FromResult<string?>(Emails.FirstOrDefault(e => string.Equals(e.Value, email.Trim(), StringComparison.OrdinalIgnoreCase)).Key);

        public Task<IReadOnlyDictionary<string, string>> EmailsAsync(IReadOnlyCollection<string> userIds) =>
            Task.FromResult<IReadOnlyDictionary<string, string>>(Emails.Where(e => userIds.Contains(e.Key)).ToDictionary(e => e.Key, e => e.Value));
    }
}
