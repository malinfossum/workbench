using App.Core.Models;

namespace App.Core.Interfaces;

public interface INoteRepository
{
    public Task<List<Note>> GetAllAsync();
    public Task<Note?> GetAsync(int id);
    public Task AddAsync(Note note);
    public Task UpdateAsync(Note note);
    public Task DeleteAsync(Note note);
}
