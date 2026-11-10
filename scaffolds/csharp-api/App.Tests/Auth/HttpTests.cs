namespace App.Tests.Auth;

using static ClientExtensions;

public class HttpTests
{
    private AuthApiFactory _app = null!;
    private static readonly string[] RevokeFailedLog = ["App.Api.Auth.AuthLog: auth.session.revokeFailed error=DbUpdateException "];
    private static readonly string[] ExportKeys = ["email", "name", "passkeys", "sessions", "events"];
    private const string Pw = AuthApiFactory.TestPhrase;
    private const string NewPw = AuthApiFactory.NewTestPhrase;
    [SetUp] public void SetUp() => _app = new AuthApiFactory();
    [TearDown] public void TearDown() => _app.Dispose();

    public sealed record StatusWorld(HttpClient Anonymous, HttpClient Owner, HttpClient Member, HttpClient Stranger, int Note, int ForeignNote);

    // Every status path, in the spec's words. Each row: what it is, the request, the status, and the body fields that must match (raw JSON).
    public static async Task CheckStatusPaths(StatusWorld w)
    {
        Task<HttpResponseMessage> Patch(HttpClient c, int id, object body) => c.PatchAsJsonAsync($"/api/notes/{id}", body);
        (string What, Func<Task<HttpResponseMessage>> Send, HttpStatusCode Status, Dictionary<string, string>? Fields)[] rows =
        [
            ("not signed in", () => w.Anonymous.GetAsync($"/api/notes/{w.Note}"), HttpStatusCode.Unauthorized, null),
            ("not visible", () => w.Stranger.GetAsync($"/api/notes/{w.Note}"), HttpStatusCode.NotFound, null),
            ("an edit on a note it can't see", () => Patch(w.Stranger, w.Note, new { title = "Renamed" }), HttpStatusCode.NotFound, null),
            ("a delete on a note it can't see", () => w.Stranger.DeleteAsync($"/api/notes/{w.Note}"), HttpStatusCode.NotFound, null),
            ("another tenant's note", () => w.Owner.GetAsync($"/api/notes/{w.ForeignNote}"), HttpStatusCode.NotFound, null),
            ("a tenant id in the body", () => Patch(w.Owner, w.ForeignNote, new { tenantId = "t2" }), HttpStatusCode.BadRequest, null),
            ("visible but not allowed", () => w.Member.DeleteAsync($"/api/notes/{w.Note}"), HttpStatusCode.Forbidden, null),
            ("a field not allowed", () => Patch(w.Member, w.Note, new { archived = true }), HttpStatusCode.Forbidden, new() { ["field"] = "\"archived\"" }),
            ("an unknown key", () => Patch(w.Owner, w.Note, new { ownerId = "x" }), HttpStatusCode.BadRequest, null),
            ("a bad value", () => Patch(w.Owner, w.Note, new { title = new { } }), HttpStatusCode.BadRequest, null),
            ("allowed, with flags", () => w.Member.GetAsync($"/api/notes/{w.Note}"), HttpStatusCode.OK, new() { ["can"] = """{"edit":true,"delete":false}""" }),
        ];
        foreach (var (what, send, status, fields) in rows)
        {
            var res = await send();
            if (res.StatusCode != status) throw new InvalidOperationException($"{what}: {(int)res.StatusCode}, not {(int)status}");
            var body = fields is null ? default : await res.Content.ReadFromJsonAsync<JsonElement>();
            foreach (var (k, v) in fields ?? [])
            {
                var got = body.TryGetProperty(k, out var value) ? value.GetRawText() : "missing";
                if (got != v) throw new InvalidOperationException($"{what}: {k} is {got}");
            }
        }
    }

    private async Task<StatusWorld> World()
    {
        var owner = await _app.SeedUser("owner@example.test");
        var member = await _app.SeedUser("member@example.test");
        await _app.SeedUser("stranger@example.test");
        var foreign = await _app.SeedUser("foreign@example.test", tenant: "t2");
        var note = await _app.SeedNote(owner.Id, "t1", member.Id);
        var foreignNote = await _app.SeedNote(foreign.Id, "t2");
        async Task<HttpClient> As(string email) { var c = _app.Client(); await c.SignIn(email, Pw); return c; }
        return new(_app.Client(), await As("owner@example.test"), await As("member@example.test"), await As("stranger@example.test"), note, foreignNote);
    }

    // The password, then a recovery code: a session that used its second factor. TOTP math isn't in the BCL.
    private async Task<HttpClient> SignedInWithCode(string email, string code)
    {
        var c = _app.Client();
        await c.SignIn(email, Pw);
        var res = await c.PostAsJsonAsync("/auth/recovery", new { code });
        if (res.StatusCode != HttpStatusCode.NoContent) throw new InvalidOperationException(await Said(res));
        return c;
    }

