# csharp-api auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the loadout `auth` C# recipe live in `scaffolds/csharp-api`: passkeys, TOTP, recovery codes, server-side sessions, throttle, security headers and permissions, with the Note sample carrying the permission pattern end to end and every recipe test running in the scaffold.

**Architecture:** Hybrid, as the spec locks it. Auth plumbing is the recipe as near-verbatim Minimal API code in `App.Api/Auth/` and `App.Api/Auth/Http/`, so a recipe security fix syncs in as a near-copy. The permission core (rules, binder, exceptions) is pure `Expression` code in `App.Core/Authorization/`. Notes keeps its controller, which calls `NoteService` in Core; the service builds every read filter from `NotePolicy.Filter` and hands it to `NoteRepository` in `App.Data`, which must apply it. The xUnit suite moves to NUnit once, and the recipe's 68 test methods (88 runs) copy in beside it.

**Tech Stack:** .NET 10 (SDK pin 10.0.300, `rollForward: latestFeature`), ASP.NET Core Identity with EF Core SQLite 10.0.14, NUnit 4.3.2, `Microsoft.AspNetCore.Mvc.Testing` 10.0.14, Ward's dotnet module in workbench CI, `node:test` for `tools/csharp-api.test.mjs`.

**Spec:** `docs/specs/2026-11-10-csharp-api-auth.md` (on `docs/csharp-api-auth-spec`, `50cd919`). Read it before Task 1. § 3 is the placement table, § 4 the deliberate deviations, § 5 the Notes API, § 6 config and the check page, § 8 the tests.

## Global Constraints

