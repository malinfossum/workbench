namespace App.Tests.Integration;

using static ClientExtensions;

// The Notes routes of the spec, over HTTP with a real session: a new factory per test, signed in as the owner.
public class NotesApiTests
{
    private const string Pw = AuthApiFactory.TestPhrase;
    private AuthApiFactory _app = null!;
    private AppUser _ownerUser = null!;
    private HttpClient _owner = null!;
    private List<HttpClient> _clients = null!;

    [SetUp]
    public async Task SetUp()
    {
        _app = new AuthApiFactory();
        _clients = [];
        _ownerUser = await _app.SeedUser("owner@example.test");
        _owner = await As("owner@example.test");
    }

    [TearDown]
    public void TearDown()
    {
        foreach (var c in _clients)
        {
            c.Dispose();
        }
        _app.Dispose();
    }

    private async Task<HttpClient> As(string email)
    {
        var c = Anonymous();
        await c.SignIn(email, Pw);
        return c;
    }

    private HttpClient Anonymous()
    {
        var c = _app.Client();
        _clients.Add(c);
        return c;
    }

    private static Task<HttpResponseMessage> PatchRaw(HttpClient c, int id, string json) =>
        c.PatchAsync($"/api/notes/{id}", new StringContent(json, Encoding.UTF8, "application/json"));

    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    // One read of the body: the stream of a TestServer response can be read only once.
    private static async Task<(string? Error, string? Field)> ErrorAndField(HttpResponseMessage r)
    {
        var body = await Json(r);
        return (body.GetProperty("error").GetString(), body.GetProperty("field").GetString());
    }

