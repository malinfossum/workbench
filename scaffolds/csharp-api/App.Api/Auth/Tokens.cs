namespace App.Api.Auth;

// Identity keeps recovery codes in plaintext. This store keeps SHA-256 hashes instead (authn.md,
// Password fallback and MFA). No salt: each code is random and high-entropy, so a lookup table can't
// reverse it. CountCodesAsync needs no override: it counts entries, hashed or not.
public sealed class HashedRecoveryCodeStore(AppDbContext context, IdentityErrorDescriber? describer = null)
    : UserOnlyStore<AppUser, AppDbContext>(context, describer)
{
    private static string Hash(string code) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));

    public override Task ReplaceCodesAsync(AppUser user, IEnumerable<string> recoveryCodes, CancellationToken cancellationToken) =>
        base.ReplaceCodesAsync(user, recoveryCodes.Select(Hash), cancellationToken);

    // The base RedeemCodeAsync hands the codes left to ReplaceCodesAsync above, which would hash them a second time and
    // void every one. So this compares hashes itself and stores the rest as they are. The names are the base store's.
    public override async Task<bool> RedeemCodeAsync(AppUser user, string code, CancellationToken cancellationToken)
    {
        var hash = Hash(code);
        var stored = (await GetTokenAsync(user, "[AspNetUserStore]", "RecoveryCodes", cancellationToken) ?? "").Split(';');
        if (!stored.Contains(hash)) return false;
        await base.ReplaceCodesAsync(user, stored.Where(s => s != hash), cancellationToken);
        return true;
    }
}

public static class RecoveryCodes
{
    // Called right after a factor is added. When it is the account's only factor, the account gets ten fresh codes,
    // shown once, and any older ones stop working. A later factor keeps the codes the user has.
    public static async Task<string[]?> IssueFirstAsync(UserManager<AppUser> users, AppUser user)
    {
        var factors = (user.TwoFactorEnabled ? 1 : 0) + (await users.GetPasskeysAsync(user)).Count;
        return factors == 1 ? (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10))?.ToArray() : null;
    }
}

// Confirmation links live 24 hours; reset links keep the default provider's 15 minutes.
public sealed class EmailConfirmationTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public EmailConfirmationTokenProviderOptions() { Name = EmailConfirmationTokenProvider.ProviderName; TokenLifespan = TimeSpan.FromHours(24); }
}

public sealed class EmailConfirmationTokenProvider(IDataProtectionProvider protection, IOptions<EmailConfirmationTokenProviderOptions> options, ILogger<DataProtectorTokenProvider<AppUser>> log)
    : DataProtectorTokenProvider<AppUser>(protection, options, log)
{
    public const string ProviderName = "EmailConfirmation";
}