- **Recipe source, pinned.** Every "copy from R:a-b" means lines a to b of `skills/auth/references/recipes/csharp-ef.md` at loadout tag `v0.8.0`; "T:a-b" means `skills/auth/references/tests.md` at the same tag. Read them with `git -C ~/.claude/loadout show v0.8.0:skills/auth/references/recipes/csharp-ef.md | sed -n 'a,bp'`. The auth skill is unchanged between `v0.8.0` and loadout `main` (checked 10.11.2026). Copy the code, never retype it from memory. The adaptations each task lists are the only intended differences. Some ranges start on a Markdown heading or include the ```` ``` ```` fence lines around a block; drop those lines, they are not code.
- **Recipe-to-scaffold map, applies to every copied file:**
  - `namespace Api;` becomes the folder's namespace: `App.Core.Authorization`, `App.Core.Models`, `App.Core.Interfaces`, `App.Core.Services`, `App.Data`, `App.Data.Repositories`, `App.Api.Auth`, `App.Api.Auth.Http`, `App.Tests.Auth`.
  - `Board` becomes `Note`, `BoardMember` becomes `NoteMember` (its key property is `NoteId`), `Boards` becomes `Notes`, `BoardActions`/`BoardPolicy`/`BoardCan`/`BoardDto` become `NoteActions`/`NotePolicy`/`NoteCan`/`NoteDto`. The named query filter keeps the name `"Tenant"`.
  - `/boards` routes become `/api/notes`. `SeedBoard` becomes `SeedNote`.
  - `ConnectionStrings:App` becomes `ConnectionStrings:Default` (spec § 4.4).
  - The recipe's concrete `CurrentUser` stays in `App.Api/Auth/Context.cs` and also implements the new Core interface `ICurrentUser`. `ITenantProvider` moves to `App.Core/Interfaces/`.
  - The logger category `Api.AuthLog` becomes `App.Api.Auth.AuthLog` wherever a test matches it.
- **Style.** `.editorconfig` requires accessibility modifiers (`always:warning`) and braces on new lines. Run `dotnet format App.slnx` before every commit; it adds `private` to recipe members and moves braces. That is style, not recipe drift. `dotnet format App.slnx --verify-no-changes` must pass at every commit.
- **Analyzers.** `Directory.Build.props` sets `AnalysisLevel` `latest-recommended` and `TreatWarningsAsErrors`. Recipe code that trips an analyzer gets fixed, never suppressed (no `#pragma`, no `SuppressMessage`, no `NoWarn`). Each fix goes on the **recipe sync-back list** in the PR body (Task 8): file, rule id, change.
- **Telemetry off.** Every shell that runs `dotnet` sets `DOTNET_CLI_TELEMETRY_OPTOUT=1` first. NUnit sends nothing.
- **Installing packages needs my go.** Task 1 Step 1 stops and asks. Nothing restores from NuGet before my yes in chat.
- **Commands.** From `scaffolds/csharp-api`: `dotnet build App.slnx`, `dotnet test App.slnx`, `dotnet format App.slnx --verify-no-changes`, `dotnet ef migrations has-pending-model-changes --project App.Data --startup-project App.Api`. From the workbench root: `node --test "tools/*.test.mjs"`, then `node tools/check-links.mjs`.
- **Branch and PR.** All tasks on `feat/csharp-api-auth`, cut from `docs/csharp-api-auth-spec` after this plan is committed there, in this checkout (no worktree: nothing else is in flight on these files). One PR to `main` carries the spec, the plan and the build. Push and open the PR freely; never merge, tag or cut a Release without my yes in chat.
- **Commits:** plain imperative messages, author `malinfossum.dev@proton.me`, no `Co-Authored-By`, no AI attribution. Stage named paths only, never `git add -A` or `commit -a`.
- **No em dashes** in anything written: C# comments, Markdown, JSON copy, commit messages, PR text. Rewrite the sentence instead.
- **Voice:** comments, README text and the PR read as if I wrote them, first person where a person speaks.
- **Secrets during the browser check (Task 9).** Claude never reads the TOTP key, the otpauth URI, recovery codes, the TOTP code Malin types, `.dev-mail/` files or any log line with a link. Status elements only, through the refs Task 9 Step 3 collects before the first secret is on the page (`find` can't match an id).
- **Mid-branch red tests, expected:** from Task 3 until Task 5, `App.Tests/Integration/LocalizationTests.cs` fails (the Notes routes it posts to have no session yet). Run the suite in Tasks 3 and 4 as `dotnet test App.slnx --filter "FullyQualifiedName!~LocalizationTests"`. From Task 3 until Task 4 creates the new migration, the pending-model check is red. From Task 3 until Task 5, `node --test "tools/*.test.mjs"` (and so `npm test` in the Stop hook) fails one check, "scaffold ships every load-bearing file", because Task 3 deletes `App.Tests/Integration/NotesApiTests.cs` and Task 5 writes it again. Everything else stays green after every task.
- **Version floors:** workbench `v2.24.0` at Task 10 only. The design system is untouched and stays at `3.11.1`.
- **Out of scope (spec § 11):** `web-react-ts`, `csharp-wpf`, `csharp-layered`, `csharp-console`; change-email, SSO/OIDC, a real mail provider; moving the throttle to the database.

## Review Focus

1. **Share by an email typed with other casing or stray spaces** (`" Bob@Example.TEST "`). Expected: it finds the confirmed account `bob@example.test` in the same tenant, still answers 204, and the owner's DTO lists Bob. Pinned by "share matches the normalised email" in `NotesApiTests` (Task 5).
2. **PATCH with a `null` value** (`{"title": null}`, `{"archived": null}`). Expected: 400 `invalid_field` naming the key, nothing saved. Pinned by the `[TestCase]` rows in `NoteServiceTests.Patch_rejects_a_wrong_type` (Task 3).
3. **A title of only spaces**, by PATCH. Expected: the same 400 that `POST` gives through `[Required]` (`invalid_field` here), so create and update agree. Pinned by `Patch_rejects_a_blank_title` (Task 3). This tightens the recipe's rule; it goes on the sync-back list.
4. **The account of a member is deleted.** Expected: the owner's note stays, the member row is gone, and the owner's `members` no longer lists that user. Pinned by `Deleting_a_member_s_account_leaves_the_owner_s_note` in `PrivacyTests` (Task 6).
5. **A tenant admin with a second factor opens a note they don't own.** Expected: 200, `can.edit` false, `can.delete` true, `members` null. Pinned by `A_tenant_admin_reads_but_cannot_edit_or_see_members` in `NotesApiTests` (Task 5).

---

### Task 1: Versions and NUnit, no behaviour change

**Files:**
- Modify: `scaffolds/csharp-api/App.Api/App.Api.csproj`, `App.Data/App.Data.csproj`, `App.Tests/App.Tests.csproj`, `.config/dotnet-tools.json`
- Modify (rewrite to NUnit): `App.Tests/Unit/NoteServiceTests.cs`, `Unit/JsonStringLocalizerTests.cs`, `Integration/LocalizationTests.cs`, `Integration/NoteRepositoryTests.cs`, `Integration/NotesApiTests.cs`, `Integration/ApiFactory.cs`

**Interfaces:**
- Consumes: nothing.
- Produces: an NUnit test project every later task adds to; `App.Data` with the Identity EF package available.

- [ ] **Step 1: Ask for the install go-ahead.** Post in chat: "Task 1 installs from NuGet: Microsoft.AspNetCore.Identity.EntityFrameworkCore 10.0.14 (new, App.Data), bumps EF Core Sqlite, EF Core Design, AspNetCore.OpenApi, Mvc.Testing and the dotnet-ef tool from 10.0.10 to 10.0.14, and swaps xunit 2.9.3 + xunit.runner.visualstudio 3.1.4 for NUnit 4.3.2, NUnit.Analyzers 4.7.0 and NUnit3TestAdapter 5.0.0. None of them sends telemetry. OK to install?" Wait for a yes.

- [ ] **Step 2: Record the baseline.** `DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet test App.slnx` and write the passed count into the SDD ledger. Expected: 32 passed (8 localizer, 8 service, 8 localization runs, 3 repository, 5 API).

- [ ] **Step 3: Edit the package pins.**
  - `App.Api.csproj`: `Microsoft.AspNetCore.OpenApi` and `Microsoft.EntityFrameworkCore.Design` to `10.0.14`. Keep the `Microsoft.OpenApi` 2.7.5 pin and its comment.
  - `App.Data.csproj`: `Microsoft.EntityFrameworkCore.Sqlite` to `10.0.14`; add `<PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="10.0.14" />`. Keep the `SQLitePCLRaw.lib.e_sqlite3` pin.
  - `.config/dotnet-tools.json`: `dotnet-ef` to `10.0.14`.
  - `App.Tests.csproj`: `Microsoft.AspNetCore.Mvc.Testing` to `10.0.14`; replace the two xunit references with `NUnit` 4.3.2, `NUnit.Analyzers` 4.7.0 (with `<IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets><PrivateAssets>all</PrivateAssets>`) and `NUnit3TestAdapter` 5.0.0; replace `<Using Include="Xunit" />` with `<Using Include="NUnit.Framework" />`. Keep `coverlet.collector` and `Microsoft.NET.Test.Sdk`.

- [ ] **Step 4: Rewrite the five test files and the factory to NUnit, case for case.**
  - `[Fact]` becomes `[Test]`; `[Theory]` + `[InlineData(a, b)]` becomes `[TestCase(a, b)]` on the same method.
  - `IClassFixture<ApiFactory>` with a constructor becomes a field set in `[SetUp]` (`_factory = new ApiFactory(); _client = _factory.CreateClient();`) and disposed in `[TearDown]`, so every test gets its own factory (recipe trap, spec § 8.1). The `[TearDown]` disposes both `_client` and `_factory`: NUnit.Analyzers' NUnit1032 fails the build on a disposable field it never sees disposed.
  - `IDisposable.Dispose` on a test class becomes a `[TearDown]` method.
  - `Assert.Equal(e, a)` becomes `Assert.That(a, Is.EqualTo(e))`; `Assert.Null(x)` becomes `Assert.That(x, Is.Null)`; `Assert.Single(xs)` becomes `Assert.That(xs, Has.Count.EqualTo(1))`; `Assert.Throws<T>(f)` keeps its name (NUnit has it).
  - Method names stay as they are, so the ledger can map old to new.

- [ ] **Step 5: Restore, build and run.** `dotnet tool restore && dotnet build App.slnx && dotnet test App.slnx`. Expected: build with 0 warnings, 32 passed, 0 skipped. Then `dotnet format App.slnx --verify-no-changes` and `dotnet ef migrations has-pending-model-changes --project App.Data --startup-project App.Api` (expected: no changes).

- [ ] **Step 6: Commit.**
```bash
git add scaffolds/csharp-api/App.Api/App.Api.csproj scaffolds/csharp-api/App.Data/App.Data.csproj scaffolds/csharp-api/App.Tests scaffolds/csharp-api/.config/dotnet-tools.json
git commit -m "Move csharp-api tests to NUnit and packages to 10.0.14"
```

---

### Task 2: The permission core in App.Core

**Files:**
- Create: `App.Core/Authorization/Policy.cs`, `App.Core/Interfaces/ICurrentUser.cs`, `App.Core/Interfaces/ITenantProvider.cs`, `App.Core/Models/NoteMember.cs`
- Modify: `App.Core/Models/Note.cs`
- Create (tests): `App.Tests/Auth/TestUsers.cs`, `App.Tests/Auth/MatrixTests.cs`

**Interfaces:**
- Consumes: nothing.
- Produces (namespace `App.Core.Authorization`): `enum Role { Member, TenantAdmin }`; `record UserContext(string Id, string TenantId, Role Role, bool EmailVerified, bool TwoFactorEnabled, bool SecondFactorUsed)`; `static class MfaPolicy { bool NeedsSecondFactor(UserContext) }`; `static class NoteActions { const string Read, Create, Update, Delete, Archive, Share; string[] All }`; `NotFoundException()`, `ForbiddenException(string? field)` with `Field`, `UnknownFieldException(string field)` and `InvalidFieldException(string field)` with `Field`; `record NoteCan(bool Edit, bool Delete)`; `static class NotePolicy { Rules; bool Can(UserContext?, string, Note); Expression<Func<Note,bool>> Filter(string, UserContext); IReadOnlySet<string> UpdatableFields(UserContext, Note); NoteCan Flags(UserContext, Note) }`; `static class PolicyBinder { bool Admits(UserContext); Expression<Func<T,bool>> Bind<T>(...) }`.
- Produces (namespace `App.Core.Interfaces`): `interface ICurrentUser { UserContext? Value { get; } }`; `interface ITenantProvider { string TenantId { get; } }`.
- Produces (namespace `App.Core.Models`): `Note` with `OwnerId`, `TenantId`, `Archived`, `Members`; `NoteMember { int NoteId; string UserId }`.

- [ ] **Step 1: Write the matrix test.** Copy `TestUsers` from T:1384-1681 (the `TestUsers` class only) into `App.Tests/Auth/TestUsers.cs`, namespace `App.Tests.Auth`. Copy `MatrixTests` from T:1684-1721 into `App.Tests/Auth/MatrixTests.cs` with the global map applied. Every `new Board { ... }` becomes `new Note { Title = "Note", ... }` (Title is `required` on Note). Keep the `"publish"` denial row and `Turns_red_on_the_broken_fixture` unchanged apart from the rename. Add `App.Tests/GlobalUsings.cs` with `global using App.Core.Authorization; global using App.Core.Models; global using App.Core.Interfaces;` (later tasks extend it).

- [ ] **Step 2: Run it to see it fail.** `dotnet test App.slnx --filter "FullyQualifiedName~MatrixTests"`. Expected: build error, `NotePolicy` not found.

- [ ] **Step 3: Write the core.**
  - `App.Core/Models/Note.cs`:
```csharp
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
```
  - `App.Core/Models/NoteMember.cs`:
```csharp
namespace App.Core.Models;

public class NoteMember
{
    public int NoteId { get; set; }
    public string UserId { get; set; } = "";
}
```
  - `App.Core/Interfaces/ITenantProvider.cs`: the recipe's `ITenantProvider` from R:639-802, alone, namespace `App.Core.Interfaces`.
  - `App.Core/Interfaces/ICurrentUser.cs`:
```csharp
using App.Core.Authorization;

namespace App.Core.Interfaces;

// The signed-in user for this request, loaded from the database by UserContextMiddleware in App.Api.
// Null when nobody is signed in. Core reads it; only App.Api sets it.
public interface ICurrentUser
{
    public UserContext? Value { get; }
}
```
  - `App.Core/Authorization/Policy.cs`: copy R:1332-1433 with the global map. The one change beyond the rename is the field sets, because Note has a `body`:
```csharp
    static readonly HashSet<string> AllFields = ["title", "body", "archived"], TextFields = ["title", "body"], NoFields = [];

    // `archived` follows the Archive rule, so the field rule and the action rule can't drift apart.
    public static IReadOnlySet<string> UpdatableFields(UserContext u, Note n) =>
        !Can(u, NoteActions.Update, n) ? NoFields : Can(u, NoteActions.Archive, n) ? AllFields : TextFields;
```
  Core has no global usings beyond the SDK's implicit ones, so `using System.Linq.Expressions;` and `using App.Core.Models;` (for `Note`) go at the top of the file.

- [ ] **Step 4: Run the matrix test.** Expected: 2 passed. Then the whole suite: 34 passed.

- [ ] **Step 5: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Core scaffolds/csharp-api/App.Tests/Auth scaffolds/csharp-api/App.Tests/GlobalUsings.cs
git commit -m "Add the Note permission rules to App.Core"
```

---

### Task 3: Data layer, repository and NoteService

**Files:**
- Create: `App.Data/AuthEntities.cs`
- Modify: `App.Data/AppDbContext.cs`, `App.Data/Repositories/NoteRepository.cs`, `App.Core/Interfaces/INoteRepository.cs`, `App.Core/Services/NoteService.cs`, `App.Core/Dtos/NoteDtos.cs`, `App.Api/Controllers/NotesController.cs` (compile only)
- Delete: `App.Data/Migrations/20261012184235_Init.cs`, `20261012184235_Init.Designer.cs`, `AppDbContextModelSnapshot.cs`, `App.Tests/Unit/FakeNoteRepository.cs`, `App.Tests/Integration/NotesApiTests.cs` (rewritten in Task 5; the ledger lists its five cases so Task 5 carries each one)
- Create (tests): `App.Tests/Auth/TestDb.cs`, `App.Tests/Auth/AgreementTests.cs`
- Modify (tests): `App.Tests/Unit/NoteServiceTests.cs`, `App.Tests/Integration/NoteRepositoryTests.cs`

**Interfaces:**
- Consumes: Task 2's `NotePolicy`, `NoteActions`, `ICurrentUser`, `ITenantProvider`, `Note`, `NoteMember`.
- Produces (`App.Data`): `AppUser : IdentityUser { string TenantId; Role Role }`, `UserSession`, `AuthEvent` (recipe shapes), `AppDbContext(DbContextOptions<AppDbContext>, ITenantProvider) : IdentityDbContext<AppUser>` with `Notes`, `UserSessions`, `AuthEvents`.
- Produces (`App.Core.Interfaces`):
```csharp
public interface INoteRepository
{
    public Task<List<Note>> ListAsync(Expression<Func<Note, bool>> filter);
    public Task<Note?> FindAsync(Expression<Func<Note, bool>> filter, int id);
    public Task AddAsync(Note note);
    public Task SaveAsync();
    public Task RemoveAsync(Note note);
    public Task<string?> FindShareableUserIdAsync(string email, string tenantId);
    public Task<IReadOnlyDictionary<string, string>> EmailsAsync(IReadOnlyCollection<string> userIds);
}
```
- Produces (`App.Core.Dtos`): `record NoteMemberDto(string Id, string Email)`, `record NoteDto(int Id, string Title, string Body, bool Archived, DateTime CreatedAt, DateTime UpdatedAt, NoteCan Can, List<NoteMemberDto>? Members)`, `record CreateNoteDto` (unchanged), `record ShareNoteDto([Required, MaxLength(256)] string Email)`. `UpdateNoteDto` is deleted.
- Produces (`App.Core.Services`): `NoteService(INoteRepository, ICurrentUser, TimeProvider)` with `Task<List<NoteDto>> ListAsync()`, `Task<NoteDto> GetAsync(int id)`, `Task<NoteDto> CreateAsync(CreateNoteDto dto)`, `Task<NoteDto> UpdateAsync(int id, JsonElement body)`, `Task DeleteAsync(int id)`, `Task ShareAsync(int id, string email)`, `Task UnshareAsync(int id, string userId)`. It throws the four Task 2 exceptions; it never returns null for "not found".
- Produces (tests): `TestDb.Context(SqliteConnection, string tenant)`, `FixedTenant(string)`.

- [ ] **Step 1: Write the agreement and repository tests.**
  - `App.Tests/Auth/TestDb.cs`: copy `FixedTenant` and `TestDb` from T:1384-1681.
  - `App.Tests/Auth/AgreementTests.cs`: copy T:1723-1820 with the global map. **Adaptation (FK):** Note.OwnerId and NoteMember.UserId now reference `AspNetUsers`, so the seed adds one user per distinct id in `TestUsers.All`, the empty id included: `db.Users.AddRange(TestUsers.All.DistinctBy(u => u.Id).Select(u => new AppUser { Id = u.Id, UserName = u.Id, TenantId = u.TenantId, Role = u.Role }));` then `db.SaveChanges();` before the notes. The empty-id row keeps the recipe's two unowned notes (`OwnerId = ""`) legal under the foreign key. They stay, because `Turns_red_on_an_unguarded_rule` only goes red while an unowned row exists; without that user row, SQLite refuses the seed and all five tests fail in `[SetUp]`. Every `new Board { ... }` becomes `new Note { Title = "Note", ... }` (Title is `required` on Note).
  - `App.Tests/Integration/NoteRepositoryTests.cs`: keep its three cases, built on `TestDb.Context(connection, "t1")` with one seeded `AppUser { Id = "u1", TenantId = "t1" }`; every call passes `NotePolicy.Filter(NoteActions.Read, TestUsers.Owner)`. Add two cases: `Find_misses_when_the_filter_hides_the_note` (a note owned by `u1`, filter for `TestUsers.Stranger`, `FindAsync` returns null) and `FindShareableUserId_matches_only_a_confirmed_email_in_the_tenant` (one confirmed user in t1, one unconfirmed in t1, one confirmed in t2: only the first returns its id, and `" BOB@example.TEST "` still finds `bob@example.test`). The repository needs an `ILookupNormalizer`; pass `new UpperInvariantLookupNormalizer()`. The users are seeded straight into `db.Users`, so set `NormalizedEmail = normalizer.NormalizeEmail(email)` on each, as `UserManager` would; without it the lookup never matches and the positive case can't pass.
  - `App.Tests/Unit/NoteServiceTests.cs`: rewrite on a new `FakeNoteRepository` inside the test file (applies the filter with `.AsQueryable().Where(filter)`, holds an email map for share). Keep all eight old cases in the new API (`Get_unknown_id_returns_null` becomes `Get_unknown_id_throws_NotFound`, `Update_unknown_id_returns_null` becomes `Update_unknown_id_throws_NotFound`, `Delete_unknown_id_returns_false` becomes `Delete_unknown_id_throws_NotFound`). A `StubCurrentUser(UserContext?)` implements `ICurrentUser`. Add:
```csharp
    [TestCase("{\"title\": null}", "title")]
    [TestCase("{\"archived\": null}", "archived")]
    [TestCase("{\"body\": 5}", "body")]
    [TestCase("{\"title\": \"a\", \"title\": \"b\"}", "title")]
    public async Task Patch_rejects_a_wrong_type(string json, string field)
    {
        var id = await SeedAsync(TestUsers.Owner);
        var ex = Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json(json)));
        Assert.That(ex!.Field, Is.EqualTo(field));
    }

    [Test]
    public async Task Patch_rejects_a_blank_title()
    {
        var id = await SeedAsync(TestUsers.Owner);
        Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json("{\"title\": \"   \"}")));
    }

    [Test]
    public async Task Patch_accepts_a_4000_character_body_and_rejects_4001()
    {
        var id = await SeedAsync(TestUsers.Owner);
        await _service.UpdateAsync(id, Json($"{{\"body\": \"{new string('x', 4000)}\"}}"));
        Assert.ThrowsAsync<InvalidFieldException>(() => _service.UpdateAsync(id, Json($"{{\"body\": \"{new string('x', 4001)}\"}}")));
    }

    [Test]
    public async Task Members_are_listed_for_the_owner_and_null_for_a_member()
    {
        var id = await SeedAsync(TestUsers.Owner, TestUsers.Member.Id);
        _repository.Emails[TestUsers.Member.Id] = "member@example.test";
        Assert.That((await _service.GetAsync(id)).Members, Is.EqualTo(new[] { new NoteMemberDto(TestUsers.Member.Id, "member@example.test") }));
        _current.Value = TestUsers.Member;
        Assert.That((await _service.GetAsync(id)).Members, Is.Null);
    }
