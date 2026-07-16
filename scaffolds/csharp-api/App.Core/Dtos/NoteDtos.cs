using System.ComponentModel.DataAnnotations;

namespace App.Core.Dtos;

public record NoteDto(int Id, string Title, string Body, DateTime CreatedAt, DateTime UpdatedAt);

public record CreateNoteDto(
    [Required, MaxLength(200)] string Title,
    [MaxLength(4000)] string? Body);

public record UpdateNoteDto(
    [Required, MaxLength(200)] string Title,
    [MaxLength(4000)] string? Body);
