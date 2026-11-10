# csharp-api auth: sign-in and permissions in the scaffold

- **Date:** 10.11.2026
- **Home:** `scaffolds/csharp-api/`, plus `tools/csharp-api.test.mjs`, the dashboard and guide copy, and `.github/workflows/ward.yml`
- **Source:** loadout `auth` skill v0.8.0, C# recipe `references/recipes/csharp-ef.md` and the C# section of `references/tests.md`, verified 10.11.2026 on SDK 10.0.403 and packages 10.0.14
- **Piece:** 2 of the auth baseline (piece 1 is the loadout skill itself)
- **Amends:** the 16.07.2026 csharp-api spec (`2026-07-16-csharp-api-scaffold.md`): § 3 "No auth", § 4 "Test framework: xUnit" and § 9 "PATCH / partial updates" no longer hold

## 1. Why

The auth skill holds the rules and a C# recipe that passes 88 test runs. As long as that recipe only lives as snippets, every new project has to assemble it again, so the first real login would arrive half-built. This piece makes the recipe live in the `csharp-api` scaffold. A project copied from it starts with passkeys, TOTP, recovery codes, sessions, throttling, security headers and permissions working and tested, and the Note sample shows the permission pattern end to end.

## 2. Decisions (locked 10.11.2026)

| Question | Decision |
|---|---|
| How much of the recipe | All of it, live: sign-in, passkeys, TOTP, recovery codes, sessions, throttle, CSP and headers, permissions, every recipe test plus the plumbing tests. |
| Shape | Hybrid. Auth plumbing stays as close to the recipe as possible: Minimal API groups in `App.Api/Auth/`, so a recipe security fix syncs in as a near-copy. Notes keeps its controller and gets permissions through the layers. The README explains why there are two endpoint styles. |
| Test framework | NUnit, matching the recipe and `csharp-layered`. The existing xUnit suite is rewritten once; the auth tests copy over with only small changes. |
| Sample shape | Note takes the recipe Board's full shape: OwnerId, TenantId, Members, Archived. Actions: read, create, update, delete, archive, share. Single-tenant projects keep one tenant row. |
| Which scaffolds | `csharp-api` only. See § 11. |
| Browser check | A dev-only check page, served only in Development. The plan's last task is a browser check Claude drives in the browser pane while I approve the passkey prompt. I type the TOTP codes and handle the recovery codes myself; Claude reads pass or fail only. |
| CI | Turn on Ward's dotnet module for this scaffold, so every PR builds, format-checks, tests and checks for pending EF model changes. |

## 3. Placement