```
  `Json(string)` is `JsonDocument.Parse(s).RootElement.Clone()`; `SeedAsync(owner, params string[] memberIds)` adds a note owned by `owner` in its tenant through the fake.

- [ ] **Step 2: Run them to see them fail.** `dotnet test App.slnx --filter "FullyQualifiedName!~LocalizationTests"`. Expected: build errors (`AppUser`, new repository signature).

- [ ] **Step 3: Write the data layer.**
  - `App.Data/AuthEntities.cs`: `AppUser`, `UserSession` and `AuthEvent` from R:132-200, namespace `App.Data`, `using App.Core.Authorization;` for `Role`.
  - `App.Data/AppDbContext.cs`:
```csharp
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

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<Note>(note =>
        {
            note.Property(n => n.Title).HasMaxLength(200);
            note.Property(n => n.Body).HasMaxLength(4000);
            note.HasMany(n => n.Members).WithOne().HasForeignKey(m => m.NoteId).OnDelete(DeleteBehavior.Cascade);
            // Account data reaches notes through the schema: deleting a user deletes the notes they own.
            note.HasOne<AppUser>().WithMany().HasForeignKey(n => n.OwnerId).OnDelete(DeleteBehavior.Cascade);
            note.HasQueryFilter("Tenant", x => TenantId != "" && x.TenantId == TenantId);
        });
        b.Entity<NoteMember>(member =>
        {
            member.HasKey(m => new { m.NoteId, m.UserId });
            // ...and removes them from the notes they were shared. SQL Server refuses two cascade paths to one table:
            // a project that moves there makes this one Restrict and deletes the member rows in DeleteAccount.
            member.HasOne<AppUser>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
```
  Then append the `UserSession` and `AuthEvent` index lines from R:132-200 inside `OnModelCreating`, unchanged.
  - `App.Data/Repositories/NoteRepository.cs`:
```csharp
using System.Linq.Expressions;
using App.Core.Interfaces;
using App.Core.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace App.Data.Repositories;

// Every read takes the filter NoteService built from NotePolicy.Filter, so a query can't skip the rules.
// GuardTests holds every .Notes line here to that.
public class NoteRepository(AppDbContext db, ILookupNormalizer normalizer) : INoteRepository
{
    public Task<List<Note>> ListAsync(Expression<Func<Note, bool>> filter) =>
        db.Notes.Include(n => n.Members).Where(filter).OrderBy(n => n.Id).AsNoTracking().ToListAsync();

    public Task<Note?> FindAsync(Expression<Func<Note, bool>> filter, int id) =>
        db.Notes.Include(n => n.Members).Where(filter).SingleOrDefaultAsync(n => n.Id == id);

    public async Task AddAsync(Note note)
    {
        db.Notes.Add(note);
        await db.SaveChangesAsync();
    }

    // The note is tracked (FindAsync); saving persists its edits and its member changes.
    public async Task SaveAsync() => await db.SaveChangesAsync();

    public async Task RemoveAsync(Note note)
    {
        db.Notes.Remove(note);
        await db.SaveChangesAsync();
    }

    // One lookup whatever the answer, so sharing can't time an account into view.
    public Task<string?> FindShareableUserIdAsync(string email, string tenantId)
    {
        var normalized = normalizer.NormalizeEmail(email.Trim());
        return db.Users.Where(u => u.NormalizedEmail == normalized && u.EmailConfirmed && u.TenantId == tenantId)
            .Select(u => u.Id).SingleOrDefaultAsync();
    }

    public async Task<IReadOnlyDictionary<string, string>> EmailsAsync(IReadOnlyCollection<string> userIds) =>
        await db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Email ?? "");
}
```
  - `App.Core/Interfaces/INoteRepository.cs`: the interface from **Interfaces** above, with `using System.Linq.Expressions;`.
  - `App.Core/Dtos/NoteDtos.cs`: `NoteMemberDto`, `NoteDto`, `CreateNoteDto` (unchanged) and `ShareNoteDto` from **Interfaces**; delete `UpdateNoteDto`.
  - `App.Core/Services/NoteService.cs`:
```csharp
using System.Text.Json;
using App.Core.Authorization;
using App.Core.Dtos;
using App.Core.Interfaces;
using App.Core.Models;

namespace App.Core.Services;

// Reads go through NotePolicy.Filter; writes load through the read filter (404 when hidden), then ask NotePolicy.Can (403).
public class NoteService(INoteRepository repository, ICurrentUser current, TimeProvider time)
{
    // What each updatable field accepts. A blank title fails here as it fails [Required] on create.
    private static readonly Dictionary<string, Func<JsonElement, bool>> Fields = new()
    {
        ["title"] = v => v.ValueKind == JsonValueKind.String && v.GetString() is { Length: > 0 and <= 200 } s && !string.IsNullOrWhiteSpace(s),
        ["body"] = v => v.ValueKind == JsonValueKind.String && v.GetString()!.Length <= 4000,
        ["archived"] = v => v.ValueKind is JsonValueKind.True or JsonValueKind.False,
    };

    private UserContext Me => current.Value ?? throw new NotFoundException();

    public async Task<List<NoteDto>> ListAsync() =>
        await ToDtosAsync(await repository.ListAsync(NotePolicy.Filter(NoteActions.Read, Me)));

    public async Task<NoteDto> GetAsync(int id) => (await ToDtosAsync([await LoadAsync(id)]))[0];

    public async Task<NoteDto> CreateAsync(CreateNoteDto dto)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var note = new Note { OwnerId = Me.Id, TenantId = Me.TenantId, Title = dto.Title, Body = dto.Body ?? "", CreatedAt = now, UpdatedAt = now };
        if (!NotePolicy.Can(Me, NoteActions.Create, note))
        {
            throw new ForbiddenException(null); // an unverified email, or no tenant
        }
        await repository.AddAsync(note);
        return (await ToDtosAsync([note]))[0];
    }

    // The keys come from the raw JSON, so a key the client sent is never lost to model binding.
    public async Task<NoteDto> UpdateAsync(int id, JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Object)
        {
            throw new UnknownFieldException("(body)");
        }
        var keys = new List<string>();
        foreach (var p in body.EnumerateObject()) // 400 before any rule runs: an unknown key, a wrong type, or a key twice
        {
            if (!Fields.TryGetValue(p.Name, out var valid))
            {
                throw new UnknownFieldException(p.Name);
            }
            if (!valid(p.Value) || keys.Contains(p.Name))
            {
                throw new InvalidFieldException(p.Name);
            }
            keys.Add(p.Name);
        }
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Update, note))
        {
            throw new ForbiddenException(null);
        }
        var allowed = NotePolicy.UpdatableFields(Me, note);
        foreach (var k in keys)
        {
            if (!allowed.Contains(k))
            {
                throw new ForbiddenException(k); // 403 naming the field
            }
        }
        if (body.TryGetProperty("title", out var t))
        {
            note.Title = t.GetString()!;
        }
        if (body.TryGetProperty("body", out var text))
        {
            note.Body = text.GetString()!;
        }
        if (body.TryGetProperty("archived", out var a))
        {
            note.Archived = a.GetBoolean();
        }
        note.UpdatedAt = time.GetUtcNow().UtcDateTime;
        await repository.SaveAsync();
        return (await ToDtosAsync([note]))[0];
    }

    public async Task DeleteAsync(int id)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Delete, note))
        {
            throw new ForbiddenException(null);
        }
        await repository.RemoveAsync(note); // member rows go with it (cascade)
    }

    // Always quiet: an unknown email, another tenant, an unconfirmed address, an existing member and the owner all
    // change nothing and look the same to the caller.
    public async Task ShareAsync(int id, string email)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Share, note))
        {
            throw new ForbiddenException(null);
        }
        var userId = await repository.FindShareableUserIdAsync(email, note.TenantId);
        if (userId is null || userId == note.OwnerId || note.Members.Exists(m => m.UserId == userId))
        {
            return;
        }
        note.Members.Add(new NoteMember { UserId = userId });
        await repository.SaveAsync();
    }

    public async Task UnshareAsync(int id, string userId)
    {
        var note = await LoadAsync(id);
        if (!NotePolicy.Can(Me, NoteActions.Share, note))
        {
            throw new ForbiddenException(null);
        }
        if (note.Members.Find(m => m.UserId == userId) is { } member)
        {
            note.Members.Remove(member); // a required relationship, so EF deletes the orphaned row
            await repository.SaveAsync();
        }
    }

    private async Task<Note> LoadAsync(int id) =>
        await repository.FindAsync(NotePolicy.Filter(NoteActions.Read, Me), id) ?? throw new NotFoundException();

    // Member emails only for whoever may share the note (its owner), so an address is shown only to the person who typed it.
    private async Task<List<NoteDto>> ToDtosAsync(List<Note> notes)
    {
        var shown = notes.Where(n => NotePolicy.Can(Me, NoteActions.Share, n)).ToList();
        var ids = shown.SelectMany(n => n.Members).Select(m => m.UserId).Distinct().ToList();
        var emails = ids.Count == 0 ? new Dictionary<string, string>() : await repository.EmailsAsync(ids);
        return notes.ConvertAll(n => new NoteDto(n.Id, n.Title, n.Body, n.Archived, n.CreatedAt, n.UpdatedAt, NotePolicy.Flags(Me, n),
            shown.Contains(n) ? n.Members.ConvertAll(m => new NoteMemberDto(m.UserId, emails.GetValueOrDefault(m.UserId, ""))) : null));
    }
}
```
  - `App.Api/Controllers/NotesController.cs`: only enough to compile (Task 5 rewrites it): `Update` becomes `[HttpPatch("{id:int}")] public Task<NoteDto> Update(int id, [FromBody] JsonElement body) => service.UpdateAsync(id, body);`, `Get` returns `await service.GetAsync(id)`, `GetAll` calls `ListAsync`, `Delete` awaits and returns `NoContent()`.
  - `App.Api/Program.cs`: no change. It still builds (the new constructor dependencies only fail at runtime), and the one suite that starts the host, `LocalizationTests`, is the expected red until Task 5. No temporary registrations.
  - Delete the three migration files. Do not create a new migration yet (Task 4, once Identity's schema version is wired).

- [ ] **Step 4: Run the tests.** `dotnet test App.slnx --filter "FullyQualifiedName!~LocalizationTests"`. Expected: all pass, including Agreement 5/5 and Matrix 2/2.

- [ ] **Step 5: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Core scaffolds/csharp-api/App.Data scaffolds/csharp-api/App.Api/Controllers/NotesController.cs scaffolds/csharp-api/App.Tests
git commit -m "Filter every note read through NotePolicy and give Note an owner, tenant and members"
```

---

### Task 4: Auth plumbing, wiring, migration and the recipe's config, copy and guard tests

**Files:**
- Create: `App.Api/GlobalUsings.cs`, `App.Api/Auth/Sessions.cs`, `Auth/Context.cs`, `Auth/Passwords.cs`, `Auth/Tokens.cs`, `Auth/AccountService.cs`, `Auth/Http/AuthEndpoints.cs`, `Auth/Http/AppEndpoints.cs`, `Auth/Http/Web.cs`, `App.Api/wwwroot/passkeys.js`, `App.Data/Migrations/<timestamp>_Init.cs` (+ Designer + snapshot, generated)
- Modify: `App.Api/Program.cs`, `App.Api/appsettings.json`, `App.Api/Locales/en.json`, `App.Api/Locales/nb.json`
- Create (tests): `App.Tests/Auth/TestApp.cs`, `Auth/ConfigTests.cs`, `Auth/CopyTests.cs`, `Auth/GuardTests.cs` (the old `Integration/ApiFactory.cs` stays until Task 5, because `LocalizationTests` still compiles against it)