    private async Task<int> CreateViaApi(string title = "First")
    {
        var res = await _owner.PostAsJsonAsync("/api/notes", new { title, body = "Text" });
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Created), await Said(res));
        return (await Json(res)).GetProperty("id").GetInt32();
    }

    private static async Task<JsonElement> Read(HttpClient c, int id)
    {
        var res = await c.GetAsync($"/api/notes/{id}");
        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.OK), await Said(res));
        return await Json(res);
    }

    private async Task SetConfirmed(string userId, bool confirmed)
    {
        var rows = await _app.With(sp =>
            sp.GetRequiredService<AppDbContext>().Users.Where(u => u.Id == userId).ExecuteUpdateAsync(u => u.SetProperty(x => x.EmailConfirmed, confirmed)));
        Assert.That(rows, Is.EqualTo(1));
    }

    [Test]
    public async Task Post_then_get_round_trips()
    {
        var created = await _owner.PostAsJsonAsync("/api/notes", new { title = "Hello", body = "World" });

        Assert.That(created.StatusCode, Is.EqualTo(HttpStatusCode.Created), await Said(created));
        var id = (await Json(created)).GetProperty("id").GetInt32();
        Assert.That(created.Headers.Location?.AbsolutePath, Is.EqualTo($"/api/notes/{id}"));
        var note = await Read(_owner, id);
        Assert.That(note.GetProperty("title").GetString(), Is.EqualTo("Hello"));
        Assert.That(note.GetProperty("body").GetString(), Is.EqualTo("World"));
        Assert.That(note.GetProperty("can").GetRawText(), Is.EqualTo("""{"edit":true,"delete":true}"""));
        Assert.That(note.GetProperty("members").GetArrayLength(), Is.Zero);
    }

    [Test]
    public async Task Post_without_title_returns_problem_details_400()
    {
        var res = await _owner.PostAsJsonAsync("/api/notes", new { body = "no title" });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await Said(res));
        Assert.That(res.Content.Headers.ContentType?.MediaType, Is.EqualTo("application/problem+json"));
        Assert.That((await Json(res)).GetProperty("status").GetInt32(), Is.EqualTo(400));
    }

    [Test]
    public async Task Get_unknown_id_returns_404()
    {
        var res = await _owner.GetAsync("/api/notes/9999");

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.NotFound), await Said(res));
        Assert.That(await ErrorOf(res), Is.EqualTo("not_found"));
    }

    [Test]
    public async Task A_404_keeps_its_status_when_the_client_does_not_accept_json()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/notes/9999");
        req.Headers.Add("Accept", "text/html");

        var res = await _owner.SendAsync(req);

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.NotFound), await Said(res));
        Assert.That(await res.Content.ReadAsStringAsync(), Is.Empty); // the handler writes nothing when JSON is ruled out
    }

    [Test]
    public async Task Patch_updates_and_returns_the_note()
    {
        var id = await CreateViaApi();
        var before = await Read(_owner, id);
        _app.Clock.Advance(TimeSpan.FromMinutes(5));

        var res = await _owner.PatchAsJsonAsync($"/api/notes/{id}", new { title = "Renamed", body = "Edited" });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.OK), await Said(res));
        var after = await Json(res);
        Assert.That(after.GetProperty("title").GetString(), Is.EqualTo("Renamed"));
        Assert.That(after.GetProperty("body").GetString(), Is.EqualTo("Edited"));
        Assert.That(after.GetProperty("updatedAt").GetDateTime(), Is.GreaterThan(before.GetProperty("updatedAt").GetDateTime()));
        Assert.That(after.GetProperty("createdAt").GetDateTime(), Is.EqualTo(before.GetProperty("createdAt").GetDateTime()));
        var persisted = await Read(_owner, id);
        Assert.That(persisted.GetProperty("title").GetString(), Is.EqualTo("Renamed"));
        Assert.That(persisted.GetProperty("body").GetString(), Is.EqualTo("Edited"));
    }

    [Test]
    public async Task A_member_may_edit_the_title_and_body()
    {
        var member = await _app.SeedUser("member@example.test");
        var id = await _app.SeedNote(_ownerUser.Id, "t1", member.Id);
        var c = await As("member@example.test");

        var res = await c.PatchAsJsonAsync($"/api/notes/{id}", new { title = "By a member", body = "Edited by a member" });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.OK), await Said(res));
        var after = await Json(res);
        Assert.That(after.GetProperty("title").GetString(), Is.EqualTo("By a member"));
        Assert.That(after.GetProperty("body").GetString(), Is.EqualTo("Edited by a member"));
        var persisted = await Read(_owner, id);
        Assert.That(persisted.GetProperty("title").GetString(), Is.EqualTo("By a member"));
        Assert.That(persisted.GetProperty("body").GetString(), Is.EqualTo("Edited by a member"));
    }

    [Test]
    public async Task Delete_returns_204_then_get_returns_404()
    {
        var id = await CreateViaApi();

        var deleted = await _owner.DeleteAsync($"/api/notes/{id}");

        Assert.That(deleted.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(deleted));
        Assert.That((await _owner.GetAsync($"/api/notes/{id}")).StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Every_notes_route_needs_a_session()
    {
        var anon = Anonymous();
        (string What, Func<Task<HttpResponseMessage>> Send)[] routes =
        [
            ("list", () => anon.GetAsync("/api/notes")),
            ("get", () => anon.GetAsync("/api/notes/1")),
            ("create", () => anon.PostAsJsonAsync("/api/notes", new { title = "x" })),
            ("patch", () => anon.PatchAsJsonAsync("/api/notes/1", new { title = "x" })),
            ("delete", () => anon.DeleteAsync("/api/notes/1")),
            ("share", () => anon.PostAsJsonAsync("/api/notes/1/members", new { email = "a@example.test" })),
            ("unshare", () => anon.DeleteAsync("/api/notes/1/members/someone")),
        ];
        foreach (var (what, send) in routes)
        {
            var res = await send();
            Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), $"{what}: {await Said(res)}");
        }
    }

    [Test]
    public async Task A_tenant_admin_without_a_second_factor_is_stopped_by_the_gate()
    {
        await _app.SeedUser("admin@example.test", role: Role.TenantAdmin);
        var c = await As("admin@example.test");

        var res = await c.GetAsync("/api/notes");

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(res));
        Assert.That(await ErrorOf(res), Is.EqualTo("second_factor_required"));
    }

    [Test]
    public async Task A_form_style_PATCH_from_another_origin_is_refused()
    {
        var id = await _app.SeedNote(_ownerUser.Id, "t1");
        using var req = new HttpRequestMessage(HttpMethod.Patch, $"/api/notes/{id}")
        {
            Content = new StringContent("title=Hijacked", Encoding.UTF8, "application/x-www-form-urlencoded"),
        };
        req.Headers.Add("Origin", "https://evil.example"); // replaces the client's default Origin for this request

        var res = await _owner.SendAsync(req);

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(res));
        Assert.That(await ErrorOf(res), Is.EqualTo("forbidden"));
        Assert.That((await Read(_owner, id)).GetProperty("title").GetString(), Is.EqualTo("Note"));
    }

    [Test]
    public async Task Create_needs_a_verified_email()
    {
        await SetConfirmed(_ownerUser.Id, false); // the session from SetUp stays valid

        var res = await _owner.PostAsJsonAsync("/api/notes", new { title = "Unverified" });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(res));
    }

    [Test]
    public async Task Share_adds_a_confirmed_user_in_the_tenant()
    {
        var bob = await _app.SeedUser("bob@example.test");
        var id = await CreateViaApi();

        var res = await _owner.PostAsJsonAsync($"/api/notes/{id}/members", new { email = "bob@example.test" });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(res));
        var members = (await Read(_owner, id)).GetProperty("members");
        Assert.That(members.GetRawText(), Is.EqualTo(JsonSerializer.Serialize(new[] { new { id = bob.Id, email = "bob@example.test" } })));
    }

    [Test]
    public async Task Share_matches_the_normalised_email()
    {
        var bob = await _app.SeedUser("bob@example.test");
        var id = await CreateViaApi();

        var res = await _owner.PostAsJsonAsync($"/api/notes/{id}/members", new { email = " Bob@Example.TEST " });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(res));
        var ids = (await Read(_owner, id)).GetProperty("members").EnumerateArray().Select(m => m.GetProperty("id").GetString());
        Assert.That(ids, Is.EqualTo(new[] { bob.Id }));
    }

    [TestCase("nobody@example.test")]       // unknown
    [TestCase("other-tenant@example.test")] // seeded in t2
    [TestCase("unconfirmed@example.test")]  // EmailConfirmed false
    [TestCase("member@example.test")]       // already a member
    [TestCase("owner@example.test")]        // the owner
    public async Task Share_answers_204_and_changes_nothing(string email)
    {
        await _app.SeedUser("member@example.test");
        await _app.SeedUser("other-tenant@example.test", tenant: "t2");
        var unconfirmed = await _app.SeedUser("unconfirmed@example.test");
        await SetConfirmed(unconfirmed.Id, false);
        var id = await CreateViaApi();
        var setup = await _owner.PostAsJsonAsync($"/api/notes/{id}/members", new { email = "member@example.test" });
        Assert.That(setup.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(setup));
        var before = (await Read(_owner, id)).GetProperty("members").GetRawText();
        Assert.That(before, Does.Contain("member@example.test"));

        var res = await _owner.PostAsJsonAsync($"/api/notes/{id}/members", new { email });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(res));
        Assert.That((await Read(_owner, id)).GetProperty("members").GetRawText(), Is.EqualTo(before));
    }

    [Test]
    public async Task A_member_cannot_share_or_unshare()
    {
        var member = await _app.SeedUser("member@example.test");
        await _app.SeedUser("bob@example.test");
        var id = await _app.SeedNote(_ownerUser.Id, "t1", member.Id);
        var c = await As("member@example.test");

        var share = await c.PostAsJsonAsync($"/api/notes/{id}/members", new { email = "bob@example.test" });
        var unshare = await c.DeleteAsync($"/api/notes/{id}/members/{member.Id}");

        Assert.That(share.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(share));
        Assert.That(unshare.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(unshare));
        Assert.That((await Read(_owner, id)).GetProperty("members").GetArrayLength(), Is.EqualTo(1));
    }

    [Test]
    public async Task Unshare_removes_the_member_and_a_non_member_is_also_204()
    {
        var bob = await _app.SeedUser("bob@example.test");
        var id = await CreateViaApi();
        await _owner.PostAsJsonAsync($"/api/notes/{id}/members", new { email = "bob@example.test" });

        var first = await _owner.DeleteAsync($"/api/notes/{id}/members/{bob.Id}");
        var again = await _owner.DeleteAsync($"/api/notes/{id}/members/{bob.Id}");

        Assert.That(first.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(first));
        Assert.That(again.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(again));
        Assert.That((await Read(_owner, id)).GetProperty("members").GetArrayLength(), Is.Zero);
    }

    [Test]
    public async Task A_member_sees_null_members()
    {
        var member = await _app.SeedUser("member@example.test");
        var id = await _app.SeedNote(_ownerUser.Id, "t1", member.Id);
        var c = await As("member@example.test");

        var note = await Read(c, id);

        Assert.That(note.GetProperty("members").ValueKind, Is.EqualTo(JsonValueKind.Null));
        Assert.That(note.GetProperty("can").GetRawText(), Is.EqualTo("""{"edit":true,"delete":false}"""));
    }

    [Test]
    public async Task A_tenant_admin_reads_but_cannot_edit_or_see_members()
    {
        var admin = await _app.SeedUser("admin@example.test", role: Role.TenantAdmin, twoFactor: true);
        var id = await _app.SeedNote(_ownerUser.Id, "t1");
        var key = await _app.With(sp => sp.GetRequiredService<UserManager<AppUser>>().GetAuthenticatorKeyAsync(admin));
        var c = await As("admin@example.test");
        var step = await c.PostAsJsonAsync("/auth/mfa", new { code = Totp.Code(key!, _app.Clock.GetUtcNow()) });
        Assert.That(step.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await Said(step));

        var note = await Read(c, id);
        var patch = await c.PatchAsJsonAsync($"/api/notes/{id}", new { title = "Admin edit" });
        var share = await c.PostAsJsonAsync($"/api/notes/{id}/members", new { email = "owner@example.test" });

        Assert.That(note.GetProperty("members").ValueKind, Is.EqualTo(JsonValueKind.Null));
        Assert.That(note.GetProperty("can").GetRawText(), Is.EqualTo("""{"edit":false,"delete":true}"""));
        Assert.That(patch.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(patch));
        Assert.That(share.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(share));
    }

    [Test]
    public async Task Patch_rejects_an_unknown_key_a_duplicate_key_and_a_non_object_body()
    {
        var id = await _app.SeedNote(_ownerUser.Id, "t1");

        var unknown = await PatchRaw(_owner, id, """{"x":1}""");
        var duplicate = await PatchRaw(_owner, id, """{"title":"a","title":"b"}""");
        var array = await PatchRaw(_owner, id, "[]");

        Assert.That(unknown.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await Said(unknown));
        Assert.That(await ErrorAndField(unknown), Is.EqualTo(("unknown_field", "x")));
        Assert.That(duplicate.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await Said(duplicate));
        Assert.That(await ErrorAndField(duplicate), Is.EqualTo(("invalid_field", "title")));
        Assert.That(array.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await Said(array));
        Assert.That(await ErrorAndField(array), Is.EqualTo(("unknown_field", "(body)")));
    }

    [Test]
    public async Task A_member_may_not_archive()
    {
        var member = await _app.SeedUser("member@example.test");
        var id = await _app.SeedNote(_ownerUser.Id, "t1", member.Id);
        var c = await As("member@example.test");

        var res = await c.PatchAsJsonAsync($"/api/notes/{id}", new { archived = true });

        Assert.That(res.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), await Said(res));
        Assert.That(await ErrorAndField(res), Is.EqualTo(("forbidden", "archived")));
    }

    [Test]
    public async Task Answers_413_above_32_KB_on_a_notes_route()
    {
        using var app = new AuthApiFactory();
        app.UseKestrel(0); // TestServer can't cap a request body, so this test runs on Kestrel
        // Kestrel's client follows redirects and keeps cookies itself, and a Secure cookie never goes over plain HTTP. So
        // this client does neither, and the session cookie and the Origin go by hand.
        using var c = new HttpClient(new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false }) { BaseAddress = app.CreateClient().BaseAddress };
        c.DefaultRequestHeaders.Host = "localhost"; // AllowedHosts
        c.DefaultRequestHeaders.Add("Origin", AuthApiFactory.Origin);
        var owner = await app.SeedUser("owner@example.test");
        var id = await app.SeedNote(owner.Id, "t1");
        c.DefaultRequestHeaders.Add("Cookie", SessionCookie(await c.SignIn("owner@example.test", Pw)));
        var escaped = string.Concat(Enumerable.Repeat("\\u0061", 4000)); // 4000 characters, six bytes each: 24 KB
        var big = new string('x', 33 * 1024);

        var fits = await PatchRaw(c, id, $$"""{"body":"{{escaped}}"}""");
        var tooBig = await PatchRaw(c, id, $$"""{"body":"{{big}}"}""");

        Assert.That(fits.StatusCode, Is.EqualTo(HttpStatusCode.OK), await Said(fits));
        Assert.That(tooBig.StatusCode, Is.EqualTo(HttpStatusCode.RequestEntityTooLarge), await Said(tooBig));
    }
}