| Recipe piece | Home |
|---|---|
| Role, UserContext, MfaPolicy, PolicyBinder, NoteActions, NotePolicy, the four exceptions (NotFound, Forbidden, UnknownField, InvalidField), NoteCan | `App.Core/Authorization/` (pure `Expression`, so Core keeps zero packages) |
| Note, NoteMember | `App.Core/Models/` |
| ICurrentUser, ITenantProvider | `App.Core/Interfaces/` |
| NoteService (filters reads, calls Can on writes, applies field rules, builds flags) | `App.Core/Services/` |
| AppUser, UserSession, AuthEvent, `AppDbContext : IdentityDbContext`, the named `Tenant` query filter, NoteRepository (the filter is a required parameter) | `App.Data/` (gains the Identity EF package) |
| Sessions, ticket store, passwords, tokens, recovery codes, throttle, mailer, AccountService, UserContextMiddleware, SecondFactorGate | `App.Api/Auth/` |
| AuthEndpoints, account endpoints (the recipe's AppEndpoints minus the board routes), Web.cs | `App.Api/Auth/Http/` |
| NotesController | `App.Api/Controllers/` (calls the service, no permission checks of its own) |
| `passkeys.js` | `App.Api/wwwroot/` (served in every environment, projects build on it) |
| Check page | `App.Api/DevPages/` (served in Development only, § 6.4) |

**Guard folders:**
- Role checks live only in `App.Core/Authorization/`.
- DB access lives only in `App.Data/` and `App.Api/Auth/`.
- Every `.Notes` line in `App.Data/Repositories/` either applies the filter it was passed or adds or removes a row.
- NoteService builds that filter from `NotePolicy.Filter`.

The recipe's guard tests are rewritten for these folders.

## 4. Deviations from the recipe

Each one is deliberate.

1. **Copy goes into the existing bundles.** The recipe's `Resources/auth.en.json` and `auth.nb.json` merge into `App.Api/Locales/en.json` and `nb.json` as `auth.*` keys. This follows the locale standard (one bundle per language). The recipe's copy test reads `Locales/`, and `tools/csharp-locales.test.mjs` keeps checking key parity between en and nb.
2. **Errors stay localized ProblemDetails.** The error mapper keeps the scaffold's localized ProblemDetails and adds `error` and `field` as extension members, because the recipe's HTTP tests and `passkeys.js` read `body.error`.
3. **No HSTS in Development.** The recipe sets HSTS by hand because `UseHsts` skips localhost. On `https://localhost:7005` that would pin HSTS for every dev server on localhost in the browser. The scaffold sends HSTS in every environment except Development. The `Testing` environment still sends it, so the recipe's header test keeps passing, and a new test asserts that Development leaves it out.
4. **Connection string key stays `Default`.** The recipe reads `ConnectionStrings:App`. The scaffold keeps `Default`, because its README commands and tests already use it.
5. **Notes routes beyond the recipe.** The recipe's Board has only GET, PATCH and DELETE routes. Create, archive and share exist in its policy but have no endpoint. The scaffold adds create and share (§ 5), each with its own HTTP tests. Archive stays reachable only through PATCH with `archived`, as in the recipe.
6. **A file mailer for Development** (§ 6.3). The recipe has only `LogOnlyAuthEmail`, which logs the kind of email and sends nothing. That leaves no way to confirm an email locally.

## 5. Notes API

`NotesController` calls `NoteService` and checks no permissions itself. A filter miss returns 404 (enumeration principle); a note you can read but not act on returns 403.

Every Notes route sits behind the same pipeline as the recipe's account routes: no session returns 401, a session waiting on its second factor is stopped by `SecondFactorGate`, and every unsafe method (POST, PATCH, DELETE) passes the recipe's cross-site guard. The Notes routes get their own body limit of 32 KB, which fits a 4000-character body in any script; the auth groups keep the recipe's 16 KB.

| Route | Behaviour |
|---|---|
| `GET /api/notes` | Reads through `NotePolicy.Filter`. Each DTO carries `can: { edit, delete }` flags, so the UI never works out the rules itself. |
| `GET /api/notes/{id:int}` | 404 when the filter misses. |
| `POST /api/notes` | Stamps OwnerId and TenantId from the signed-in user, then calls `Can(create)`, which needs a verified email. Returns 201 with `CreatedAtAction`. |
| `PATCH /api/notes/{id:int}` | Replaces `PUT`. Takes a raw `JsonElement`, and every key passes the field rules: `title` (string, 1-200) and `body` (string, 0-4000) need update; `archived` (bool) needs archive. Unknown key 400 `unknown_field`, a key given twice 400 `invalid_field`, wrong type 400 `invalid_field`, a non-object body 400 `unknown_field` `(body)`, a field you may not set 403 with the field name. |
| `DELETE /api/notes/{id:int}` | `Can(delete)`, 204. Its member rows go with it (cascade delete). |
| `POST /api/notes/{id:int}/members` | Body `{ "email": "<address>" }`, never in the URL. `Can(share)`. Adds the user with that confirmed email if they are in the same tenant. The answer is 204 every time: unknown email, another tenant, an existing member or the owner all return 204 and change nothing, so the route can't be used to find accounts. |
| `DELETE /api/notes/{id:int}/members/{userId}` | `Can(share)`. 204, and a non-member is also 204. The owner gets member ids from the DTO. |

Note keeps `Body`, `CreatedAt` and `UpdatedAt` from the current scaffold. `TimeProvider` still owns the timestamps. The DTO becomes `NoteDto(Id, Title, Body, Archived, CreatedAt, UpdatedAt, Can, Members)`. `Members` is a list of `{ id, email }` for the owner and `null` for everyone else, so an email is only shown to the person who typed it in. `CreateNoteDto` keeps its DataAnnotations; `UpdateNoteDto` goes away because PATCH reads the raw element. `App.Api.http` covers every route, including sign-in first.

## 6. Data, versions and config

### 6.1 Versions

- Bump `Microsoft.EntityFrameworkCore.Sqlite`, `Microsoft.EntityFrameworkCore.Design`, `Microsoft.AspNetCore.OpenApi` and `Microsoft.AspNetCore.Mvc.Testing` from 10.0.10 to 10.0.14, the versions the recipe was verified on.
- Add `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.14 to `App.Data`.
- Bump the `dotnet-ef` local tool to 10.0.14.
- Swap xUnit for NUnit 4.3.2, NUnit.Analyzers 4.7.0 and NUnit3TestAdapter 5.0.0.
- Installing packages needs my go-ahead, so the plan has a gated step for it.
- `global.json` stays at 10.0.300 with `rollForward: latestFeature`, because `tools/csharp-api.test.mjs` locks it to `csharp-layered`. The recipe's SDK 10.0.403 is a feature band above that, so the pin already allows it.
- `Directory.Build.props` already sets `TreatWarningsAsErrors` (the recipe requires it) and `AnalysisLevel` `latest-recommended` (the recipe does not). Recipe code that trips a recommended analyzer gets fixed in the scaffold, not suppressed, and the fix is noted for a recipe sync back to loadout.

### 6.2 Migration

A new `Init` migration replaces `20261012184235_Init`. It holds Identity schema v3, notes, note members, user sessions and auth events. Replacing the migration is safe because the scaffold has no deployed database: a project copies the scaffold and owns its migrations from then on. The app never calls `EnsureCreated`; the test factory still does, as the recipe and the current scaffold both do.

### 6.3 Mailers and the startup guard

- `LogOnlyAuthEmail` (recipe): logs `auth.email.queued kind=...` and sends nothing. It is the registered mailer in `Testing`.
- `DevFileAuthEmail` (new, Development only): writes each email as one text file to `App.Api/.dev-mail/` (gitignored), link included. I open the file and click the link myself. Claude never reads those files or a log line containing a link, because a confirmation or reset link is a token.
- `DevFileAuthEmail` names each file by timestamp and email kind, never by address, and logs only that a file was written.
- **Startup guard** (new), two rules:
  - Outside Development and Testing, the app refuses to start while the mailer is `LogOnlyAuthEmail` or `DevFileAuthEmail`, with a message saying to register a real provider.
  - In Development and Testing, the app refuses to start unless `Auth:Origin` is a localhost origin. A host deployed by mistake with either environment name then fails at startup, instead of serving the check page and writing live links to disk.
  - `ConfigTests` covers both rules, each with a case that must fail.

### 6.4 Development config and the check page

- `appsettings.Development.json`: `Auth:Origin` is `http://localhost:5005` (the scaffold's http profile), `Auth:PasskeyDomain` is `localhost`, and `AllowedHosts` is `localhost`.
- `appsettings.json`: `AllowedHosts` becomes the placeholder `app.example.test`, as in the recipe. The recipe's config test fails on `*`, and the adoption checklist (§ 7) says to set the real host.
- Localhost is a secure context, so WebAuthn and Secure cookies work on `http://localhost:5005`. The browser check confirms this; if a browser refuses, the `https` profile (port 7005) is the fallback, and `Auth:Origin` in Development moves to it.
- `Auth:KeysPath` defaults to `keys`. `.gitignore` gains `keys/` and `.dev-mail/`.
- **Check page:** `App.Api/DevPages/auth-check.html` plus `auth-check.js`, served at `/dev/auth-check` through a static file provider mapped only when the environment is Development. Everything else returns 404 there (tested in `Testing` and `Production`). The page has no inline script and no inline style, so the recipe's CSP holds unchanged. It walks the recipe's manual check: sign up, confirm (through the dev mailbox), sign in, register a passkey, sign out, sign in with the passkey, remove it, enrol TOTP, check that recovery codes show once, sign out. Each step writes `pass` or `fail` plus an error key into a `role="status"` element with an id per step. Secrets (the TOTP key and URI, recovery codes) render into a separate element, with no secret text inside the status elements. The page is plain HTML without the design system: every input has a `<label>`, the email input has `autocomplete="username webauthn"`, the TOTP input has `autocomplete="one-time-code"` and `inputmode="numeric"` and accepts paste, and the status elements exist from page load.
- CORS: the `dev` policy stays as it is (localhost origins, no credentials). A frontend on another port uses its dev server's proxy, so requests reach the API from the same origin and pass the recipe's cross-site guard. The README says so.

### 6.5 Browser check rules (the plan's last task)

- Claude starts the API in Development and opens the check page in the browser pane.
- I approve the Windows Hello passkey prompt, type every TOTP code and handle the recovery codes. I also open the dev mailbox files and click the links.
- Claude reads only the `role="status"` elements, by id, through `find` or `read_page` scoped to them. No screenshots, no `get_page_text` and no full-page `read_page` while the check runs, because the page shows a TOTP key and recovery codes.
- The sign-up passphrase is the recipe's test phrase, from the test constants.

## 7. Docs

- **Scaffold `CLAUDE.md`** (new file), with the skill's line: "Permissions live in `App.Core/Authorization/`. Follow the loadout `auth` skill; never check a role outside that folder."
- **README, new section "Sign-in and permissions":**
  - why there are two endpoint styles
  - where each piece lives (the § 3 table, short)
  - the dev mailbox and the check page
  - the line "Synced from loadout auth v0.8.0, recipe verified 10.11.2026"
- **README, adoption checklist:**
  - swap the mailer for a real provider, which is a processor: DPA and region
  - set `AllowedHosts`, `Auth:Origin` and `Auth:PasskeyDomain`
  - set `Auth:TrustedProxies` behind a proxy
  - put `Auth:KeysPath` on persistent storage on the host
  - name the Pwned Passwords range call in the privacy notice
  - the throttle is in memory, so a multi-instance deploy moves it to the database
  - run the manual browser check before shipping passkeys
- **README updates:** "Request lifecycle" adds the second-factor gate and the policy step to its POST walkthrough. "Working rules" adds the guard-folder rule. The "First 5 steps" EF commands stay as they are.
- **Workbench dashboard and guide:** the csharp-api card and guide entry mention sign-in and permissions.

## 8. Tests

### 8.1 Scaffold (`App.Tests`, NUnit)

- **Existing suite rewritten:** the five xUnit files (`NoteServiceTests`, `JsonStringLocalizerTests`, `LocalizationTests`, `NoteRepositoryTests`, `NotesApiTests`) move to NUnit and the new Note shape. Their cases stay or get replaced by an equal or stronger case; none are dropped.
- **Account data reaches notes:** deleting an account deletes the notes the user owns (with their member rows) and removes the user from other notes. The account export lists owned notes and memberships. The recipe's `PrivacyTests` (no rows left after delete) and the export test grow to cover both.
- **No network in tests:** the test factory replaces `IBreachedPasswords`, so the suite, and Ward's dotnet job, makes no call to Pwned Passwords.
- **Recipe tests copied:** `MatrixTests`, `AgreementTests`, `GuardTests`, `HttpTests`, `ConfigTests`, `PrivacyTests` and `CopyTests`, plus the `TestApp` helpers. That is 68 methods and 88 runs, adapted from Board to Note and to the folders in § 3. Each guard and matrix test keeps its negative fixture that proves it can go red.
- **New tests:**
  - create, share and unshare routes: allowed and forbidden cases; share returns 204 with no change for an unknown email, a user in another tenant, an unconfirmed email, an existing member and the owner
  - `Members` is filled for the owner and `null` for a member
  - Notes routes return 401 without a session, are stopped by the second-factor gate, reject a cross-site unsafe request, and return 413 above 32 KB (on Kestrel)
  - `body` field rules and a duplicate key
  - the check page returns 404 outside Development
  - HSTS is absent in Development and present in `Testing`
  - the startup guard refuses `Production` with either dev mailer
  - `DevFileAuthEmail` writes one file per email and is never registered outside Development
- **Recipe traps carried over:**
  - every fixture gets its own factory
  - every hand-built context comes from TestDb, which sets Identity `SchemaVersion` to Version3 and maps the passkey table
  - the test client sends `Origin` on every request
  - the 413 test runs on Kestrel
  - test constants are named `TestPhrase` and `NewTestPhrase`, so the pre-push secret scan doesn't block them

### 8.2 Workbench (`tools/csharp-api.test.mjs`)

- The load-bearing file list gains the auth files, `wwwroot/passkeys.js`, the check page and `CLAUDE.md`.
- New checks:
  - `CLAUDE.md` carries the skill line
  - the README carries the sync line
  - the csproj pins match the versions the sync line names
  - `.gitignore` covers `keys/` and `.dev-mail/`
- The existing checks keep passing: App.Core dependency-free, Program never calls `EnsureCreated`, SDK pin matches `csharp-layered`, and so on.

### 8.3 CI (`.github/workflows/ward.yml`)

- `dotnet: scaffolds/csharp-api/App.slnx`
- `dotnet-ef-project: scaffolds/csharp-api/App.Data`
- `dotnet-ef-startup-project: scaffolds/csharp-api/App.Api`

The `ward / gate` required check already needs Ward's dotnet job, so a red dotnet run blocks the merge. Ward's dotnet job then picks up the scaffold's own `global.json`, builds with warnings as errors, runs `dotnet format --verify-no-changes`, runs the tests and checks for pending model changes on every PR. Workbench CI has run no dotnet until now, a convention the comment in `tools/csharp-wpf.test.mjs` records. That comment gets updated to say csharp-api is the exception. The other C# scaffolds stay out of CI.

## 9. Acceptance

- `dotnet build`, `dotnet format --verify-no-changes` and `dotnet test` all pass in `scaffolds/csharp-api`. The run reports at least the recipe's 88 runs plus the rewritten and new tests, with none skipped.
- `dotnet ef migrations has-pending-model-changes` reports no changes.
- `node --test "tools/*.test.mjs"` passes, and so does `check-links`.
- The Ward dotnet job passes on the PR.
- The browser check passes every step, read off the status elements.
- `git status` after a dev run shows no `keys/`, `.dev-mail/` or database files.

## 10. Version and release

Workbench v2.24.0 on ship (minor: a scaffold gains a capability). The design system is untouched and stays at 3.11.1. Merge, tag and Release only on my go.

## 11. Out of scope

- `web-react-ts`: waits on piece 5, the TypeScript lane.
- `csharp-wpf`: local-only; it takes the local-PWA recipe's accounts-ready shape when it gets accounts.
- `csharp-layered` and `csharp-console`: no users.
- A change-email endpoint, SSO/OIDC and a real mail provider: the recipe leaves these to the project, and the README checklist names them.
- Moving the throttle to the database: a multi-instance concern, named in the checklist.

## 12. Considered and rejected (stress test)

- **Timing differences on share.** Share always does one user lookup, so the answer time hardly differs between a known and an unknown email. A project that shares across large tenants can add the recipe's timing-parity padding.
- **Clearing `.dev-mail/` on startup.** The links in it expire (reset 15 minutes, confirmation 24 hours), the folder is gitignored, and the startup guard keeps the file mailer on localhost.
- **Archived notes stay editable by members.** The recipe treats archived as a flag, not a lock. A project that wants archived notes read-only adds that rule in `NotePolicy`.
- **Concurrent PATCHes.** Last write wins, as the 16.07.2026 spec accepted. A concurrency token stays a project decision.
- **Title length in UTF-16 units.** `MaxLength` and the field rule count UTF-16 code units, so 200 emoji count as 400. Fine for a sample.
- **Ward's `ci.yml` on the floating `@v1` tag.** The other Ward jobs pin a full SHA. Ward is my own repo and the dotnet job gets no secrets and only read access, so the pin stays as it is in this piece.


> Stress-tested 2026-11-10 (skill 5065c26): 10 applied, 1 adapted, 1 decided by me.