**Interfaces:**
- Consumes: Tasks 2-3.
- Produces (`App.Api.Auth`): everything R:204-368, R:582-854 and R:1511-1547 declare, with `CurrentUser : ICurrentUser` and `AccountService` placed here. `SecurityHeaders.Apply(IHeaderDictionary h, bool hsts)`. `BodyLimit.Auth` (16 KB) and `BodyLimit.NotesBytes` (`public const long NotesBytes = 32 * 1024;`).
- Produces (tests, `App.Tests.Auth`): `AuthApiFactory` with `TestPhrase`, `NewTestPhrase`, `Origin`, `Logs`, `Mail`, `Clock`, `Client()`, `ClientOf()`, `With()`, `SeedUser()`, `NewRecoveryCodes()`, `SeedPasskey()`, `SeedNote(string ownerId, string tenant, params string[] memberIds)`, `AgeSessions()`; `ClientExtensions` (`SignIn`, `SessionCookie`, `SetsSessionCookie`, `Fragment`, `Said`, `ErrorOf`); `Source.Root` (the folder holding `App.slnx`); `TestClock`, `FixedRemoteIp`, `CapturingLoggerProvider`, `Totp`, `SoftPasskey`, `RecordingAuthEmail`, `NoBreaches`.

- [ ] **Step 1: Write the test helpers and the three tests.**
  - `App.Tests/GlobalUsings.cs`: add the global usings of T:1349-1379, with `global using Api;` replaced by `global using App.Api.Auth; global using App.Api.Auth.Http; global using App.Core.Dtos; global using App.Core.Services; global using App.Data; global using App.Tests.Auth;`.
  - `App.Tests/Auth/TestApp.cs`: copy T:1384-1681 minus the classes Tasks 2-3 already placed (`TestUsers`, `FixedTenant`, `TestDb`). Adaptations:
    - `builder.UseSetting("ConnectionStrings:App", ...)` becomes `"ConnectionStrings:Default"`.
    - `SeedBoard` becomes `SeedNote`, creating `new Note { OwnerId = ownerId, TenantId = tenant, Title = "Note", Members = memberIds.Select(id => new NoteMember { UserId = id }).ToList() }` through `db.Notes`.
    - `Source.ApiDir` becomes `Source.Root`: walk up from `TestContext.CurrentContext.TestDirectory` to the first folder that contains `App.slnx`; throw `DirectoryNotFoundException("App.slnx not found above the test folder")` otherwise.
  - `App.Tests/Auth/ConfigTests.cs`: copy T:2678-2745. No changes beyond the global map.
  - `App.Tests/Auth/CopyTests.cs`: copy T:2824-2870. `Load()` reads the scaffold's bundles instead:
```csharp
    static Dictionary<string, JsonElement> Load() =>
        Directory.GetFiles(Path.Combine(Source.Root, "App.Api", "Locales"), "*.json")
            .ToDictionary(f => Path.GetFileName(f), f => JsonDocument.Parse(File.ReadAllText(f)).RootElement);
```
  and the locale assertion reads `Is.EquivalentTo(new[] { "en.json", "nb.json" })`. The broken fixture's key becomes `"nb.json"`.
  - `App.Tests/Auth/GuardTests.cs`: copy T:1827-1885 and rewrite the folders for the split projects. Paths are relative to `Source.Root`, scanning `App.Core`, `App.Data` and `App.Api` (never `App.Tests`, which holds the negative fixtures):
```csharp
    static readonly (string Name, Regex Pattern, string[] AllowedIn)[] Rules =
    [
        ("role check", new Regex(@"IsInRole\(|\b[iI]sAdmin\b|\.Role\s*([!=]=|[<>]|switch\b)|\bcase\s+Role\.|\bis\s+(not\s+)?Role\.|\bRole:\s*(not\s+)?Role\.|Authorize\(Roles"), new[] { "App.Core/Authorization/" }),
        ("database access", new Regex(@"DbSet<|\b_?db\.(Notes|UserSessions|AuthEvents|Users|Set<)"), new[] { "App.Data/", "App.Api/Auth/" }),
        ("database context", new Regex(@"\bAppDbContext\b"), new[] { "App.Data/", "App.Api/Auth/", "App.Api/Program.cs" }),
        ("bare IgnoreQueryFilters", new Regex(@"IgnoreQueryFilters\(\s*\)"), Array.Empty<string>()),
        ("named IgnoreQueryFilters", new Regex(@"IgnoreQueryFilters\(\s*[^\s)]"), new[] { "App.Data/Jobs/" }),
    ];

    // The endpoint files sit inside App.Api/Auth/ but stay out of the database, as the recipe's Http/ folder does.
    static readonly string[] NeverAllowed = ["App.Api/Auth/Http/"];

    static bool Allowed(string path, string[] allowedIn) =>
        allowedIn.Any(dir => path.StartsWith(dir, StringComparison.Ordinal))
        && !NeverAllowed.Any(dir => path.StartsWith(dir, StringComparison.Ordinal));

    // Per line, in App.Data/Repositories/: a line that touches the notes or their member rows applies the filter it was
    // passed, or adds or removes a row.
    static readonly Regex NotesAccess = new(@"\.Notes\b|Set<Note(Member)?>"), ThroughFilter = new(@"\.Where\(filter\)|\.Add\(|\.Remove\(");

    // Per line, in App.Core/Services/: a repository read (on any receiver) builds its filter from NotePolicy.Filter.
    static readonly Regex RepositoryRead = new(@"\.(ListAsync|FindAsync)\("), FromPolicy = new(@"NotePolicy\.Filter\(");

    static IEnumerable<(string, string)> SourceFiles() =>
        new[] { "App.Core", "App.Data", "App.Api" }.SelectMany(project =>
            Directory.EnumerateFiles(Path.Combine(Source.Root, project), "*.cs", SearchOption.AllDirectories)
                .Select(p => Path.GetRelativePath(Source.Root, p).Replace('\\', '/'))
                .Where(p => !p.Contains("/bin/") && !p.Contains("/obj/"))
                .Select(p => (p, File.ReadAllText(Path.Combine(Source.Root, p)))));
```
  `FindViolations` uses `!Allowed(f.Path, r.AllowedIn)` where the recipe has its inline `StartsWith` check. `FindUnfilteredLines` applies `NotesAccess`/`ThroughFilter` to paths starting `App.Data/Repositories/`, and a second method `FindUnboundReads` applies `RepositoryRead`/`FromPolicy` to paths starting `App.Core/Services/`. Every negative fixture path gains its project prefix: `"App.Api/Auth/Http/Endpoints.cs"` (still expects 3: the role check, `db.Notes` in an endpoint file and the bare `IgnoreQueryFilters`; without `NeverAllowed` it would find 2), `"App.Api/Controllers/Reports.cs"` (one per TestCase; the `Reports(AppDbContext context)` line stays a violation there), `"App.Data/Jobs/Digest.cs"` (allowed), `"App.Data/Repositories/Reports.cs"` with `db.Notes`, `context.Notes`, `_context.Set<Note>()` and `_context.Set<NoteMember>()` (one each). `Turns_red_on_each_shape_of_role_check_and_database_access` gains three rows: `[TestCase("var label = me.Role switch { Role.TenantAdmin => \"admin\", _ => \"member\" };")]`, `[TestCase("case Role.TenantAdmin: return;")]` and `[TestCase("if (me.Role >= Role.TenantAdmin) return;")]`. Add `Turns_red_on_a_service_read_without_the_policy` with `[TestCase("var all = await repository.ListAsync(n => true);")]`, `[TestCase("return await repository.FindAsync(_ => true, id);")]` and `[TestCase("var all = await _notes.ListAsync(n => true);")]` on `"App.Core/Services/Reports.cs"`, each expecting 1, and `Every_service_read_builds_its_filter_from_the_policy` asserting `FindUnboundReads(SourceFiles())` is empty. That adds 2 methods and 8 runs beyond the recipe's 6 and 12, so GuardTests is 8 methods, 20 runs. The `NeverAllowed` list, the three role-check shapes and the `NoteMember` match go on the recipe sync-back list: the recipe's guard has the same gaps.

- [ ] **Step 2: Run them to see them fail.** `dotnet test App.slnx --filter "FullyQualifiedName~App.Tests.Auth"`. Expected: build errors (`EfTicketStore`, `AuthEndpoints` missing).

- [ ] **Step 3: Copy the plumbing.**
  - `App.Api/GlobalUsings.cs`: R:35-56 with `Api` usings replaced by `App.Core.Authorization`, `App.Core.Interfaces`, `App.Core.Models`, `App.Data`, `App.Api.Auth`, `App.Api.Auth.Http`.
  - `App.Api/Auth/Sessions.cs`: R:204-368 then R:1511-1524 (AuthEventLog) in one file.
  - `App.Api/Auth/Context.cs`: R:639-802 minus `ITenantProvider` (now in Core). `CurrentUser` becomes `public sealed class CurrentUser : ICurrentUser { public UserContext? Value { get; set; } }`.
  - `App.Api/Auth/Passwords.cs`: R:582-633. `App.Api/Auth/Tokens.cs`: R:806-854.
  - `App.Api/Auth/AccountService.cs`: R:1528-1547 (Task 6 extends the export).
  - `App.Api/Auth/Http/AuthEndpoints.cs`: R:457-484, R:858-974, R:1203-1222 in that order, as one class.
  - `App.Api/Auth/Http/AppEndpoints.cs`: R:398-453, R:978-1043, R:1226-1256 and R:1551-1563 in that order, minus the four `/boards` lines in `Map` (Notes lives in the controller).
  - `App.Api/Auth/Http/Web.cs`: R:1092-1199 with three changes:
    1. `BodyLimit` gains `public const long NotesBytes = 32 * 1024; // a 4000-character body fits in any script, even fully \u-escaped`.
    2. `SecurityHeaders.Apply(IHeaderDictionary h)` becomes `Apply(IHeaderDictionary h, bool hsts)` and sets HSTS only `if (hsts)`, with the comment `// Off in Development only: HSTS on localhost would pin every dev server on this machine to https (spec § 4.3).`
    3. `AuthExceptionHandler` writes localized ProblemDetails with `error` and `field` as extension members (spec § 4.2):
```csharp
public sealed class AuthExceptionHandler(ILogger<AuthLog> log, IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        (int Status, string Error, string? Field) result = ex switch
        {
            NotFoundException => (404, "not_found", null),
            ForbiddenException f => (403, "forbidden", f.Field),
            UnknownFieldException u => (400, "unknown_field", u.Field),
            InvalidFieldException i => (400, "invalid_field", i.Field),
            ReauthRequiredException => (401, "auth.error.reauthRequired", null),
            SessionLookupException => (503, "unavailable", null),
            BadHttpRequestException b => (b.StatusCode, "bad_request", null), // a malformed body, too large, or a bad header
            _ => (500, "server_error", null),
        };
        if (result.Status == 403)
        {
            log.LogInformation("auth.forbidden user={UserId} path={Path}", http.User.FindFirstValue(ClaimTypes.NameIdentifier), http.Request.Path.Value);
        }
        http.Response.StatusCode = result.Status;
        var details = new ProblemDetails { Status = result.Status };
        details.Extensions["error"] = result.Error;
        if (result.Field is not null)
        {
            details.Extensions["field"] = result.Field;
        }
        // No Exception on the context: its message never reaches the client.
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = details });
    }
}
```
  - `App.Api/wwwroot/passkeys.js`: R:489-536 verbatim.
  - `App.Api/Locales/en.json` and `nb.json`: merge the 23 keys of R:1260-1286 (en) and R:1290-1316 (nb) as flat keys, sorted after the `problem.*` keys. Add titles for the statuses the handler now writes: en `"problem.401": "You need to sign in."`, `"problem.403": "You are not allowed to do this."`, `"problem.404": "Not found."`, `"problem.503": "The service is unavailable. Try again shortly."`; nb `"problem.401": "Du må logge inn."`, `"problem.403": "Du har ikke tilgang til dette."`, `"problem.404": "Fant det ikke."`, `"problem.503": "Tjenesten er utilgjengelig. Prøv igjen om litt."`. Keep tab indentation.
  - `App.Api/appsettings.json`: R:20-31 merged with the scaffold's: keep `"ConnectionStrings": { "Default": "Data Source=app.db" }` and the logging block; `"AllowedHosts": "app.example.test"`; the recipe's `"Auth"` object.
  - `App.Api/Program.cs`, whole file:
