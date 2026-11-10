using System.Text.Json;
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
        await service.ListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NoteDto>> Get(int id) =>
        await service.GetAsync(id);

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(CreateNoteDto dto)
    {
        var note = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = note.Id }, note);
    }

    [HttpPatch("{id:int}")]
    public Task<NoteDto> Update(int id, [FromBody] JsonElement body) => service.UpdateAsync(id, body);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }
}
