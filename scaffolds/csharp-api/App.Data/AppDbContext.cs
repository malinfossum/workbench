using App.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace App.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NoteMember>().HasKey(m => new { m.NoteId, m.UserId });

        modelBuilder.Entity<Note>(note =>
        {
            note.Property(n => n.Title).HasMaxLength(200);
            note.Property(n => n.Body).HasMaxLength(4000);
        });
    }
}