```csharp
using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Threading.RateLimiting;
using App.Api.Localization;
using App.Core.Services;
using App.Data.Repositories;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Localization;

var builder = WebApplication.CreateBuilder(args);
var s = builder.Services;
var config = builder.Configuration;
var origin = config["Auth:Origin"] ?? throw new InvalidOperationException("Auth:Origin is not set");
var passkeyDomain = config["Auth:PasskeyDomain"] ?? throw new InvalidOperationException("Auth:PasskeyDomain is not set"); // null would mean "trust the Host header"

s.AddDbContext<AppDbContext>((sp, o) => o.UseSqlite(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default") ?? "Data Source=app.db"));
s.AddHttpContextAccessor();
s.AddSingleton(TimeProvider.System);
s.AddScoped<CurrentUser>();
s.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<CurrentUser>());
s.AddScoped<ITenantProvider, CurrentTenant>();
s.AddScoped<INoteRepository, NoteRepository>();
s.AddScoped<NoteService>();
```
  then R:62-128 from `s.AddScoped<AccountService>();` to the end of part 1 unchanged (drop its `using Api;`, the builder lines above and `s.AddScoped<BoardService>();`), then R:384-392, then R:547-578, then:
```csharp
s.AddControllers();
```
  then the scaffold's localization block and its `AddProblemDetails(options => options.CustomizeProblemDetails = ...)` block unchanged, then:
```csharp
s.AddAuthorization(o => o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
s.AddExceptionHandler<AuthExceptionHandler>();
s.AddOpenApi();
s.AddCors(options => options.AddPolicy("dev", policy =>
    policy.SetIsOriginAllowed(o => Uri.TryCreate(o, UriKind.Absolute, out var uri) && uri.IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
var hsts = !app.Environment.IsDevelopment();

app.UseForwardedHeaders(); // first: the limiter, the session rows and the logs need the real client IP
app.Use(async (ctx, next) =>
{
    ctx.Response.OnStarting(() => { SecurityHeaders.Apply(ctx.Response.Headers, hsts); return Task.CompletedTask; }); // survives the exception handler
    await next();
});
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection(); // dev runs plain http on the default profile; real hosts always redirect
}
app.UseRequestLocalization();
app.UseMiddleware<CrossSiteGuard>(origin); // before the session lookup: a cross-site form never reaches it
app.UseStaticFiles();
app.UseRouting(); // before authentication: the ticket store reads the endpoint's StartsSession marker
if (app.Environment.IsDevelopment())
{
    app.UseCors("dev"); // any localhost origin, no credentials, Development only
}
app.UseAuthentication();
app.UseMiddleware<UserContextMiddleware>();
app.UseMiddleware<SecondFactorGate>();
app.UseRateLimiter();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous(); // JSON spec at /openapi/v1.json, dev only
}
AuthEndpoints.Map(app);
AppEndpoints.Map(app);
app.MapControllers();

app.Run();

// Top-level statements make Program internal; this line makes it visible to
// WebApplicationFactory<Program> in App.Tests. Do not remove.
public partial class Program { }
```
  Any `using` the compiler still asks for goes at the top of Program.cs or into `App.Api/GlobalUsings.cs`.

- [ ] **Step 4: Generate the migration.** `dotnet ef migrations add Init --project App.Data --startup-project App.Api`. Open the generated `Init.cs` and confirm it creates `AspNetUserPasskeys`, `Notes`, `NoteMember`, `UserSessions` and `AuthEvents` (recipe trap: a missing passkey table means Identity's schema version was not wired). If `NoteMember` is named `NoteMember`, keep it; do not add a `ToTable` call. Then `dotnet ef migrations has-pending-model-changes --project App.Data --startup-project App.Api`. Expected: no changes.

- [ ] **Step 5: Run the tests.** `dotnet test App.slnx --filter "FullyQualifiedName!~LocalizationTests"`. Expected: Config 2/2, Copy 2/2, Guard 20 runs, plus everything from Tasks 1-3, all green. If an analyzer stops the build, fix the code (Global Constraints) and add it to the sync-back list in the ledger.

- [ ] **Step 6: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Api scaffolds/csharp-api/App.Data/Migrations scaffolds/csharp-api/App.Tests
git commit -m "Wire the auth recipe into csharp-api: sessions, passkeys, TOTP, throttle and headers"
```

---

### Task 5: The Notes API and the recipe's HTTP tests

**Files:**
- Modify: `App.Api/Controllers/NotesController.cs`, `App.Api/App.Api.http`, `App.Tests/Integration/LocalizationTests.cs`
- Create (tests): `App.Tests/Auth/HttpTests.cs`, `App.Tests/Integration/NotesApiTests.cs`
- Delete: `App.Tests/Integration/ApiFactory.cs` (every integration test now uses `AuthApiFactory`)

**Interfaces:**
- Consumes: `NoteService` (Task 3), `AuthApiFactory`, `ClientExtensions` (Task 4), `BodyLimit.NotesBytes` (Task 4).
- Produces: the routes of spec § 5.

- [ ] **Step 1: Copy the recipe's HTTP tests.** T:1888-2676 into `App.Tests/Auth/HttpTests.cs` with the global map. Adaptations:
  - Every `/boards` path becomes `/api/notes`; `SeedBoard` becomes `SeedNote`.
  - Where a test compares a whole response body that the exception handler wrote (404, 403 with a field, 400 `unknown_field`/`invalid_field`), compare `ErrorOf(r)` and the `field` property instead; the body is now ProblemDetails. Never weaken a status assertion.
  - In the cross-site test the control PATCH still expects 415 (MVC refuses a form body on a `[FromBody] JsonElement`).
  - A log line matched as `"Api.AuthLog: "` becomes `"App.Api.Auth.AuthLog: "`.
  - `The_account_export_holds_the_account_s_own_data` stays as copied here; Task 6 changes its key list.

- [ ] **Step 2: Rewrite the Notes API tests.** `App.Tests/Integration/NotesApiTests.cs` on `AuthApiFactory` (a new factory per test in `[SetUp]`, signed in as `owner@example.test` via `SeedUser` + `SignIn`). Carry the five old cases:
  - `Post_then_get_round_trips` (201, `Location` header, GET returns the same title and body, `can` is `{edit: true, delete: true}`, `members` is an empty array for the owner).
  - `Post_without_title_returns_problem_details_400`.
  - `Get_unknown_id_returns_404`.
  - `Put_updates_and_returns_the_note` becomes `Patch_updates_and_returns_the_note` (title and body change, `updatedAt` moves, `createdAt` does not).
  - `Delete_returns_204_then_get_returns_404`.

  New cases (spec § 8.1):
```csharp
    [Test] public async Task Every_notes_route_needs_a_session() // 401 on GET, POST, PATCH, DELETE and both member routes, client without cookies
    [Test] public async Task A_tenant_admin_without_a_second_factor_is_stopped_by_the_gate() // 403, ErrorOf == "second_factor_required"
    [Test] public async Task A_form_style_PATCH_from_another_origin_is_refused() // 403 "forbidden", the note unchanged
    [Test] public async Task Create_needs_a_verified_email() // SeedUser then set EmailConfirmed = false on the row; the existing session's next POST is 403
    [Test] public async Task Share_adds_a_confirmed_user_in_the_tenant() // 204, the owner's GET lists { id, email }
    [Test] public async Task Share_matches_the_normalised_email() // " Bob@Example.TEST " finds bob@example.test (Review Focus 1)
    [TestCase("nobody@example.test")]       // unknown
    [TestCase("other-tenant@example.test")] // seeded in t2
    [TestCase("unconfirmed@example.test")]  // EmailConfirmed false
    [TestCase("member@example.test")]       // already a member
    [TestCase("owner@example.test")]        // the owner
    public async Task Share_answers_204_and_changes_nothing(string email) // members before == members after
    [Test] public async Task A_member_cannot_share_or_unshare() // 403 both
    [Test] public async Task Unshare_removes_the_member_and_a_non_member_is_also_204()
    [Test] public async Task A_member_sees_null_members()
    [Test] public async Task A_tenant_admin_reads_but_cannot_edit_or_see_members() // Review Focus 5: SeedUser(role: TenantAdmin, twoFactor: true), signs in with the TOTP step via Totp.Code
    [Test] public async Task Patch_rejects_an_unknown_key_a_duplicate_key_and_a_non_object_body() // 400 unknown_field "x"; 400 invalid_field "title"; 400 unknown_field "(body)" for "[]"
    [Test] public async Task A_member_may_not_archive() // 403 with field "archived"
    [Test] public async Task Answers_413_above_32_KB_on_a_notes_route() // Kestrel, as the recipe's 413 test: a fully \u-escaped 4000-character body (24 KB) is 200, a 33 KB body is 413
```
  Write each body in full, in the recipe's style (`Said(r)` in the assertion message). The 413 test copies the client setup of the recipe's `Answers_413_to_an_oversized_body_on_an_auth_or_account_route` (T:2624-2642) and adds the `Origin` header by hand, because the notes PATCH is an unsafe method behind the cross-site guard.

- [ ] **Step 3: Adapt the localization tests.** `LocalizationTests` signs in first (`SeedUser` + `SignIn` on an `AuthApiFactory` client) so `POST /api/notes` reaches model validation; `Malformed_accept_language_still_returns_200` calls `GET /health` (public). The five `[TestCase]` rows and the other three tests keep their assertions.

- [ ] **Step 4: Run them to see them fail.** `dotnet test App.slnx`. Expected: the new Notes cases that need the member routes or the 32 KB limit fail (the Task 3 stub has neither: share and unshare answer 404 or 405, and the 33 KB body is not refused). Create, read, PATCH and delete already work through the stub, so their cases may pass here.

- [ ] **Step 5: Write the controller.**
```csharp
using System.Text.Json;
using App.Api.Auth.Http;
using App.Core.Dtos;
using App.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace App.Api.Controllers;

// No permission checks here: NoteService asks NotePolicy. A filter miss is 404, readable but not allowed is 403.
// The session, the second-factor gate and the cross-site guard run before any action (Program.cs).
[ApiController]
[Route("api/notes")]
[RequestSizeLimit(BodyLimit.NotesBytes)]
public class NotesController(NoteService service) : ControllerBase
{
    [HttpGet]
    public Task<List<NoteDto>> GetAll() => service.ListAsync();

    [HttpGet("{id:int}")]
    public Task<NoteDto> Get(int id) => service.GetAsync(id);

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(CreateNoteDto dto)
    {
        var note = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = note.Id }, note);
    }

    [HttpPatch("{id:int}")]
    public Task<NoteDto> Update(int id, [FromBody] JsonElement body) => service.UpdateAsync(id, body);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }

    // The email goes in the body, never the URL, and the answer is 204 whether or not it matched anyone.
    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> Share(int id, ShareNoteDto dto)
    {
        await service.ShareAsync(id, dto.Email);
        return NoContent();
    }

    [HttpDelete("{id:int}/members/{userId}")]
    public async Task<IActionResult> Unshare(int id, string userId)
    {
        await service.UnshareAsync(id, userId);
        return NoContent();
    }
}
```

- [ ] **Step 6: Update `App.Api.http`.** Sign up, confirm (a comment: "paste the uid and token from the newest file in `.dev-mail/`"), sign in, then every Notes route of spec § 5 in table order, including both member routes and a PATCH with `{ "archived": true }`. `@host = http://localhost:5005`. A comment above the share request: "Sign-up gives every account its own tenant (the recipe's rule), so sharing with a second signed-up account answers 204 and changes nothing. To try sharing, move that account into yours first: `sqlite3 app.db \"UPDATE AspNetUsers SET TenantId = (SELECT TenantId FROM AspNetUsers WHERE NormalizedEmail = 'YOU@EXAMPLE.TEST') WHERE NormalizedEmail = 'THEM@EXAMPLE.TEST';\"`" A comment above the sign-in request: "Sign-in sets a Secure cookie. A client built on .NET's HttpClient (Visual Studio, the tests' Kestrel client) won't send it over plain http, so every request after this answers 401. Run the https profile and set @host to https://localhost:7005 if that happens."

- [ ] **Step 7: Run everything.** `dotnet test App.slnx` with no filter. Expected: all green, Http 48/62 among them, LocalizationTests green again.

