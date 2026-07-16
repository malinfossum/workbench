using App.Core.Dtos;
using App.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace App.Api.Controllers;

[ApiController]
[Route("api/notes")]
public class NotesController(NoteService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NoteDto>>> GetAll() =>
        await service.GetAllAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NoteDto>> Get(int id) =>
        await service.GetAsync(id) is { } note ? note : NotFound();

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(CreateNoteDto dto)
    {
        var note = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = note.Id }, note);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<NoteDto>> Update(int id, UpdateNoteDto dto) =>
        await service.UpdateAsync(id, dto) is { } note ? note : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await service.DeleteAsync(id) ? NoContent() : NotFound();
}
