namespace App.Api.Auth;

// Development only (AuthMailers). Each email becomes one text file in .dev-mail/ (gitignored), link included,
// so I can confirm an address locally. Named by time and kind, never by address; the log says only that a file was written.
public sealed class DevFileAuthEmail(IHostEnvironment env, TimeProvider clock, ILogger<DevFileAuthEmail> log) : IAuthEmail
{
    public async Task SendAsync(string recipient, string kind, string link)
    {
        var dir = Path.Combine(env.ContentRootPath, ".dev-mail");
        Directory.CreateDirectory(dir);
        var name = $"{clock.GetUtcNow():yyyyMMdd-HHmmss-fff}-{kind}-{Guid.NewGuid().ToString("N")[..6]}.txt";
        await File.WriteAllTextAsync(Path.Combine(dir, name), $"To: {recipient}\nKind: {kind}\n\n{link}\n");
        log.DevFileWritten(kind); // never the address, never the link
    }
}

public static class AuthMailers
{
    public static Type For(IHostEnvironment env) => env.IsDevelopment() ? typeof(DevFileAuthEmail) : typeof(LogOnlyAuthEmail);
}

public static partial class DevFileLogMessages
{
    [LoggerMessage(Level = LogLevel.Information, Message = "auth.email.devFile kind={Kind}")]
    public static partial void DevFileWritten(this ILogger log, string kind);
}