- [ ] **Step 8: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Api/Controllers/NotesController.cs scaffolds/csharp-api/App.Api/App.Api.http scaffolds/csharp-api/App.Tests
git commit -m "Notes API behind sessions and NotePolicy: PATCH, share, unshare and a 32 KB body limit"
```

---

### Task 6: Account data reaches notes

**Files:**
- Modify: `App.Api/Auth/AccountService.cs`, `App.Tests/Auth/HttpTests.cs` (export test)
- Create (tests): `App.Tests/Auth/PrivacyTests.cs`

**Interfaces:**
- Consumes: the cascade keys from Task 3, `AccountService` from Task 4.
- Produces: `record NoteExport(int Id, string Title, string Body, bool Archived, DateTime CreatedAt, DateTime UpdatedAt)`, `record MembershipExport(int NoteId, string Title)`, `AccountExport(..., List<AuthEventDto> Events, List<NoteExport> Notes, List<MembershipExport> Memberships)`.

- [ ] **Step 1: Write the failing tests.**
  - `App.Tests/Auth/PrivacyTests.cs`: copy T:2748-2822. In `Logs_hold_no_secrets_and_deleting_the_account_leaves_no_credentials`, seed before the delete: `var owned = await _app.SeedNote(user.Id, "t1");` and a second user `other@example.test` who owns `var shared = await _app.SeedNote(other.Id, "t1", user.Id);`. Extend `left` with `+ await db.Notes.IgnoreQueryFilters(["Tenant"]).CountAsync(n => n.OwnerId == user.Id) + await db.Set<NoteMember>().CountAsync(m => m.UserId == user.Id)`. **Guard note:** this is test code, which `GuardTests` does not scan; the named form is still the only one allowed. Add:
```csharp
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
```
  - `HttpTests.The_account_export_holds_the_account_s_own_data`: the key list becomes `{ "email", "name", "passkeys", "sessions", "events", "notes", "memberships" }`; seed one owned note and one membership before the export and assert `notes[0].title` and `memberships[0].noteId`.

- [ ] **Step 2: Run them to see them fail.** `dotnet test App.slnx --filter "FullyQualifiedName~PrivacyTests|FullyQualifiedName~account_export"`. Expected: the export test fails on the key list; the cascade asserts should already pass (Task 3 keys). If a cascade assert fails, the FK config in Task 3 is wrong: fix it there, not with a delete in `DeleteAccount`.

- [ ] **Step 3: Extend the export.** In `AccountService.ExportAsync`, after the events query:
```csharp
        var notes = await db.Notes.Where(n => n.OwnerId == userId).OrderBy(n => n.Id)
            .Select(n => new NoteExport(n.Id, n.Title, n.Body, n.Archived, n.CreatedAt, n.UpdatedAt)).ToListAsync();
        var memberships = await db.Notes.Where(n => n.Members.Any(m => m.UserId == userId)).OrderBy(n => n.Id)
            .Select(n => new MembershipExport(n.Id, n.Title)).ToListAsync();
        return new(user.Email!, user.UserName!, passkeys, await sessions.ListAsync(userId, currentKey), events, notes, memberships);
```
  The tenant filter applies, which is right: the export runs as the signed-in user in their own tenant. Update the comment above the class to name notes and memberships.

- [ ] **Step 4: Run everything.** `dotnet test App.slnx`. Expected: Privacy 4/4 (3 recipe + 1 new), all green.

- [ ] **Step 5: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Api/Auth/AccountService.cs scaffolds/csharp-api/App.Tests/Auth
git commit -m "Account delete and export cover owned notes and memberships"
```

---

### Task 7: Development mailer, startup guard and the check page

**Files:**
- Create: `App.Api/Auth/DevFileAuthEmail.cs`, `App.Api/Auth/StartupGuard.cs`, `App.Api/appsettings.Development.json`, `App.Api/DevPages/index.html`, `App.Api/DevPages/auth-check.js`
- Modify: `App.Api/Program.cs`, `scaffolds/csharp-api/.gitignore`
- Create (tests): `App.Tests/Auth/DevTests.cs`

**Interfaces:**
- Consumes: `IAuthEmail`, `LogOnlyAuthEmail`, `SecurityHeaders.Apply(h, hsts)` (Task 4).
- Produces: `static class AuthMailers { Type For(IHostEnvironment env) }` (`DevFileAuthEmail` in Development, else `LogOnlyAuthEmail`); `static class StartupGuard { void Check(IHostEnvironment env, IAuthEmail mailer, string origin) }`; `DevFileAuthEmail(IHostEnvironment, TimeProvider, ILogger<DevFileAuthEmail>) : IAuthEmail`.

- [ ] **Step 1: Write the failing tests.** `App.Tests/Auth/DevTests.cs` with a small `TestHostEnvironment(string name, string contentRoot) : IHostEnvironment`:
```csharp
    [TestCase("Development", typeof(DevFileAuthEmail))]
    [TestCase("Testing", typeof(LogOnlyAuthEmail))]
    [TestCase("Staging", typeof(LogOnlyAuthEmail))]
    [TestCase("Production", typeof(LogOnlyAuthEmail))]
    public void The_file_mailer_is_only_registered_in_Development(string env, Type expected) =>
        Assert.That(AuthMailers.For(new TestHostEnvironment(env, ".")), Is.EqualTo(expected));

    [TestCase("Development", true)]
    [TestCase("Testing", false)]
    [TestCase("Production", false)]
    public void The_app_registers_the_file_mailer_only_in_Development(string env, bool expected)
    // a factory per environment (_app.WithWebHostBuilder(b => b.UseEnvironment(env))); the factory's RecordingAuthEmail is
    // registered last, so the host starts everywhere. Assert factory.Services.GetServices<IAuthEmail>().Any(m => m is DevFileAuthEmail)
    // equals expected. This is the case that goes red if Program.cs registers the file mailer without AuthMailers.For.

    [Test] public async Task The_file_mailer_writes_one_file_per_email_named_by_time_and_kind()
    // temp content root, deleted in [TearDown]; two SendAsync calls with kind "confirm"; two files in .dev-mail/; no file name contains
    // "@" or the address; each name ends with "-confirm-<6 hex>.txt"; the captured log lines hold the kind and never the address or the link

    [TestCase("Production", typeof(LogOnlyAuthEmail), "https://app.example.test")]
    [TestCase("Production", typeof(DevFileAuthEmail), "https://app.example.test")]
    [TestCase("Staging", typeof(LogOnlyAuthEmail), "https://app.example.test")]
    [TestCase("Development", typeof(RecordingAuthEmail), "https://app.example.test")]
    [TestCase("Testing", typeof(RecordingAuthEmail), "https://staging.example.test")]
    public void The_startup_guard_refuses(string env, Type mailer, string origin) // Assert.Throws<InvalidOperationException>

    [TestCase("Production", "https://app.example.test")]
    [TestCase("Development", "http://localhost:5005")]
    [TestCase("Testing", "https://localhost")]
    public void The_startup_guard_allows(string env, string origin) // a RecordingAuthEmail in Production, LogOnly in the two local ones

    [Test] public void Production_with_a_dev_mailer_does_not_start()
    // _app.WithWebHostBuilder(b => { b.UseEnvironment("Production"); b.ConfigureServices(s => s.AddSingleton<IAuthEmail, LogOnlyAuthEmail>()); })
    // touching .Services throws; the exception or its inner exception names "email provider"

    [TestCase("Testing")]
    [TestCase("Production")]
    public async Task The_check_page_is_not_served_outside_Development(string env)
    // GET /dev/auth-check/ and /dev/auth-check/auth-check.js: 401 without a session (no static file matches, so the request
    // reaches the fallback policy, which covers requests with no endpoint), 404 once signed in (SeedUser + SignIn). Neither
    // answer carries the page. Production keeps the factory's RecordingAuthEmail, so it starts.

    [Test] public async Task The_check_page_is_served_in_Development() // 200 for both, and the page's CSP header is the recipe's, unchanged

    [Test] public async Task Development_sends_no_HSTS_and_Testing_does() // GET /health on a Development factory has no Strict-Transport-Security; on the default factory it starts "max-age="
```
  Write every body in full. Build a real instance of each mailer for the guard cases (`new LogOnlyAuthEmail(NullLogger<LogOnlyAuthEmail>.Instance)`, `new DevFileAuthEmail(env, TimeProvider.System, NullLogger<DevFileAuthEmail>.Instance)`, `new RecordingAuthEmail()`).

- [ ] **Step 2: Run them to see them fail.** Expected: build errors (`AuthMailers`, `StartupGuard`, `DevFileAuthEmail`).

- [ ] **Step 3: Write the mailer and the guard.**
  - `App.Api/Auth/DevFileAuthEmail.cs`:
```csharp
namespace App.Api.Auth;

// Development only (AuthMailers). Each email becomes one text file in .dev-mail/ (gitignored), link included,
// so I can confirm an address locally. Named by time and kind, never by address; the log says only that a file was written.
public sealed class DevFileAuthEmail(IHostEnvironment env, TimeProvider clock, ILogger<DevFileAuthEmail> log) : IAuthEmail
{
    public async Task SendAsync(string to, string kind, string link)
    {
        var dir = Path.Combine(env.ContentRootPath, ".dev-mail");
        Directory.CreateDirectory(dir);
        var name = $"{clock.GetUtcNow():yyyyMMdd-HHmmss-fff}-{kind}-{Guid.NewGuid().ToString("N")[..6]}.txt";
        await File.WriteAllTextAsync(Path.Combine(dir, name), $"To: {to}\nKind: {kind}\n\n{link}\n");
        log.LogInformation("auth.email.devFile kind={Kind}", kind);
    }
}

public static class AuthMailers
{
    public static Type For(IHostEnvironment env) => env.IsDevelopment() ? typeof(DevFileAuthEmail) : typeof(LogOnlyAuthEmail);
}
```
  - `App.Api/Auth/StartupGuard.cs`:
```csharp
namespace App.Api.Auth;

// Two rules, checked once at startup (spec § 6.3). A real host never runs with a mailer that sends nothing, and a host that
// calls itself Development or Testing must be on localhost, so a mistaken deploy fails here instead of serving the check page.
public static class StartupGuard
{
    private static readonly Type[] DevMailers = [typeof(LogOnlyAuthEmail), typeof(DevFileAuthEmail)];

    public static void Check(IHostEnvironment env, IAuthEmail mailer, string origin)
    {
        var local = env.IsDevelopment() || env.IsEnvironment("Testing");
        if (!local && DevMailers.Contains(mailer.GetType()))
        {
            throw new InvalidOperationException($"No real email provider is registered for {env.EnvironmentName}. Register one as IAuthEmail (README, adoption checklist).");
        }
        if (local && !(Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback))
        {
            throw new InvalidOperationException($"{env.EnvironmentName} needs a localhost Auth:Origin. A deployed host must never run as {env.EnvironmentName}.");
        }
    }
}
```
  - `Program.cs`: replace the copied `s.AddSingleton<IAuthEmail, LogOnlyAuthEmail>();` with `s.AddSingleton(typeof(IAuthEmail), AuthMailers.For(builder.Environment));`. Right after `var app = builder.Build();` add `StartupGuard.Check(app.Environment, app.Services.GetRequiredService<IAuthEmail>(), origin);`. After `app.UseStaticFiles();` add:
```csharp
if (app.Environment.IsDevelopment())
{
    // The manual auth check (README). Development only: everywhere else /dev/auth-check is 404.
    app.UseFileServer(new FileServerOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(app.Environment.ContentRootPath, "DevPages")),
        RequestPath = "/dev/auth-check",
    });
}
```
  (`dotnet ef` stops the host inside `Build()`, so the guard never runs at design time.)
  - `App.Api/appsettings.Development.json`:
```json
{
  "AllowedHosts": "localhost",
  "Auth": { "Origin": "http://localhost:5005", "PasskeyDomain": "localhost" }
}
```
  - `.gitignore`: add a block `# Data protection keys and the dev mailbox: never committed (README, Sign-in and permissions)` with `keys/` and `.dev-mail/`.

