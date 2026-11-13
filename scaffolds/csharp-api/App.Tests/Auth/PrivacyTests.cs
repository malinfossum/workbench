
namespace App.Tests.Auth;

public static class PrivacyCheck
{
    private static readonly Regex Ip = new(@"\b\d{1,3}(\.\d{1,3}){3}\b|\b[0-9a-f]{1,4}(:[0-9a-f]{0,4}){4,7}\b", RegexOptions.IgnoreCase);

    public static void Check(IEnumerable<string> lines, IEnumerable<string> secrets)
    {
        var list = secrets.Where(s => s.Length > 0).ToList();
        foreach (var line in lines)
        {
            if (list.Any(s => line.Contains(s, StringComparison.OrdinalIgnoreCase))) throw new InvalidOperationException($"Log line holds a secret: {line}");
            if (Ip.IsMatch(line)) throw new InvalidOperationException($"Log line holds an IP address: {line}");
        }
    }
}

public class PrivacyTests
{
    private AuthApiFactory _app = null!;
    [SetUp] public void SetUp() => _app = new AuthApiFactory();
    [TearDown] public void TearDown() => _app.Dispose();

    [Test]
    public async Task Logs_hold_no_secrets_and_deleting_the_account_leaves_no_credentials()
    {
        const string email = "privacy@example.test";
        var user = await _app.SeedUser(email, twoFactor: true);
        var seeded = await _app.NewRecoveryCodes(user);
        var c = _app.Client();
        // The password, then a recovery code: new codes need a session that used the account's second factor.
        async Task<string> SignedIn(string code)
        {
            await c.SignIn(email, AuthApiFactory.TestPhrase);
            return ClientExtensions.SessionCookie(await c.PostAsJsonAsync("/auth/recovery", new { code })).Split('=', 2)[1];
        }
        var first = await SignedIn(seeded[0]);
        // Through the endpoint, so its own log lines are in the captured set.
        var issued = await (await c.PostAsync("/account/mfa/codes", null)).Content.ReadFromJsonAsync<JsonElement>();
        var codes = issued.GetProperty("recoveryCodes").EnumerateArray().Select(x => x.GetString()!).Concat(seeded).ToList();
        await c.SignIn(email, AuthApiFactory.NewTestPhrase); // a failure
        var token = await SignedIn(codes[0]);
        await c.PostAsJsonAsync("/account/password", new { current = AuthApiFactory.TestPhrase, @new = AuthApiFactory.NewTestPhrase });
        PrivacyCheck.Check(_app.Logs.Lines, [AuthApiFactory.TestPhrase, AuthApiFactory.NewTestPhrase, email, first, token, FixedRemoteIp.Address.ToString(), .. codes]);

        var other = await _app.SeedUser("other@example.test");
        var owned = await _app.SeedNote(user.Id, "t1");
        var shared = await _app.SeedNote(other.Id, "t1", user.Id);
        Assert.That((await c.DeleteAsync("/account")).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        var left = await _app.With(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            return await db.UserSessions.CountAsync(s => s.UserId == user.Id)
                + await db.Users.CountAsync(u => u.Id == user.Id)
                + await db.UserTokens.CountAsync(t => t.UserId == user.Id) // recovery codes and authenticator keys live here
                + await db.Set<IdentityUserPasskey<string>>().CountAsync(p => p.UserId == user.Id)
                + await db.Notes.IgnoreQueryFilters(["Tenant"]).CountAsync(n => n.OwnerId == user.Id)
                + await db.Set<NoteMember>().CountAsync(m => m.UserId == user.Id);
        });
        Assert.That(left, Is.Zero);
    }

    [Test]
    public async Task Deleting_a_member_s_account_leaves_the_owner_s_note() // Review Focus 4
    {
        var owner = await _app.SeedUser("owner@example.test");
        var member = await _app.SeedUser("member@example.test");
        var note = await _app.SeedNote(owner.Id, "t1", member.Id);
        var c = _app.Client(); await c.SignIn("member@example.test", AuthApiFactory.TestPhrase);
        Assert.That((await c.DeleteAsync("/account")).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        var o = _app.Client(); await o.SignIn("owner@example.test", AuthApiFactory.TestPhrase);
        var dto = await o.GetFromJsonAsync<JsonElement>($"/api/notes/{note}");
        Assert.That(dto.GetProperty("members").GetArrayLength(), Is.Zero);
    }

    [Test]
    public void Turns_red_on_the_broken_fixture() =>
        Assert.Throws<InvalidOperationException>(() => PrivacyCheck.Check(["auth.signin.failure email=privacy@example.test"], ["privacy@example.test"]));

    [Test]
    public async Task Recovery_codes_are_stored_as_hashes()
    {
        var user = await _app.SeedUser("codes@example.test");
        var codes = await _app.NewRecoveryCodes(user);
        var stored = await _app.With(sp => sp.GetRequiredService<AppDbContext>().UserTokens.Where(t => t.UserId == user.Id).Select(t => t.Value ?? "").ToListAsync());
        Assert.That(stored, Is.Not.Empty);
        Assert.That(codes.Where(code => stored.Any(v => v.Contains(code, StringComparison.OrdinalIgnoreCase))), Is.Empty);
    }
}
