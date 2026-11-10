using System.ComponentModel.DataAnnotations;
using App.Core.Authorization;

namespace App.Core.Dtos;

public record NoteMemberDto(string Id, string Email);

public record NoteDto(int Id, string Title, string Body, bool Archived, DateTime CreatedAt, DateTime UpdatedAt, NoteCan Can, List<NoteMemberDto>? Members);

public record CreateNoteDto(
    [Required, MaxLength(200)] string Title,
    [MaxLength(4000)] string? Body);

public record ShareNoteDto([Required, MaxLength(256)] string Email);
