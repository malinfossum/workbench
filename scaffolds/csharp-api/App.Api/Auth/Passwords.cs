namespace App.Api.Auth;

public interface IBreachedPasswords
{
    public Task<bool> IsBreachedAsync(string password);
}

// An outbound call to api.pwnedpasswords.com: name it in the privacy notice and the firewall rules.
// k-anonymity: only the first five hex characters of the SHA-1 hash leave the server (the range API's protocol).
// The HttpClient times out after 3 seconds (Program.cs), so sign-up never hangs on it.
public sealed class PwnedPasswordsRange(HttpClient http, ILogger<PwnedPasswordsRange> log) : IBreachedPasswords
{
    public async Task<bool> IsBreachedAsync(string password)
    {
        // SHA-1 is the range API's lookup key here, not a protection: the hash never stores or proves anything.
        using var sha1 = IncrementalHash.CreateHash(HashAlgorithmName.SHA1);
        sha1.AppendData(Encoding.UTF8.GetBytes(password));
        var hash = Convert.ToHexString(sha1.GetHashAndReset());
        try
        {
            var body = await http.GetStringAsync($"https://api.pwnedpasswords.com/range/{hash[..5]}");
            return body.Split('\n').Select(l => l.TrimEnd('\r'))
                .Any(l => l.StartsWith(hash[5..] + ":", StringComparison.OrdinalIgnoreCase) && !l.EndsWith(":0", StringComparison.Ordinal)); // ":0" rows are padding
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            log.BreachedCheckUnavailable(ex.GetType().Name); // fails open: an outage or a timeout must not block every sign-up
            return false;
        }
    }
}

public sealed class BreachedPasswordValidator(IBreachedPasswords breached) : IPasswordValidator<AppUser>
{
    public async Task<IdentityResult> ValidateAsync(UserManager<AppUser> manager, AppUser user, string? password) =>
        password is not null && await breached.IsBreachedAsync(password)
            ? IdentityResult.Failed(new IdentityError { Code = "PasswordBreached", Description = "This password has appeared in a data breach." })
            : IdentityResult.Success;
}

// Sign-in with an unknown email checks the password against this hash, so it costs the same hash check as a known
// email, and the answer time doesn't tell a stranger which emails have accounts.
public static class DummyHash
{
    private static string? _hash;

    public static void Check(UserManager<AppUser> users, string password)
    {
        var nobody = new AppUser();
        _hash ??= users.PasswordHasher.HashPassword(nobody, Convert.ToHexString(RandomNumberGenerator.GetBytes(16)));
        users.PasswordHasher.VerifyHashedPassword(nobody, _hash, password);
    }
}
