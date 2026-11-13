using App.Api.Auth.Http;
using App.Core.Dtos;
using App.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace App.Api.Controllers;

// No permission checks here: NoteService asks NotePolicy. A filter miss is 404, readable but not allowed is 403.
// The session, the second-factor gate and the cross-site guard run before any action (Program.cs).
[ApiController]
[Route("api/notes")]
[RequestSizeLimit(BodyLimit.NotesBytes)]
public class NotesController(NoteService service) : ControllerBase
{
    [HttpGet]
    public Task<List<NoteDto>> GetAll() => service.ListAsync();

    [HttpGet("{id:int}")]
    public Task<NoteDto> Get(int id) => service.GetAsync(id);

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

    // The email goes in the body, never the URL, and the answer is 204 whether or not it matched anyone.
    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> Share(int id, ShareNoteDto dto)
    {
        await service.ShareAsync(id, dto.Email);
        return NoContent();
    }

    [HttpDelete("{id:int}/members/{userId}")]
    public async Task<IActionResult> Unshare(int id, string userId)
    {
        await service.UnshareAsync(id, userId);
        return NoContent();
    }
}
