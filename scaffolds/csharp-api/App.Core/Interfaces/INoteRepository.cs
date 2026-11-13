using System.Linq.Expressions;
using App.Core.Models;

namespace App.Core.Interfaces;

public interface INoteRepository
{
    public Task<List<Note>> ListAsync(Expression<Func<Note, bool>> filter);
    public Task<Note?> FindAsync(Expression<Func<Note, bool>> filter, int id);
    public Task AddAsync(Note note);
    public Task SaveAsync();
    public Task RemoveAsync(Note note);
    public Task<string?> FindShareableUserIdAsync(string email, string tenantId);
    public Task<IReadOnlyDictionary<string, string>> EmailsAsync(IReadOnlyCollection<string> userIds);
}
