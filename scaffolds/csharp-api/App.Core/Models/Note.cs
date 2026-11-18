namespace App.Core.Models;

public class Note
{
    public int Id { get; set; }
    public string OwnerId { get; set; } = "";
    public string TenantId { get; set; } = "";
    public required string Title { get; set; }
    public string Body { get; set; } = "";
    public bool Archived { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<NoteMember> Members { get; set; } = [];
}