- [ ] **Step 4: Write the check page.** No inline script, no inline style, no design system (spec § 6.4).
  - `App.Api/DevPages/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Auth check</title>
  <script type="module" src="auth-check.js"></script>
</head>
<body>
  <main>
    <h1>Auth check</h1>
    <p>Development only. Run the steps in order. Each step writes pass or fail into its status line.</p>

    <label for="email">Email</label>
    <input id="email" type="email" autocomplete="username webauthn">
    <label for="password">Passphrase</label>
    <input id="password" type="password" autocomplete="new-password">

    <ol>
      <li><button type="button" id="run-sign-up">Sign up</button> <span id="step-sign-up" role="status"></span></li>
      <li>
        <label for="confirm-link">Confirmation link from the newest file in .dev-mail/</label>
        <input id="confirm-link" type="url" autocomplete="off">
        <button type="button" id="run-confirm">Confirm email</button> <span id="step-confirm" role="status"></span>
      </li>
      <li><button type="button" id="run-sign-in">Sign in</button> <span id="step-sign-in" role="status"></span></li>
      <li><button type="button" id="run-passkey-add">Register a passkey</button> <span id="step-passkey-add" role="status"></span></li>
      <li><button type="button" id="run-sign-out-1">Sign out before the passkey sign-in</button> <span id="step-sign-out-1" role="status"></span></li>
      <li><button type="button" id="run-passkey-sign-in">Sign in with the passkey</button> <span id="step-passkey-sign-in" role="status"></span></li>
      <li><button type="button" id="run-passkey-remove">Remove the passkey</button> <span id="step-passkey-remove" role="status"></span></li>
      <li><button type="button" id="run-totp-start">Start TOTP</button> <span id="step-totp-start" role="status"></span></li>
      <li>
        <label for="totp-code">Code from the authenticator app</label>
        <input id="totp-code" inputmode="numeric" autocomplete="one-time-code">
        <button type="button" id="run-totp">Turn on TOTP</button> <span id="step-totp" role="status"></span>
      </li>
      <li><button type="button" id="run-codes-once">Recovery codes show once</button> <span id="step-codes-once" role="status"></span></li>
      <li><button type="button" id="run-sign-out-2">Sign out at the end</button> <span id="step-sign-out-2" role="status"></span></li>
    </ol>

    <h2>Secrets</h2>
    <p>The TOTP key and recovery codes appear here, never in a status line.</p>
    <pre id="secrets"></pre>
  </main>
</body>
</html>
```
  - `App.Api/DevPages/auth-check.js`:
```js
// The manual browser check from the auth skill, one button per step. Each status line gets "<step>: pass" or
// "<step>: fail <key>" and nothing else; secrets go only into #secrets.
import { addPasskey, signInWithPasskey } from '/passkeys.js';

const $ = (id) => document.getElementById(id);
const email = () => $('email').value.trim();
const password = () => $('password').value;
const AUTH_KEY = /^[a-z0-9_]+(\.[A-Za-z]+)*$/; // "auth.error.wrongCode", "not_found", "status_404": a key, never free text
const busy = new Set();

// The line names its step, so a reader of the status lines never needs anything else on the page.
function report(step, ok, key) {
  $(`step-${step}`).textContent = `${step}: ${ok ? 'pass' : `fail ${AUTH_KEY.test(key ?? '') ? key : 'unexpected'}`}`;
}

function showSecret(label, lines) {
  $('secrets').textContent += `${label}\n${lines.join('\n')}\n\n`;
}

async function send(method, path, body, options = {}) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // 204, a redirect or an empty body
  }
  return { ok: res.ok, status: res.status, type: res.type, data };
}

const post = (path, body, options) => send('POST', path, body, options);
const keyOf = (r) => r.data?.error ?? `status_${r.status}`;
const hasCodes = (codes) => Array.isArray(codes) && codes.length > 0;

// One run per button at a time: a second click while the first is in flight does nothing,
// so "Start TOTP" can't mint a second key behind the one already on screen.
function step(name, run) {
  $(`run-${name}`).addEventListener('click', async () => {
    if (busy.has(name)) return;
    busy.add(name);
    $(`step-${name}`).textContent = `${name}: running`;
    try {
      await run();
    } catch {
      report(name, false, 'unexpected');
    } finally {
      busy.delete(name);
    }
  });
}

step('sign-up', async () => {
  const r = await post('/auth/sign-up', { email: email(), password: password() });
  report('sign-up', r.status === 202, keyOf(r));
});

step('confirm', async () => {
  const input = $('confirm-link');
  const params = new URLSearchParams(new URL(input.value).hash.slice(1));
  input.value = ''; // the token leaves the page as soon as it is used
  const r = await post('/auth/confirm-email', { userId: params.get('uid'), token: params.get('token') });
  report('confirm', r.ok, keyOf(r));
});

// A good sign-in answers 302 (LocalRedirect to "/"). Followed, it would end on a 404 and read as a failure, so the
// redirect is not followed: an opaque redirect is the pass. The browser stores the session cookie either way.
step('sign-in', async () => {
  const r = await post('/auth/sign-in', { email: email(), password: password() }, { redirect: 'manual' });
  report('sign-in', r.type === 'opaqueredirect', keyOf(r));
});

// The first factor brings ten recovery codes, shown once.
step('passkey-add', async () => {
  const result = await addPasskey('Auth check');
  if (hasCodes(result.recoveryCodes)) showSecret('Recovery codes (passkey)', result.recoveryCodes);
  report('passkey-add', result.ok === true && hasCodes(result.recoveryCodes), result.error ?? 'no_codes');
});

step('sign-out-1', async () => {
  const r = await post('/auth/sign-out');
  report('sign-out-1', r.status === 204, keyOf(r));
});

step('passkey-sign-in', async () => {
  const result = await signInWithPasskey();
  report('passkey-sign-in', result.ok === true, result.error);
});

step('passkey-remove', async () => {
  const list = await send('GET', '/account/passkeys');
  if (!list.ok || !Array.isArray(list.data) || list.data.length !== 1) {
    return report('passkey-remove', false, list.ok ? 'unexpected' : keyOf(list));
  }
  const removed = await send('DELETE', `/account/passkey/${encodeURIComponent(list.data[0].id)}`);
  const after = await send('GET', '/account/passkeys');
  report('passkey-remove', removed.status === 204 && after.ok && after.data?.length === 0, keyOf(removed));
});

step('totp-start', async () => {
  const r = await post('/account/mfa/enrol', { code: null });
  if (r.ok) showSecret('TOTP key (only the newest one works)', [r.data.key, r.data.uri]);
  report('totp-start', r.ok && typeof r.data?.key === 'string', keyOf(r));
});

// With the passkey gone, TOTP is the only factor, so turning it on brings fresh codes.
step('totp', async () => {
  const input = $('totp-code');
  const r = await post('/account/mfa/enrol', { code: input.value.trim() });
  input.value = ''; // the code leaves the page as soon as it is used
  if (hasCodes(r.data?.recoveryCodes)) showSecret('Recovery codes (TOTP)', r.data.recoveryCodes);
  report('totp', r.ok && hasCodes(r.data?.recoveryCodes), r.ok ? 'no_codes' : keyOf(r));
});

// Once TOTP is on, asking again is refused with auth.error.wrongCode (R:1005) and issues nothing. Any other answer
// (401, 429, 503) fails the step, so an expired session can't pass it.
step('codes-once', async () => {
  const r = await post('/account/mfa/enrol', { code: null });
  report('codes-once', r.status === 400 && r.data?.error === 'auth.error.wrongCode' && !hasCodes(r.data?.recoveryCodes), keyOf(r));
});

step('sign-out-2', async () => {
  const r = await post('/auth/sign-out');
  report('sign-out-2', r.status === 204, keyOf(r));
});
```
  Before running it, check two names against the copied recipe and fix the page if they differ: the property `ListPasskeys` returns per passkey (the page reads `id`; `Lists_the_account_s_passkeys_with_the_id_the_remove_button_sends` in HttpTests names it), and that a 400 from enrol on an enabled account is `auth.error.wrongCode` (R:1005).

- [ ] **Step 5: Run everything.** `dotnet test App.slnx`. Expected: all green, DevTests 21 runs among them. Then start the API once (`dotnet run --project App.Api`, stop it), and check `git status --short scaffolds/csharp-api`: no `keys/`, `.dev-mail/` or `*.db` entries.

- [ ] **Step 6: Format and commit.**
```bash
git add scaffolds/csharp-api/App.Api/Auth/DevFileAuthEmail.cs scaffolds/csharp-api/App.Api/Auth/StartupGuard.cs scaffolds/csharp-api/App.Api/appsettings.Development.json scaffolds/csharp-api/App.Api/DevPages scaffolds/csharp-api/App.Api/Program.cs scaffolds/csharp-api/.gitignore scaffolds/csharp-api/App.Tests/Auth/DevTests.cs
git commit -m "Development mailbox, startup guard and the auth check page"
```

---

### Task 8: Docs, workbench tests, CI and the PR

**Files:**
- Create: `scaffolds/csharp-api/CLAUDE.md`
- Modify: `scaffolds/csharp-api/README.md`, `tools/csharp-api.test.mjs`, `tools/csharp-wpf.test.mjs` and `tools/csharp-locales.test.mjs` (comments only), `.github/workflows/ward.yml` and `.github/dependabot.yml` (root), `index.html`, `guide/index.html`

**Interfaces:**
- Consumes: every file Tasks 1-7 created.
- Produces: the PR.

- [ ] **Step 1: Write the failing workbench tests.** In `tools/csharp-api.test.mjs`:
  - Add to the load-bearing list: `"CLAUDE.md"`, `"App.Core/Authorization/Policy.cs"`, `"App.Core/Interfaces/ICurrentUser.cs"`, `"App.Core/Interfaces/ITenantProvider.cs"`, `"App.Core/Models/NoteMember.cs"`, `"App.Data/AuthEntities.cs"`, `"App.Api/Auth/Sessions.cs"`, `"App.Api/Auth/Context.cs"`, `"App.Api/Auth/Passwords.cs"`, `"App.Api/Auth/Tokens.cs"`, `"App.Api/Auth/AccountService.cs"`, `"App.Api/Auth/DevFileAuthEmail.cs"`, `"App.Api/Auth/StartupGuard.cs"`, `"App.Api/Auth/Http/AuthEndpoints.cs"`, `"App.Api/Auth/Http/AppEndpoints.cs"`, `"App.Api/Auth/Http/Web.cs"`, `"App.Api/wwwroot/passkeys.js"`, `"App.Api/DevPages/index.html"`, `"App.Api/DevPages/auth-check.js"`, `"App.Api/appsettings.Development.json"`, `"App.Tests/Auth/TestUsers.cs"`, `"App.Tests/Auth/TestDb.cs"`, `"App.Tests/Auth/TestApp.cs"`, `"App.Tests/Auth/MatrixTests.cs"`, `"App.Tests/Auth/AgreementTests.cs"`, `"App.Tests/Auth/GuardTests.cs"`, `"App.Tests/Auth/HttpTests.cs"`, `"App.Tests/Auth/ConfigTests.cs"`, `"App.Tests/Auth/PrivacyTests.cs"`, `"App.Tests/Auth/CopyTests.cs"` and `"App.Tests/Auth/DevTests.cs"`.
  - New tests:
```js
test("scaffold CLAUDE.md carries the auth skill line", () => {
  assert.match(read("CLAUDE.md"), /Permissions live in `App\.Core\/Authorization\/`\. Follow the loadout `auth` skill; never check a role outside that folder\./);
});

test("README names the recipe it was synced from, and the csproj pins match it", () => {
  const sync = read("README.md").match(/Synced from loadout auth v(\d+\.\d+\.\d+), recipe verified (\d{2}\.\d{2}\.\d{4}) on packages (\d+\.\d+\.\d+)/);
  assert.ok(sync, "sync line missing");
  for (const [file, pkg] of [
    ["App.Data/App.Data.csproj", "Microsoft.AspNetCore.Identity.EntityFrameworkCore"],
    ["App.Data/App.Data.csproj", "Microsoft.EntityFrameworkCore.Sqlite"],
    ["App.Tests/App.Tests.csproj", "Microsoft.AspNetCore.Mvc.Testing"],
  ]) assert.match(read(file), new RegExp(`Include="${pkg.replaceAll(".", "\\.")}" Version="${sync[3].replaceAll(".", "\\.")}"`), `${pkg} is not on ${sync[3]}`);
});

test("gitignore keeps keys and the dev mailbox out", () => {
  const gitignore = read(".gitignore");
  assert.match(gitignore, /^keys\/$/m);
  assert.match(gitignore, /^\.dev-mail\/$/m);
});
```
  Run `node --test "tools/csharp-api.test.mjs"`. Expected: the three new tests and the file list fail.

