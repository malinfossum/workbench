using System.Text.Json;
using App.Core.Authorization;
using App.Core.Dtos;
using App.Core.Interfaces;
using App.Core.Models;

namespace App.Core.Services;

// Reads go through NotePolicy.Filter; writes load through the read filter (404 when hidden), then ask NotePolicy.Can (403).
public class NoteService(INoteRepository repository, ICurrentUser current, TimeProvider time)
{
    // What each updatable field accepts. A blank title fails here as it fails [Required] on create.
    private static readonly Dictionary<string, Func<JsonElement, bool>> Fields = new()
    {
        ["title"] = v => v.ValueKind == JsonValueKind.String && v.GetString() is { Length: > 0 and <= 200 } s && !string.IsNullOrWhiteSpace(s),
        ["body"] = v => v.ValueKind == JsonValueKind.String && v.GetString()!.Length <= 4000,
        ["archived"] = v => v.ValueKind is JsonValueKind.True or JsonValueKind.False,
    };

    private UserContext Me => current.Value ?? throw new NotFoundException();

    public async Task<List<NoteDto>> ListAsync() =>
        await ToDtosAsync(await repository.ListAsync(NotePolicy.Filter(NoteActions.Read, Me)));

    public async Task<NoteDto> GetAsync(int id) => (await ToDtosAsync([await LoadAsync(id)]))[0];

    public async Task<NoteDto> CreateAsync(CreateNoteDto dto)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var note = new Note { OwnerId = Me.Id, TenantId = Me.TenantId, Title = dto.Title, Body = dto.Body ?? "", CreatedAt = now, UpdatedAt = now };
        if (!NotePolicy.Can(Me, NoteActions.Create, note))
        {
            throw new ForbiddenException(null); // an unverified email, or no tenant
        }
        await repository.AddAsync(note);
        return (await ToDtosAsync([note]))[0];
    }

    // The keys come from the raw JSON, so a key the client sent is never lost to model binding.
    public async Task<NoteDto> UpdateAsync(int id, JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Object)
        {
            throw new UnknownFieldException("(body)");
        }
        var keys = new List<string>();
        foreach (var p in body.EnumerateObject()) // 400 before any rule runs: an unknown key, a wrong type, or a key twice
        {
            if (!Fields.TryGetValue(p.Name, out var valid))
            {
                throw new UnknownFieldException(p.Name);
            }
            if (!valid(p.Value) || keys.Contains(p.Name))
            {
                throw new InvalidFieldException(p.Name);
            }
            keys.Add(p.Name);
        }
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Update, note))
        {
            throw new ForbiddenException(null);
        }
        var allowed = NotePolicy.UpdatableFields(Me, note);
        foreach (var k in keys)
        {
            if (!allowed.Contains(k))
            {
                throw new ForbiddenException(k); // 403 naming the field
            }
        }
        if (body.TryGetProperty("title", out var t))
        {
            note.Title = t.GetString()!;
        }
        if (body.TryGetProperty("body", out var text))
        {
            note.Body = text.GetString()!;
        }
        if (body.TryGetProperty("archived", out var a))
        {
            note.Archived = a.GetBoolean();
        }
        note.UpdatedAt = time.GetUtcNow().UtcDateTime;
        await repository.SaveAsync();
        return (await ToDtosAsync([note]))[0];
    }

    public async Task DeleteAsync(int id)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Delete, note))
        {
            throw new ForbiddenException(null);
        }
        await repository.RemoveAsync(note); // member rows go with it (cascade)
    }

    // Always quiet: an unknown email, another tenant, an unconfirmed address, an existing member and the owner all
    // change nothing and look the same to the caller.
    public async Task ShareAsync(int id, string email)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Share, note))
        {
            throw new ForbiddenException(null);
        }
        var userId = await repository.FindShareableUserIdAsync(email, note.TenantId);
        if (userId is null || userId == note.OwnerId || note.Members.Exists(m => m.UserId == userId))
        {
            return;
        }
        note.Members.Add(new NoteMember { UserId = userId });
        await repository.SaveAsync();
    }

    public async Task UnshareAsync(int id, string userId)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Share, note))
        {
            throw new ForbiddenException(null);
        }
        if (note.Members.Find(m => m.UserId == userId) is { } member)
        {
            note.Members.Remove(member); // a required relationship, so EF deletes the orphaned row
            await repository.SaveAsync();
        }
    }

    private async Task<Note> LoadAsync(int id) =>
        await repository.FindAsync(NotePolicy.Filter(NoteActions.Read, Me), id) ?? throw new NotFoundException();

    // Member emails only for whoever may share the note (its owner), so an address is shown only to the person who typed it.
    private async Task<List<NoteDto>> ToDtosAsync(List<Note> notes)
    {
        var shown = notes.Where(n => NotePolicy.Can(Me, NoteActions.Share, n)).ToList();
        var ids = shown.SelectMany(n => n.Members).Select(m => m.UserId).Distinct().ToList();
        var emails = ids.Count == 0 ? new Dictionary<string, string>() : await repository.EmailsAsync(ids);
        return notes.ConvertAll(n => new NoteDto(n.Id, n.Title, n.Body, n.Archived, n.CreatedAt, n.UpdatedAt, NotePolicy.Flags(Me, n),
            shown.Contains(n) ? n.Members.ConvertAll(m => new NoteMemberDto(m.UserId, emails.GetValueOrDefault(m.UserId, ""))) : null));
    }
}
