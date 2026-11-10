using App.Core.Interfaces;
using App.Core.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace App.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenant) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<AuthEvent> AuthEvents => Set<AuthEvent>();

    private string TenantId => tenant.TenantId;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<Note>(note =>
        {
            note.Property(n => n.Title).HasMaxLength(200);
            note.Property(n => n.Body).HasMaxLength(4000);
            note.HasMany(n => n.Members).WithOne().HasForeignKey(m => m.NoteId).OnDelete(DeleteBehavior.Cascade);
            // Account data reaches notes through the schema: deleting a user deletes the notes they own.
            note.HasOne<AppUser>().WithMany().HasForeignKey(n => n.OwnerId).OnDelete(DeleteBehavior.Cascade);
            note.HasQueryFilter("Tenant", x => TenantId != "" && x.TenantId == TenantId);
        });
        builder.Entity<NoteMember>(member =>
        {
            member.HasKey(m => new { m.NoteId, m.UserId });
            // ...and removes them from the notes they were shared. SQL Server refuses two cascade paths to one table:
            // a project that moves there makes this one Restrict and deletes the member rows in DeleteAccount.
            member.HasOne<AppUser>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<UserSession>().HasIndex(s => s.Key).IsUnique();
        builder.Entity<UserSession>().HasIndex(s => s.UserId);
        builder.Entity<AuthEvent>().HasIndex(e => e.UserId);
        builder.Entity<AuthEvent>().HasIndex(e => e.At);
    }
}
