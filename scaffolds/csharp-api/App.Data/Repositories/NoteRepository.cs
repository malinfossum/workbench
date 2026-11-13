using System.Linq.Expressions;
using App.Core.Interfaces;
using App.Core.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace App.Data.Repositories;

// Every read takes the filter NoteService built from NotePolicy.Filter, so a query can't skip the rules.
// GuardTests holds every Notes query in this file to that.
public class NoteRepository(AppDbContext db, ILookupNormalizer normalizer) : INoteRepository
{
    public Task<List<Note>> ListAsync(Expression<Func<Note, bool>> filter) =>
        db.Notes.Include(n => n.Members).Where(filter).OrderBy(n => n.Id).AsNoTracking().ToListAsync();

    public Task<Note?> FindAsync(Expression<Func<Note, bool>> filter, int id) =>
        db.Notes.Include(n => n.Members).Where(filter).SingleOrDefaultAsync(n => n.Id == id);

    public async Task AddAsync(Note note)
    {
        db.Notes.Add(note);
        await db.SaveChangesAsync();
    }

    // The note is tracked (FindAsync); saving persists its edits and its member changes.
    public async Task SaveAsync() => await db.SaveChangesAsync();

    public async Task RemoveAsync(Note note)
    {
        db.Notes.Remove(note);
        await db.SaveChangesAsync();
    }

    // One lookup whatever the answer, so sharing can't time an account into view.
    public Task<string?> FindShareableUserIdAsync(string email, string tenantId)
    {
        var normalized = normalizer.NormalizeEmail(email.Trim());
        return db.Users.Where(u => u.NormalizedEmail == normalized && u.EmailConfirmed && u.TenantId == tenantId)
            .Select(u => u.Id).SingleOrDefaultAsync();
    }

    public async Task<IReadOnlyDictionary<string, string>> EmailsAsync(IReadOnlyCollection<string> userIds) =>
        await db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Email ?? "");
}