    private Task<int> CodesLeft(AppUser user) => _app.With(async sp =>
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        return await users.CountRecoveryCodesAsync((await users.FindByIdAsync(user.Id))!);
    });

    // The broken fixture: a server with no session check and no error mapper, which answers everything.
    private sealed class AnswersEverything : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { can = new { edit = true, delete = true } }) });
    }

    [Test]
    public async Task Every_status_path()
    {
        await CheckStatusPaths(await World());
        Assert.Pass();
    }

    [Test]
    public void Turns_red_on_the_broken_fixture()
    {
        HttpClient Open() => new(new AnswersEverything()) { BaseAddress = new Uri(AuthApiFactory.Origin) };
        var ex = Assert.ThrowsAsync<InvalidOperationException>(() => CheckStatusPaths(new StatusWorld(Open(), Open(), Open(), Open(), 1, 2)));
        Assert.That(ex!.Message, Does.StartWith("not signed in"));
    }

    [Test]
    public async Task Every_route_needs_a_session_unless_it_is_on_the_public_list()
    {
        var anon = _app.Client();
        var endpoints = _app.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>();
        foreach (var e in endpoints)
        {
            var raw = "/" + e.RoutePattern.RawText!.TrimStart('/');
            if (e.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                Assert.That(PublicEndpoints.Paths, Does.Contain(raw), "anonymous but not on the named public list");
                continue;
            }
            var path = Regex.Replace(raw, @"\{[^}]+\}", "1");
            foreach (var method in e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? ["GET"])
            {
                var res = await anon.SendAsync(new HttpRequestMessage(new HttpMethod(method), path) { Content = JsonContent.Create(new { }) });
                Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), $"{method} {path}");
            }
        }
    }

    [TestCase("//evil.example")]
    [TestCase("/\\evil.example")]
    [TestCase("https://evil.example")]
    [TestCase("https:evil.example")]
    [TestCase("/%2F%2Fevil.example")]
    [TestCase("https://localhost:8443/x")]
    [TestCase("")]
    [TestCase("/x%0D%0ASet-Cookie:a=b")]
    [TestCase("/x\r\nSet-Cookie:a=b")]
    [TestCase("/\t/evil.example")]
    [TestCase("/.//evil.example")] // dot segments that normalise to "//evil.example"
    [TestCase("/..//evil.example")]
    [TestCase("/a/../..//evil.example")]
    [TestCase("/%2E%2E//evil.example")]
    public async Task A_foreign_return_url_lands_on_the_root(string returnUrl)
    {
        await _app.SeedUser("a@example.test");
        var res = await _app.Client().SignIn("a@example.test", Pw, returnUrl);
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Redirect));
        Assert.That(res.Headers.Location!.OriginalString, Is.EqualTo("/"));
    }

    [Test]
    public async Task A_same_origin_return_url_is_kept()
    {
        await _app.SeedUser("a@example.test");
        var res = await _app.Client().SignIn("a@example.test", Pw, "/api/notes/1?x=1");
        Assert.That(res.Headers.Location!.OriginalString, Is.EqualTo("/api/notes/1?x=1"));
    }

    [Test] public void Keeps_a_same_origin_path() => Assert.That(SafeRedirect.Path("/api/notes/1?x=1#top"), Is.EqualTo("/api/notes/1?x=1#top"));

    [Test] public void Returns_the_path_it_checked_not_the_raw_input() => Assert.That(SafeRedirect.Path("/a/%2E%2E/api/notes"), Is.EqualTo("/api/notes"));

    [Test]
    public async Task Reset_and_sign_up_answer_the_same_for_known_and_unknown_emails()
    {
        await _app.SeedUser("known@example.test", twoFactor: true);
        var c = _app.Client();
        async Task<string> Answer(string path, object body)
        {
            var r = await c.PostAsJsonAsync(path, body);
            return $"{(int)r.StatusCode} {await r.Content.ReadAsStringAsync()}";
        }
        Assert.That(await Answer("/auth/reset", new { email = "known@example.test" }), Is.EqualTo(await Answer("/auth/reset", new { email = "nobody@example.test" })));
        Assert.That(_app.Mail.Sent.Any(m => m.To == "known@example.test" && m.Kind == "reset" && m.Link.Contains("/reset#uid=")), Is.True);
        Assert.That(await Answer("/auth/sign-up", new SignInRequest("known@example.test", Pw)), Is.EqualTo(await Answer("/auth/sign-up", new SignInRequest("new@example.test", Pw))));
        Assert.That(_app.Mail.Sent.Any(m => m.To == "known@example.test" && m.Kind == "account-exists"), Is.True);
        Assert.That(_app.Mail.Sent.Any(m => m.To == "new@example.test" && m.Kind == "confirm" && m.Link.Contains("/confirm-email#uid=")), Is.True);
    }

    [Test]
    public async Task A_too_short_password_gets_the_same_answer_for_known_and_unknown_emails()
    {
        await _app.SeedUser("known@example.test");
        var c = _app.Client();
        async Task<string> Answer(string email)
        {
            var r = await c.PostAsJsonAsync("/auth/sign-up", new SignInRequest(email, Pw[..5]));
            return $"{(int)r.StatusCode} {await r.Content.ReadAsStringAsync()}";
        }
        var known = await Answer("known@example.test");
        Assert.That(known, Does.StartWith("400 "));
        Assert.That(known, Is.EqualTo(await Answer("new@example.test")));
    }

    // Counts every hash and every hash check: the slow part a stopwatch would see.
    private sealed class CountingHasher : IPasswordHasher<AppUser>
    {
        private readonly PasswordHasher<AppUser> _inner = new();
        private int _calls;
        public int Calls => _calls;
        public string HashPassword(AppUser user, string password) { Interlocked.Increment(ref _calls); return _inner.HashPassword(user, password); }
        public PasswordVerificationResult VerifyHashedPassword(AppUser user, string hash, string password) { Interlocked.Increment(ref _calls); return _inner.VerifyHashedPassword(user, hash, password); }
    }

    [Test]
    public async Task An_unknown_email_costs_the_same_hashing_as_a_known_one()
    {
        await _app.SeedUser("known@example.test");
        var hasher = new CountingHasher();
        using var app = _app.WithWebHostBuilder(b => b.ConfigureServices(s => s.AddSingleton<IPasswordHasher<AppUser>>(hasher)));
        var c = AuthApiFactory.ClientOf(app);
        async Task<int> Cost(Func<Task> send) { var before = hasher.Calls; await send(); return hasher.Calls - before; }
        await c.SignIn("warm-up@example.test", NewPw); // the first unknown email in a process also makes the dummy hash
        var known = await Cost(() => c.SignIn("known@example.test", NewPw));
        Assert.That(known, Is.EqualTo(1));
        Assert.That(await Cost(() => c.SignIn("nobody@example.test", NewPw)), Is.EqualTo(known));
        var signUpKnown = await Cost(() => c.PostAsJsonAsync("/auth/sign-up", new SignInRequest("known@example.test", Pw)));
        Assert.That(signUpKnown, Is.EqualTo(await Cost(() => c.PostAsJsonAsync("/auth/sign-up", new SignInRequest("new@example.test", Pw)))));
    }

    [Test]
    public async Task An_unconfirmed_email_cannot_sign_in_until_the_link_is_used()
    {
        var c = _app.Client();
        await c.PostAsJsonAsync("/auth/sign-up", new SignInRequest("new@example.test", Pw));
        // The password is checked first, so a stranger learns nothing about the address.
        Assert.That(await ErrorOf(await c.SignIn("new@example.test", AuthApiFactory.NewTestPhrase)), Is.EqualTo("auth.error.signInFailed"));
        Assert.That(await ErrorOf(await c.SignIn("new@example.test", Pw)), Is.EqualTo("auth.error.emailUnverified"));
        var link = Fragment(_app.Mail.Sent.Single(m => m.Kind == "confirm").Link);
        Assert.That((await c.PostAsJsonAsync("/auth/confirm-email", new { userId = link["uid"], token = link["token"] })).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await c.SignIn("new@example.test", Pw)).StatusCode, Is.EqualTo(HttpStatusCode.Redirect));
    }

    [Test]
    public async Task Sign_in_replaces_the_session()
    {
        await _app.SeedUser("a@example.test");
        var c = _app.Client();
        var first = SessionCookie(await c.SignIn("a@example.test", Pw));
        var second = SessionCookie(await c.SignIn("a@example.test", Pw));
        Assert.That(second, Is.Not.EqualTo(first));
        var stale = _app.Client(cookies: false);
        stale.DefaultRequestHeaders.Add("Cookie", first);
        Assert.That((await stale.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task Two_sign_ins_leave_one_session_row()
    {
        var user = await _app.SeedUser("a@example.test");
        var c = _app.Client();
        await c.SignIn("a@example.test", Pw);
        await c.SignIn("a@example.test", Pw);
        Assert.That(await _app.With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.CountAsync(s => s.UserId == user.Id)), Is.EqualTo(1));
    }

    [Test]
    public async Task A_planted_cookie_never_becomes_the_signed_in_session()
    {
        await _app.SeedUser("attacker@example.test");
        var victim = await _app.SeedUser("victim@example.test");
        Task<List<string>> Keys() => _app.With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.Select(s => s.Key).ToListAsync());
        var planted = SessionCookie(await _app.Client().SignIn("attacker@example.test", Pw)); // the attacker's own cookie, planted in the victim's browser
        var before = await Keys();
        var browser = _app.Client(cookies: false);
        browser.DefaultRequestHeaders.Add("Cookie", planted);
        var signedIn = await browser.SignIn("victim@example.test", Pw);
        Assert.That(SessionCookie(signedIn), Is.Not.EqualTo(planted));
        var victimKey = await _app.With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.Where(s => s.UserId == victim.Id).Select(s => s.Key).SingleAsync());
        Assert.That(before, Does.Not.Contain(victimKey));
        Assert.That((await browser.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized)); // the planted session is gone too
    }

    [Test]
    public async Task A_session_key_never_changes_users()
    {
        // What a sign-in endpoint without StartsSession would do: renew the planted key with the victim's ticket.
        var store = _app.Services.GetRequiredService<EfTicketStore>();
        static AuthenticationTicket Ticket(string userId) =>
            new(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test")), IdentityConstants.ApplicationScheme);
        var key = await store.StoreAsync(Ticket("attacker"));
        Assert.ThrowsAsync<InvalidOperationException>(() => store.RenewAsync(key, Ticket("victim")));
        Assert.That(await _app.With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.Where(s => s.Key == key).Select(s => s.UserId).SingleAsync()), Is.EqualTo("attacker"));
        await store.RenewAsync(key, Ticket("attacker")); // the control: the same user renews
    }

    [Test]
    public async Task A_password_change_signs_out_every_other_session_at_once()
    {
        await _app.SeedUser("a@example.test");
        var here = _app.Client(); await here.SignIn("a@example.test", Pw);
        var there = _app.Client(); await there.SignIn("a@example.test", Pw);
        var changed = await here.PostAsJsonAsync("/account/password", new { current = Pw, @new = AuthApiFactory.NewTestPhrase });
        Assert.That(changed.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await there.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        Assert.That((await here.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task New_recovery_codes_sign_out_every_other_session()
    {
        var user = await _app.SeedUser("a@example.test", twoFactor: true);
        var seeded = await _app.NewRecoveryCodes(user);
        var here = await SignedInWithCode("a@example.test", seeded[0]);
        var there = await SignedInWithCode("a@example.test", seeded[1]);
        var res = await here.PostAsync("/account/mfa/codes", null);
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("recoveryCodes").GetArrayLength(), Is.EqualTo(10));
        Assert.That((await there.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        Assert.That((await here.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Every_recovery_code_works_once_and_the_rest_keep_working()
    {
        var user = await _app.SeedUser("a@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(user);
        foreach (var code in codes[..3]) await SignedInWithCode("a@example.test", code); // throws on a refused code
        var again = _app.Client(); await again.SignIn("a@example.test", Pw);
        Assert.That(await ErrorOf(await again.PostAsJsonAsync("/auth/recovery", new { code = codes[0] })), Is.EqualTo("auth.error.recoveryCodeWrong"));
        Assert.That(await CodesLeft(user), Is.EqualTo(7));
    }

    [Test]
    public async Task New_recovery_codes_need_a_second_factor_on_the_account()
    {
        var user = await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        Assert.That(await Said(await c.PostAsync("/account/mfa/codes", null)), Is.EqualTo("""400 {"error":"auth.error.secondFactorRequired"}"""));
        Assert.That(await CodesLeft(user), Is.Zero);
    }

    // The passkey ceremony can't run headless, so these seed the passkey and call what AddPasskey calls after it.
    private Task<(string[]? Issued, bool OldCodeWorks)> AddedFactor(AppUser user, string oldCode) => _app.With(async sp =>
    {
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        var u = (await users.FindByIdAsync(user.Id))!;
        var issued = await RecoveryCodes.IssueFirstAsync(users, u);
        return (issued, (await users.RedeemTwoFactorRecoveryCodeAsync(u, oldCode)).Succeeded);
    });

    [Test]
    public async Task The_first_second_factor_gets_recovery_codes_once()
    {
        var user = await _app.SeedUser("a@example.test");
        await _app.SeedPasskey(user);
        var (first, _) = await AddedFactor(user, "none");
        Assert.That(first, Has.Length.EqualTo(10));
        await _app.SeedPasskey(user);
        var (second, firstStillWorks) = await AddedFactor(user, first![0]);
        Assert.That((second, firstStillWorks), Is.EqualTo(((string[]?)null, true))); // a later factor keeps the codes the user has
    }

    [Test]
    public async Task Codes_made_before_the_first_factor_stop_working_when_it_is_added()
    {
        // Codes an account got while it had no factor (left over after every factor went, or minted by a thief) never carry over.
        var user = await _app.SeedUser("a@example.test");
        var old = await _app.NewRecoveryCodes(user);
        await _app.SeedPasskey(user);
        var (issued, oldWorks) = await AddedFactor(user, old[0]);
        Assert.That((issued?.Length, oldWorks), Is.EqualTo(((int?)10, false)));
    }

    [Test]
    public async Task Lists_the_account_s_passkeys_with_the_id_the_remove_button_sends()
    {
        var user = await _app.SeedUser("a@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(user);
        var laptop = await _app.SeedPasskey(user, "Laptop");
        var phone = await _app.SeedPasskey(user);
        await _app.SeedPasskey(await _app.SeedUser("b@example.test")); // someone else's never shows
        var c = await SignedInWithCode("a@example.test", codes[0]); // removing a factor needs a session that used one
        var list = (await c.GetFromJsonAsync<JsonElement>("/account/passkeys")).EnumerateArray().ToList();
        Assert.That(list.Select(p => (p.GetProperty("id").GetString(), p.GetProperty("name").GetString())),
            Is.EquivalentTo(new[] { (Base64Url.EncodeToString(laptop), "Laptop"), (Base64Url.EncodeToString(phone), (string?)null) }));
        Assert.That(list.Select(p => p.GetProperty("createdAt").GetDateTimeOffset()), Has.All.EqualTo(_app.Clock.GetUtcNow()));
        Assert.That((await c.DeleteAsync("/account/passkey/" + list[0].GetProperty("id").GetString())).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await c.GetFromJsonAsync<JsonElement>("/account/passkeys")).GetArrayLength(), Is.EqualTo(1));
    }

    [Test]
    public async Task Starting_TOTP_enrolment_signs_nobody_out()
    {
        await _app.SeedUser("a@example.test");
        var here = _app.Client(); await here.SignIn("a@example.test", Pw);
        var there = _app.Client(); await there.SignIn("a@example.test", Pw);
        Assert.That((await here.PostAsJsonAsync("/account/mfa/enrol", new { })).StatusCode, Is.EqualTo(HttpStatusCode.OK)); // and never finished
        _app.Clock.Advance(TimeSpan.FromMinutes(31)); // past Identity's 30-minute security stamp check
        Assert.That(((await here.GetAsync("/api/notes")).StatusCode, (await there.GetAsync("/api/notes")).StatusCode), Is.EqualTo((HttpStatusCode.OK, HttpStatusCode.OK)));
    }

    [Test]
    public async Task Removing_an_unknown_passkey_changes_nothing()
    {
        // Removing a factor needs a session that used one, so both sign in with a recovery code.
        var user = await _app.SeedUser("a@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(user);
        var known = await _app.SeedPasskey(user);
        var here = await SignedInWithCode("a@example.test", codes[0]);
        var there = await SignedInWithCode("a@example.test", codes[1]);
        var unknown = await here.DeleteAsync("/account/passkey/" + Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(16)));
        Assert.That(await Said(unknown), Is.EqualTo("""400 {"error":"auth.error.passkeyUnknown"}"""));
        Assert.That((await there.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK)); // no revocation
        Assert.That(await _app.With(sp => sp.GetRequiredService<AppDbContext>().AuthEvents.CountAsync(e => e.Kind == "passkey-removed")), Is.Zero);
        // The control: the real one goes, and the other session with it.
        Assert.That((await here.DeleteAsync("/account/passkey/" + Base64Url.EncodeToString(known))).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await there.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task A_reset_link_alone_works_only_without_a_second_factor()
    {
        await _app.SeedUser("plain@example.test");
        await _app.SeedUser("mfa@example.test", twoFactor: true);
        var c = _app.Client();
        async Task<HttpResponseMessage> Confirm(string email)
        {
            await c.PostAsJsonAsync("/auth/reset", new { email });
            var link = Fragment(_app.Mail.Sent.Last(m => m.To == email && m.Kind == "reset").Link);
            return await c.PostAsJsonAsync("/auth/reset/confirm", new { userId = link["uid"], token = link["token"], newPassword = NewPw });
        }
        Assert.That((await Confirm("plain@example.test")).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        var refused = await Confirm("mfa@example.test");
        Assert.That(refused.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(await ErrorOf(refused), Is.EqualTo("auth.error.secondFactorNeeded"));
    }

    [Test]
    public async Task A_bad_reset_link_fails_before_any_factor_is_checked()
    {
        var mfa = await _app.SeedUser("mfa@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(mfa);
        var res = await _app.Client().PostAsJsonAsync("/auth/reset/confirm", new { userId = mfa.Id, token = "bm90LWEtdG9rZW4", code = codes[0], newPassword = NewPw });
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(await ErrorOf(res), Is.EqualTo("auth.error.expiredLink"));
        var left = await _app.With(async sp =>
        {
            var users = sp.GetRequiredService<UserManager<AppUser>>();
            return await users.CountRecoveryCodesAsync((await users.FindByIdAsync(mfa.Id))!);
        });
        Assert.That(left, Is.EqualTo(10)); // the code was never tried, so it was never spent
    }

    [Test]
    public async Task A_reset_with_the_link_and_a_recovery_code_spends_the_code_and_signs_out_everywhere()
    {
        var mfa = await _app.SeedUser("mfa@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(mfa);
        var signedIn = await SignedInWithCode("mfa@example.test", codes[0]);
        var c = _app.Client();
        await c.PostAsJsonAsync("/auth/reset", new { email = "mfa@example.test" });
        var link = Fragment(_app.Mail.Sent.Last(m => m.Kind == "reset").Link);
        var res = await c.PostAsJsonAsync("/auth/reset/confirm", new { userId = link["uid"], token = link["token"], code = codes[1], newPassword = NewPw });
        Assert.That(await Said(res), Is.EqualTo("204 "));
        Assert.That(await CodesLeft(mfa), Is.EqualTo(8)); // one at sign-in, one here
        Assert.That((await signedIn.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        // The new password works and still asks for the second step, where the spent code is refused.
        var next = _app.Client();
        Assert.That(await (await next.SignIn("mfa@example.test", NewPw)).Content.ReadAsStringAsync(), Does.Contain("mfa"));
        Assert.That(await ErrorOf(await next.PostAsJsonAsync("/auth/recovery", new { code = codes[1] })), Is.EqualTo("auth.error.recoveryCodeWrong"));
    }

    [Test]
    public async Task A_key_from_an_unfinished_enrolment_is_no_factor_in_a_reset()
    {
        var owner = await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        var key = (await (await c.PostAsJsonAsync("/account/mfa/enrol", new { })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("key").GetString()!;
        await _app.SeedPasskey(owner); // the account's real factor
        var code = Totp.Code(key, _app.Clock.GetUtcNow());
        // The code is right for the stored key, so only TwoFactorEnabled can refuse it.
        Assert.That(await _app.With(async sp =>
        {
            var users = sp.GetRequiredService<UserManager<AppUser>>();
            return await users.VerifyTwoFactorTokenAsync((await users.FindByIdAsync(owner.Id))!, users.Options.Tokens.AuthenticatorTokenProvider, code);
        }), Is.True);
        await c.PostAsJsonAsync("/auth/reset", new { email = "a@example.test" });
        var link = Fragment(_app.Mail.Sent.Last(m => m.Kind == "reset").Link);
        var res = await c.PostAsJsonAsync("/auth/reset/confirm", new { userId = link["uid"], token = link["token"], code, newPassword = NewPw });
        Assert.That(await Said(res), Is.EqualTo("""400 {"error":"auth.error.wrongCode"}"""));
    }

    // The new key can't be saved: the database refuses a new token row once switched on.
    private sealed class FailingTokenWrites : SaveChangesInterceptor
    {
        public volatile bool On;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default) =>
            On && e.Context!.ChangeTracker.Entries<IdentityUserToken<string>>().Any(x => x.State == EntityState.Added)
                ? throw new DbUpdateConcurrencyException("db down") : base.SavingChangesAsync(e, result, ct);
    }

    [Test]
    public async Task Answers_503_when_the_new_authenticator_key_cannot_be_saved()
    {
        await _app.SeedUser("a@example.test");
        var failing = new FailingTokenWrites();
        using var broken = _app.WithWebHostBuilder(b => b.ConfigureServices(s => s.ConfigureDbContext<AppDbContext>(o => o.AddInterceptors(failing))));
        var c = AuthApiFactory.ClientOf(broken); await c.SignIn("a@example.test", Pw);
        failing.On = true;
        Assert.That(await Said(await c.PostAsJsonAsync("/account/mfa/enrol", new { })), Is.EqualTo("""503 {"error":"auth.error.unavailable"}"""));
    }

    [Test]
    public async Task A_rejected_new_password_spends_no_recovery_code()
    {
        var mfa = await _app.SeedUser("mfa@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(mfa);
        var c = _app.Client();
        await c.PostAsJsonAsync("/auth/reset", new { email = "mfa@example.test" });
        var link = Fragment(_app.Mail.Sent.Last(m => m.Kind == "reset").Link);
        var tiny = Pw[..5]; // too short for the validators
        var res = await c.PostAsJsonAsync("/auth/reset/confirm", new { userId = link["uid"], token = link["token"], code = codes[0], newPassword = tiny });
        Assert.That((res.StatusCode, await ErrorOf(res)), Is.EqualTo((HttpStatusCode.BadRequest, "auth.error.passwordRejected")));
        var left = await _app.With(async sp =>
        {
            var users = sp.GetRequiredService<UserManager<AppUser>>();
            return await users.CountRecoveryCodesAsync((await users.FindByIdAsync(mfa.Id))!);
        });
        Assert.That(left, Is.EqualTo(10));
    }

    [Test]
    public async Task A_tenant_admin_needs_a_second_step_before_any_data()
    {
        await _app.SeedUser("plain-admin@example.test", role: Role.TenantAdmin);
        var mfaAdmin = await _app.SeedUser("mfa-admin@example.test", role: Role.TenantAdmin, twoFactor: true);
        var passwordOnly = _app.Client(); await passwordOnly.SignIn("plain-admin@example.test", Pw);
        var refused = await passwordOnly.GetAsync("/api/notes");
        Assert.That(refused.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That(await ErrorOf(refused), Is.EqualTo("second_factor_required"));
        // The second step here is a recovery code: TOTP math isn't in the BCL, and both end in the same "second-factor" session.
        var codes = await _app.NewRecoveryCodes(mfaAdmin);
        var strong = _app.Client();
        Assert.That(await (await strong.SignIn("mfa-admin@example.test", Pw)).Content.ReadAsStringAsync(), Does.Contain("mfa"));
        Assert.That((await strong.PostAsJsonAsync("/auth/recovery", new { code = codes[0] })).StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await strong.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task A_tenant_admin_with_a_password_session_can_switch_to_a_passkey()
    {
        // The bootstrap: a passkey enrolled from a password session, then a passkey sign-in from the same browser.
        var admin = await _app.SeedUser("admin@example.test", role: Role.TenantAdmin);
        using var passkey = new SoftPasskey();
        await _app.SeedPasskey(admin, key: passkey);
        var c = _app.Client(); await c.SignIn("admin@example.test", Pw);
        Assert.That(await Said(await c.GetAsync("/api/notes")), Is.EqualTo(SecondFactorRequired));
        var options = await c.PostAsync("/auth/passkey/request-options", null);
        var json = await options.Content.ReadAsStringAsync();
        Assert.That(options.StatusCode, Is.EqualTo(HttpStatusCode.OK), json);
        var credential = passkey.Assertion(json, AuthApiFactory.Origin, "localhost", admin.Id);
        Assert.That(await Said(await c.PostAsJsonAsync("/auth/passkey/sign-in", new { credential })), Is.EqualTo("204 "));
        Assert.That((await c.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    private const string SecondFactorRequired = """403 {"error":"second_factor_required"}""";

    [TestCase(Role.TenantAdmin)]
    [TestCase(Role.Member)]
    public async Task A_password_alone_cannot_change_the_factors_of_an_account_that_has_one(Role role)
    {
        // A passkey doesn't turn TwoFactorEnabled on, so this account signs in with the password alone.
        var owner = await _app.SeedUser("passkey@example.test", role: role);
        var passkeyId = await _app.SeedPasskey(owner);
        var stolen = _app.Client(); await stolen.SignIn("passkey@example.test", Pw);
        foreach (var path in new[] { "/account/mfa/enrol", "/account/passkey/creation-options", "/account/passkey", "/account/mfa/codes", "/account/mfa/disable" })
        {
            Assert.That(await Said(await stolen.PostAsJsonAsync(path, new { })), Is.EqualTo(SecondFactorRequired), path);
        }
        // Removing the passkey would leave an account with no factor, open to all of the above.
        Assert.That(await Said(await stolen.DeleteAsync("/account/passkey/" + Base64Url.EncodeToString(passkeyId))), Is.EqualTo(SecondFactorRequired));
        Assert.That(await _app.With(sp => sp.GetRequiredService<AppDbContext>().Set<IdentityUserPasskey<string>>().CountAsync(p => p.UserId == owner.Id)), Is.EqualTo(1));
        // The control: an account with no factor yet reaches setup with the password alone.
        await _app.SeedUser("new@example.test", role: role);
        var fresh = _app.Client(); await fresh.SignIn("new@example.test", Pw);
        Assert.That((await fresh.PostAsJsonAsync("/account/mfa/enrol", new { })).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task A_member_with_a_second_factor_needs_it_for_new_recovery_codes()
    {
        // A code stands in for the factor in a reset, so a password alone must not mint fresh ones.
        var member = await _app.SeedUser("passkey-member@example.test");
        await _app.SeedPasskey(member);
        var passwordOnly = _app.Client(); await passwordOnly.SignIn("passkey-member@example.test", Pw);
        Assert.That(await Said(await passwordOnly.PostAsync("/account/mfa/codes", null)), Is.EqualTo(SecondFactorRequired));
        Assert.That((await passwordOnly.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK)); // a member's data stays open
        // The control: a session that used the second step gets them.
        var mfa = await _app.SeedUser("mfa-member@example.test", twoFactor: true);
        var codes = await _app.NewRecoveryCodes(mfa);
        var strong = _app.Client(); await strong.SignIn("mfa-member@example.test", Pw);
        await strong.PostAsJsonAsync("/auth/recovery", new { code = codes[0] });
        Assert.That((await strong.PostAsync("/account/mfa/codes", null)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Failed_sign_ins_slow_one_account_without_locking_it()
    {
        await _app.SeedUser("a@example.test");
        var fromA = _app.Client(); fromA.DefaultRequestHeaders.Add("X-Test-Client-Ip", "198.51.100.1");
        for (var i = 0; i < 5; i++)
            Assert.That((await fromA.SignIn("a@example.test", AuthApiFactory.NewTestPhrase)).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        var sixth = await fromA.SignIn("a@example.test", AuthApiFactory.NewTestPhrase);
        Assert.That(sixth.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That(sixth.Headers.RetryAfter?.Delta, Is.EqualTo(TimeSpan.FromSeconds(1)));
        _app.Clock.Advance(TimeSpan.FromSeconds(1));
        var fromB = _app.Client(); fromB.DefaultRequestHeaders.Add("X-Test-Client-Ip", "198.51.100.2");
        Assert.That((await fromB.SignIn("a@example.test", Pw)).StatusCode, Is.EqualTo(HttpStatusCode.Redirect));
    }

    [Test]
    public async Task A_burst_of_wrong_sign_ins_gets_one_attempt_through_per_gap()
    {
        await _app.SeedUser("a@example.test");
        var c = _app.Client();
        for (var i = 0; i < SignInThrottle.FreeFailures; i++) await c.SignIn("a@example.test", NewPw);
        _app.Clock.Advance(TimeSpan.FromSeconds(1)); // the first gap is over; the clock stands still during the burst
        var burst = await Task.WhenAll(Enumerable.Range(0, 10).Select(_ => c.SignIn("a@example.test", NewPw)));
        var through = burst.Count(r => r.StatusCode == HttpStatusCode.BadRequest);
        var held = burst.Count(r => r.StatusCode == HttpStatusCode.TooManyRequests);
        Assert.That((through, held), Is.EqualTo((1, 9)));
    }

    [Test]
    public async Task Both_unicode_spellings_of_an_email_share_one_throttle_bucket()
    {
        var c = _app.Client();
        for (var i = 0; i < SignInThrottle.FreeFailures; i++) await c.SignIn("jos\u00e9@example.test", NewPw); // NFC: the accented e as one code point
        Assert.That((await c.SignIn("jose\u0301@example.test", NewPw)).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests)); // NFD: e plus a combining accent
    }

    [Test]
    public async Task The_ip_limiter_answers_429_with_a_key_and_Retry_After()
    {
        var c = _app.Client();
        HttpResponseMessage last = null!;
        for (var i = 0; i < 21; i++) last = await c.PostAsJsonAsync("/auth/reset", new { email = $"n{i}@example.test" });
        Assert.That(last.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That(await ErrorOf(last), Is.EqualTo("auth.error.tooManyAttempts"));
        Assert.That(last.Headers.RetryAfter, Is.Not.Null);
    }

    [Test]
    public async Task A_failing_session_lookup_returns_503()
    {
        await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        _app.KeepAlive.Close(); // the last open connection goes, and the in-memory database with it
        Assert.That((await c.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.ServiceUnavailable));
    }

    // The session row loads, then the user row fails: the database refuses reads of AspNetUsers once switched on.
    private sealed class FailingUserReads : DbCommandInterceptor
    {
        public volatile bool On;
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData e, InterceptionResult<DbDataReader> result, CancellationToken ct = default) =>
            On && command.CommandText.Contains("\"AspNetUsers\"") ? throw new InvalidOperationException("db down") : base.ReaderExecutingAsync(command, e, result, ct);
    }

    [Test]
    public async Task Answers_503_when_loading_the_user_context_fails()
    {
        await _app.SeedUser("a@example.test");
        var failing = new FailingUserReads();
        using var broken = _app.WithWebHostBuilder(b => b.ConfigureServices(s => s.ConfigureDbContext<AppDbContext>(o => o.AddInterceptors(failing))));
        var c = AuthApiFactory.ClientOf(broken); await c.SignIn("a@example.test", Pw);
        failing.On = true;
        var res = await c.GetAsync("/api/notes");
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.ServiceUnavailable));
        Assert.That(await ErrorOf(res), Is.EqualTo("unavailable"));
    }

    [Test]
    public async Task Ends_a_session_older_than_30_days()
    {
        var user = await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        await _app.AgeSessions(user.Id, TimeSpan.FromDays(31)); // signed in 31 days ago, active since
        Assert.That((await c.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        Assert.That(await _app.With(sp => sp.GetRequiredService<AppDbContext>().UserSessions.CountAsync(s => s.UserId == user.Id)), Is.Zero);
    }

    // Ending the aged session fails: the database refuses to delete a session row.
    private sealed class FailingSessionDeletes : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default) =>
            e.Context!.ChangeTracker.Entries<UserSession>().Any(x => x.State == EntityState.Deleted) ? throw new DbUpdateException("db down") : base.SavingChangesAsync(e, result, ct);
    }

    [Test]
    public async Task Answers_503_and_logs_when_ending_an_aged_session_fails()
    {
        var user = await _app.SeedUser("a@example.test");
        using var broken = _app.WithWebHostBuilder(b => b.ConfigureServices(s => s.ConfigureDbContext<AppDbContext>(o => o.AddInterceptors(new FailingSessionDeletes()))));
        var c = AuthApiFactory.ClientOf(broken); await c.SignIn("a@example.test", Pw);
        await _app.AgeSessions(user.Id, TimeSpan.FromDays(31));
        var res = await c.GetAsync("/api/notes");
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.ServiceUnavailable));
        Assert.That(await ErrorOf(res), Is.EqualTo("unavailable"));
        Assert.That(_app.Logs.Lines.Where(l => l.Contains("auth.session.revokeFailed")), Is.EqualTo(RevokeFailedLog));
    }

    [Test]
    public async Task Sends_a_fresh_cookie_on_an_app_route()
    {
        await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        _app.Clock.Advance(TimeSpan.FromDays(4)); // past half of the 7-day window
        var res = await c.GetAsync("/api/notes");
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(SetsSessionCookie(res), Is.True);
        _app.Clock.Advance(TimeSpan.FromDays(4)); // 8 days after sign-in, 4 after the last request
        Assert.That((await c.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Sends_a_fresh_cookie_with_the_second_factor_403()
    {
        await _app.SeedUser("admin@example.test", role: Role.TenantAdmin);
        var c = _app.Client(); await c.SignIn("admin@example.test", Pw);
        _app.Clock.Advance(TimeSpan.FromDays(4));
        var res = await c.GetAsync("/api/notes");
        Assert.That((res.StatusCode, SetsSessionCookie(res)), Is.EqualTo((HttpStatusCode.Forbidden, true)));
    }

    [Test]
    public async Task Refuses_a_form_style_POST_or_PATCH_from_another_origin_and_keeps_the_session()
    {
        var owner = await _app.SeedUser("owner@example.test");
        var note = await _app.SeedNote(owner.Id, "t1");
        var c = _app.Client(); await c.SignIn("owner@example.test", Pw);
        HttpRequestMessage Form(HttpMethod method, string path, string origin)
        {
            var req = new HttpRequestMessage(method, path) { Content = new StringContent("title=x", Encoding.UTF8, "application/x-www-form-urlencoded") };
            req.Headers.Add("Origin", origin); // replaces the client's default Origin for this request
            return req;
        }
        Assert.That((await c.SendAsync(Form(HttpMethod.Post, "/auth/sign-out", "https://evil.example"))).StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That((await c.SendAsync(Form(HttpMethod.Patch, $"/api/notes/{note}", "https://evil.example"))).StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
        Assert.That((await c.GetAsync("/api/notes")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        // The control: the same origin passes the check, and the endpoint refuses a body that isn't JSON.
        Assert.That((await c.SendAsync(Form(HttpMethod.Patch, $"/api/notes/{note}", AuthApiFactory.Origin))).StatusCode, Is.EqualTo(HttpStatusCode.UnsupportedMediaType));
    }

    [Test]
    public async Task Answers_413_to_an_oversized_body_on_an_auth_or_account_route()
    {
        _app.UseKestrel(0); // TestServer can't cap a request body, so this test runs on Kestrel
        // Kestrel's client follows redirects and keeps cookies itself, and a Secure cookie never goes over plain HTTP. So
        // this client does neither, and the session cookie goes by hand.
        var c = new HttpClient(new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false }) { BaseAddress = _app.CreateClient().BaseAddress };
        c.DefaultRequestHeaders.Host = "localhost"; // AllowedHosts
        var big = new string('x', 17 * 1024);
        var res = await c.PostAsJsonAsync("/auth/sign-up", new { email = "big@example.test", password = Pw, name = big });
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.RequestEntityTooLarge)); // Kestrel's own answer, with no body
        Assert.That((await c.PostAsJsonAsync("/auth/reset", new { email = "x@example.test", name = new string('x', 8 * 1024) })).StatusCode, Is.EqualTo(HttpStatusCode.Accepted)); // room for a WebAuthn response
        Assert.That(await _app.With(sp => sp.GetRequiredService<UserManager<AppUser>>().FindByEmailAsync("big@example.test")), Is.Null);
        await _app.SeedUser("a@example.test");
        c.DefaultRequestHeaders.Add("Cookie", SessionCookie(await c.SignIn("a@example.test", Pw)));
        var account = await c.PostAsJsonAsync("/account/password", new { current = Pw, @new = NewPw, name = big });
        Assert.That(account.StatusCode, Is.EqualTo(HttpStatusCode.RequestEntityTooLarge));
        Assert.That((await c.SignIn("a@example.test", NewPw)).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest)); // the password never changed
    }

    [Test]
    public async Task The_cleanup_runs_at_start_and_drops_what_is_past_its_cap()
    {
        var now = _app.Clock.GetUtcNow().UtcDateTime;
        _app.SeedBeforeStart(db =>
        {
            db.UserSessions.AddRange(
                new UserSession { Key = "old", UserId = "u", SignInMethod = "password", CreatedAt = now.AddDays(-31), LastSeenAt = now, ExpiresAt = now.AddDays(1) },
                new UserSession { Key = "new", UserId = "u", SignInMethod = "password", CreatedAt = now, LastSeenAt = now, ExpiresAt = now.AddDays(7) });
            db.AuthEvents.AddRange(new AuthEvent { UserId = "u", Kind = "sign-in", At = now.AddDays(-91) }, new AuthEvent { UserId = "u", Kind = "sign-in", At = now.AddDays(-10) });
        });
        Task<(int Sessions, int Events)> Left() => _app.With(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            return (await db.UserSessions.CountAsync(), await db.AuthEvents.CountAsync());
        });
        for (var i = 0; i < 20 && await Left() != (1, 1); i++) await Task.Delay(100); // the first run starts with the host
        Assert.That(await Left(), Is.EqualTo((1, 1)));
    }

    [Test]
    public async Task The_account_export_holds_the_account_s_own_data()
    {
        await _app.SeedUser("a@example.test");
        var c = _app.Client(); await c.SignIn("a@example.test", Pw);
        var export = await c.GetFromJsonAsync<JsonElement>("/account/export");
        Assert.That(export.EnumerateObject().Select(p => p.Name), Is.EqualTo(ExportKeys));
        Assert.That(export.GetProperty("email").GetString(), Is.EqualTo("a@example.test"));
        Assert.That(export.GetProperty("sessions").GetArrayLength(), Is.EqualTo(1));
        Assert.That(export.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("kind").GetString()), Does.Contain("sign-in"));
    }
}
