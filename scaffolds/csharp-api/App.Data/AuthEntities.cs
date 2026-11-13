using App.Core.Authorization;
using Microsoft.AspNetCore.Identity;

namespace App.Data;

public sealed class AppUser : IdentityUser
{
    public string TenantId { get; set; } = "";
    public Role Role { get; set; }
}

public sealed class UserSession
{
    public int Id { get; set; }
    public string Key { get; set; } = "";
    public string UserId { get; set; } = "";
    public byte[] Ticket { get; set; } = [];
    public DateTime CreatedAt { get; set; } // the sign-in time: the 30-day cap and the fresh-session check count from here
    public DateTime LastSeenAt { get; set; }
    public DateTime ExpiresAt { get; set; } // last seen + 7 days
    public string SignInMethod { get; set; } = ""; // "passkey", "second-factor" or "password": the second-factor gate reads it
    public string? IpAddress { get; set; } // for the limiter and the session list, gone with the row
    public string? UserAgent { get; set; }
}

// Auth events: who and what, never an IP, a secret or an email. Kept 90 days, also after the account is deleted.
public sealed class AuthEvent
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Kind { get; set; } = "";
    public DateTime At { get; set; }
}
