namespace App.Tests.Auth;

public class CopyTests
{
    // Every key in the failure table in the auth skill's authn.md.
    private static readonly string[] Keys =
    [
        "auth.error.signInFailed", "auth.error.wrongCode", "auth.error.expiredCode", "auth.error.recoveryCodeWrong",
        "auth.error.expiredLink", "auth.error.passkeyCancelled", "auth.error.noPasskeyHere", "auth.error.passkeyUnknown",
        "auth.error.tooManyAttempts", "auth.error.sessionExpired", "auth.error.reauthRequired", "auth.error.emailUnverified",
        "auth.error.passwordRejected", "auth.error.currentPasswordWrong", "auth.error.lastSignInMethod",
        "auth.error.secondFactorRequired", "auth.error.secondFactorNeeded", "auth.error.totpBeforePasskey", "auth.error.removePasskeysFirst",
        "auth.error.unavailable",
        "auth.notice.checkInbox", "auth.notice.resetSent", "auth.notice.contactOwner",
    ];

    public static void CheckCopy(IReadOnlyDictionary<string, JsonElement> locales)
    {
        foreach (var (name, doc) in locales)
            foreach (var key in Keys)
                if (!doc.TryGetProperty(key, out var text) || string.IsNullOrWhiteSpace(text.GetString()))
                    throw new InvalidOperationException($"{name} has no text for {key}");
    }

    private static readonly string[] Locales = ["en.json", "nb.json"];

    private static Dictionary<string, JsonElement> Load() =>
        Directory.GetFiles(Path.Combine(Source.Root, "App.Api", "Locales"), "*.json")
            .ToDictionary(f => Path.GetFileName(f), f => JsonDocument.Parse(File.ReadAllText(f)).RootElement);

    [Test]
    public void Every_message_has_text_in_every_locale()
    {
        var locales = Load();
        Assert.That(locales.Keys, Is.EquivalentTo(Locales));
        CheckCopy(locales);
    }

    [Test]
    public void Turns_red_on_the_broken_fixture() =>
        Assert.Throws<InvalidOperationException>(() => CheckCopy(new Dictionary<string, JsonElement>
        {
            ["nb.json"] = JsonDocument.Parse("{\"auth.error.wrongCode\": \"Koden er feil.\"}").RootElement,
        }));
}