- [ ] **Step 2: Write the docs.**
  - `scaffolds/csharp-api/CLAUDE.md`:
```markdown
# CLAUDE.md

Permissions live in `App.Core/Authorization/`. Follow the loadout `auth` skill; never check a role outside that folder.

- Database access lives only in `App.Data/` and `App.Api/Auth/`. Every `.Notes` read in `App.Data/Repositories/` applies the filter it was passed, and `NoteService` builds that filter from `NotePolicy.Filter`. `GuardTests` fails on anything else.
- Claude never reads `.dev-mail/` or `keys/`: the files hold sign-in links and signing keys.
```
  - `README.md`, in my voice, no em dashes:
    - "Folder structure": `App.Tests/` says NUnit; `App.Api/` mentions `Auth/`, `wwwroot/passkeys.js` and `DevPages/`; `App.Core/` mentions `Authorization/`.
    - New section "Sign-in and permissions": why two endpoint styles (auth is the recipe's Minimal API so a security fix syncs in as a near-copy; Notes is a controller because that's the scaffold's teaching shape); a short version of the spec § 3 table; the dev mailbox (`App.Api/.dev-mail/`, one file per email, paste the link into the check page); the check page at `http://localhost:5005/dev/auth-check/` and the steps it walks; a frontend on another port uses its dev server's proxy, so requests reach the API from the same origin; and the line `Synced from loadout auth v0.8.0, recipe verified 10.11.2026 on packages 10.0.14.`
    - New section "Before you ship (adoption checklist)": the seven items of spec § 7, one line each.
    - In "Sign-in and permissions", one paragraph on tenants: sign-up gives every account its own tenant (the recipe's rule, kept so recipe syncs stay near-copies), so sharing only reaches accounts in the same tenant. It gives the one-line SQL from `App.Api.http` that moves an account into another tenant for local testing, and says a real project decides how accounts join a tenant (an invite, an admin, a domain rule).
    - "Request lifecycle": the POST walkthrough gains the cross-site guard, the session, the second-factor gate, `NotePolicy.Can(create)` in `NoteService`, and the 401/403/404 answers.
    - "Working rules": add the guard-folder rule. "First 5 steps" stays as it is.
  - `tools/csharp-wpf.test.mjs` line 6: the comment becomes "CI runs no dotnet for this scaffold (only csharp-api's suite runs in Ward's dotnet job), so this is the guard that sees a WPF layout regression on every pull request. dotnet test runs the real audit."
  - `tools/csharp-locales.test.mjs` lines 4-5: "CI runs no dotnet, so this is the guard that sees a bundle edit on every pull request" becomes "Only csharp-api's suite runs in CI (Ward's dotnet job), so this is the guard that sees a bundle edit in the other C# scaffolds on every pull request." Both comments go stale the moment Ward's dotnet job runs.
  - `index.html` and `guide/index.html`: the csharp-api card and the `id="csharp-api"` guide section each gain one sentence: "Ships sign-in (passkeys, TOTP, recovery codes, server-side sessions) and permissions in one folder, with the Note sample showing both." Match the surrounding markup; run the layout audit on both pages if the card's text length changes its row.
  - Root `.github/workflows/ward.yml`: `dotnet: "scaffolds/csharp-api/App.slnx"`, `dotnet-ef-project: "scaffolds/csharp-api/App.Data"`, and a new `dotnet-ef-startup-project: "scaffolds/csharp-api/App.Api"` line with the same comment style as the scaffold's own caller.
  - Root `.github/dependabot.yml` (decided by me 10.11.2026): a `nuget` entry for `directory: /scaffolds/csharp-api`, weekly, with minor and patch grouped in one PR, in the style of the existing entries. A bump also fails the pin-versus-sync-line test in `tools/csharp-api.test.mjs` until the recipe is re-verified on the new version. That is intended: a package bump in the scaffold is a recipe re-verification, not an auto-merge.

- [ ] **Step 3: Run the workbench suite.** From the root: `node --test "tools/*.test.mjs"` and `node tools/check-links.mjs`. Expected: all green. From the scaffold: `dotnet build App.slnx`, `dotnet format App.slnx --verify-no-changes`, `dotnet test App.slnx`, the pending-model check. Write the exact passed count into the ledger; it must be at least 88 recipe runs plus 32 rewritten plus the new ones, with 0 skipped.

- [ ] **Step 4: Commit, push and open the PR.**
```bash
git add scaffolds/csharp-api/CLAUDE.md scaffolds/csharp-api/README.md tools/csharp-api.test.mjs tools/csharp-wpf.test.mjs tools/csharp-locales.test.mjs .github/workflows/ward.yml .github/dependabot.yml index.html guide/index.html
git commit -m "Document sign-in and permissions in csharp-api and run its suite in Ward"
git push -u origin feat/csharp-api-auth
```
  Open the PR to `main` with `gh pr create`. Title: "Sign-in and permissions in the csharp-api scaffold". Body, first person, no em dashes: what it adds (two sentences), the test count read off Step 3, the deviations from the recipe (spec § 4 plus the ones this plan added: `ICurrentUser`, `Source.Root`, cascade keys for account data, the duplicate-key and blank-title field rules, the guard's extra service rule and its wider role-check, endpoint-folder and member-row matches, the AgreementTests user rows the foreign keys need) and two places the build differs from the spec's wording: the check page is `DevPages/index.html` (spec § 6.4 says `auth-check.html`) so `UseFileServer` serves it as the folder's default document, and outside Development `/dev/auth-check/` answers 401 without a session and 404 with one (spec § 6.4 says 404), because the locked fallback policy covers requests that match no endpoint. Then the **recipe sync-back list** from the ledger. Then confirm Ward's dotnet job ran and is green on the PR; if it fails, read its log and fix it on the branch before Task 9.

---

### Task 9: Browser check (me and Malin, together)

**Files:** none changed unless a step fails.

- [ ] **Step 1: Create the database and start the API.** From `scaffolds/csharp-api`, if `App.Api/app.db` does not exist yet: `dotnet ef database update --project App.Data --startup-project App.Api` (the app never creates its schema itself, so without this the first sign-up answers 500). Then start it through `.claude/launch.json` and `preview_start`. That file already exists with a `web-react-ts-preview` entry; adding a `csharp-api` entry edits `.claude/`, so ask before adding it. The entry runs `dotnet run --project scaffolds/csharp-api/App.Api --launch-profile http` on port 5005 with `DOTNET_CLI_TELEMETRY_OPTOUT=1` set for the process (an `env` block if the launcher reads one; otherwise `bash` with `-c "DOTNET_CLI_TELEMETRY_OPTOUT=1 exec dotnet run ..."`). Open `http://localhost:5005/dev/auth-check/` in the browser pane. Before any step runs, read the pane's browser version once with `javascript_tool` (`navigator.userAgent`, nothing else) for the PR comment.

- [ ] **Step 2: Hand over the secret parts.** Tell Malin, in one message: I fill the email `check@example.test` and the passphrase `AuthApiFactory.NewTestPhrase`, and click each step. Not `TestPhrase`: it appears 391 times in Pwned Passwords (range API, checked 10.11.2026), and Development runs the real breach check, so sign-up would answer `auth.error.passwordRejected`. `NewTestPhrase` is still one of the test constants (spec § 6.5) and is not in the list. She approves every Windows Hello prompt, opens the newest `.dev-mail/` file and pastes the link into the confirm field, copies the TOTP key from the Secrets box into her authenticator and types the code into the code field, and looks after the recovery codes. She tells me "done" in chat after each hand-off and never pastes a link, key or code into the chat. I read nothing but the status lines.

- [ ] **Step 3: Collect the refs, then run the steps.** `find` matches an element's role, name and text, never its id, so the refs are collected once, right after the page loads, while it holds no secret:
  - one `find` per control by its full visible label: "Email", "Passphrase", "Sign up", "Confirm email", "Sign in" (the first match; the second is "Sign in with the passkey"), "Register a passkey", "Sign out before the passkey sign-in", "Sign in with the passkey", "Remove the passkey", "Start TOTP", "Turn on TOTP", "Recovery codes show once", "Sign out at the end";
  - one `find` with the query `status`, which returns the eleven `role="status"` elements in page order (plus two static sentences that mention status lines).

  From then on, no `find` and no other read of the page. Fill the two fields with `form_input` by ref, click with `computer` `left_click` by ref, and after each click read only that step's status with `read_page` and `ref_id` set to its status ref. Each line names its step (`sign-in: pass`), which confirms the ref. No screenshots, no `get_page_text`, no full-page `read_page`, no `find` after the first secret appears. If a ref goes stale, reload the page (that clears the Secrets box), sign in again and collect the refs again.

- [ ] **Step 4: Record and close.** Expected: eleven `pass` lines. Write them into the PR as a comment ("Browser check <today, dd.mm.yyyy>: 11/11 pass, Windows Hello, browser pane <version from Step 1>").
  - **A step says `fail auth.error.reauthRequired`:** adding or removing a factor needs a session under 10 minutes old. Click the latest sign-in step again (the passkey one while a passkey exists, else the password one) and repeat the failed step.
  - **A rerun** uses a new address (`check2@example.test`, and so on). An address that already has an account gets an "account-exists" mail with no link, and each address gets at most three auth mails an hour.
  - **The pane can't run WebAuthn** (the passkey step fails with `auth.error.passkeyUnknown` or `auth.error.noPasskeyHere` before any Windows Hello prompt shows): stop and ask Malin. Don't switch browsers on my own.
  - **`http://localhost` refuses the Secure cookie or WebAuthn:** move `Auth:Origin` in `appsettings.Development.json` to `https://localhost:7005`, run on the `https` profile, update the README and `App.Api.http`, commit, and run the check again. The https profile needs a trusted dev certificate. `dotnet dev-certs https --check --trust` only reads; if it reports none, Malin runs `dotnet dev-certs https --trust` herself, because it changes the Windows certificate store, which I never do.

  Stop the server and confirm `git status` shows no `keys/`, `.dev-mail/` or database files.

---

### Task 10: Release (only on Malin's go after the merge)

- [ ] **Step 1:** Wait for Malin to merge the PR. Do not merge it.
- [ ] **Step 2:** On her yes: `git checkout main && git pull`, tag `v2.24.0` on the merge commit, push the tag, and cut a GitHub Release marked Latest with notes in my voice: what the scaffold now ships, the browser-check result, and that the design system is unchanged at 3.11.1.
- [ ] **Step 3:** Delete `feat/csharp-api-auth` and `docs/csharp-api-auth-spec` locally and on the remote once the Release exists.

---

## Considered and rejected (stress test)

- **Eleven `role="status"` regions on the check page.** My accessibility rule asks for few live regions per page. Spec § 6.4 puts one beside each step, only the clicked step's region changes, and the page is a Development-only tool, so they stay.
- **The Secrets box overflows at 320 px, and the page shows error keys instead of copy.** The page has no stylesheet by design (spec § 6.4), runs in a desktop browser pane, and the keys are what the check reads. A long otpauth URI scrolling sideways costs nothing there.
- **The owner's member list shows whether a shared email matched.** The 204 rule keeps other tenants and unconfirmed addresses out of view, and they never reach the list. What the owner learns is which confirmed accounts are in their own tenant, which a tenant's members already know of each other.
- **Two shares of one email at the same moment.** Both pass the "already a member" check, and the second save hits the primary key and answers 500. Nothing is damaged and a retry answers 204. Catching it needs an EF exception type in Core, which stays package-free.
- **A third startup-guard rule for `AllowedHosts`.** `appsettings.Development.json` sets `AllowedHosts` to `localhost`, so a public host running as Development already answers 400 to every request. The gap needs both that and `Auth:Origin` overridden by hand, and the README checklist names both settings.
- **Per-line guard regexes can be dodged on purpose** (`Set<App.Core.Models.Note>`, a local variable named `filter`). The guard catches drift, not intent. Closing every spelling needs a Roslyn analyzer, which is out of scope here and in the recipe.
- **`keys/` in `.gitignore` matches a folder named `keys` at any depth.** A source folder with that name is unlikely, and a narrower `/App.Api/keys/` would miss the data protection keys when the app runs from another working directory.

> Stress-tested 2026-11-10 (skill 5065c26): 21 applied, 3 adapted, 2 decided by me.
