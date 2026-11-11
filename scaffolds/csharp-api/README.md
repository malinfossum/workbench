# csharp-api

C# starter for web APIs. Four projects (controllers, domain, data, tests) wired in the
layered API + repository shape: controller → service → repository → DbContext.

## Folder structure

- `App.Core/`: entities, DTOs, service, repository interface. No packages, no IO, no EF.
  `Authorization/` holds every permission rule (roles, `NotePolicy`, the field rules).
- `App.Data/`: EF Core + SQLite: `AppDbContext`, repository implementations, migrations.
- `App.Api/`: controllers and `Program.cs` (DI wiring only). The only project that runs.
  `Auth/` holds sign-in, sessions and the account endpoints. `wwwroot/passkeys.js` is the
  browser side of passkeys. `DevPages/` is the check page, served in Development only.
  `Localization/` reads `Locales/<tag>.json` (same flat keys as the web i18n library)
  and resolves the request language from `Accept-Language`.
- `App.Tests/`: NUnit. Unit tests fake the repository; integration tests boot the real
  pipeline via `WebApplicationFactory` on in-memory SQLite.

## First 5 steps in a new project

1. Copy this folder to wherever the project lives.
2. Rename `App.slnx`, each `App.*` project + folder, and `App.Api.http` to `<YourName>.*`
   (find/replace `App.` across files).
3. `dotnet tool restore && dotnet restore && dotnet build && dotnet test`
4. Create the database from the `Init` migration the scaffold ships:
   `dotnet ef database update --project <YourName>.Data --startup-project <YourName>.Api`
   Every model change after that needs `dotnet ef migrations add <Name>` with the same two flags,
   committed together with the change: the Ward caller in `.github/workflows/ward.yml` runs the
   EF pending-model check and is red until the migration exists.
5. `dotnet run --project <YourName>.Api` and send the requests in `<YourName>.Api.http`.

## Sign-in and permissions

Passkeys first, then a passphrase, with TOTP and recovery codes as the second factor and
server-side cookie sessions. Every permission rule sits in `App.Core/Authorization/` and
doubles as the query filter, so a rule and the rows it hides cannot drift apart. The
design follows the loadout `auth` skill; the spec is
`docs/specs/2026-11-10-csharp-api-auth.md`.

**Two endpoint styles.** The sign-in and account endpoints are Minimal API, as in the
recipe, so a security fix in the recipe syncs in as a near-copy. Notes is a controller
because that is the shape this scaffold teaches. The controller calls `NoteService` and
checks nothing itself.

**Where each piece lives.**

| Piece | Folder |
|---|---|
| Roles, `NotePolicy`, `NoteCan`, field rules, the four exceptions | `App.Core/Authorization/` |
| `Note`, `NoteMember`, `ICurrentUser`, `ITenantProvider`, `NoteService` | `App.Core/` |
| `AppUser`, sessions, auth events, the `Tenant` query filter, `NoteRepository` | `App.Data/` |
| Sessions, passwords, tokens, throttle, mailer, `AccountService`, the second-factor gate | `App.Api/Auth/` |
| Sign-in, account and sharing routes, error mapping | `App.Api/Auth/Http/` |
| `NotesController` | `App.Api/Controllers/` |

**Tenants.** Sign-up gives every account its own tenant. That is the recipe's rule and I
kept it so recipe syncs stay near-copies. Sharing a note only reaches accounts in the same
tenant, so sharing with a second signed-up account answers 204 and changes nothing. To try
sharing locally, move that account into yours with the one-line SQL in `App.Api.http`.
A real project decides how accounts join a tenant: an invite, an admin or a domain rule.

**Dev mailbox.** In Development the app writes each email to a file in `App.Api/.dev-mail/`
(gitignored, one file per email). Open the file and paste its link into the check page.

**Check page.** Run `dotnet run --project App.Api` and open
`http://localhost:5005/dev/auth-check/`. It walks the manual check: sign up, confirm through
the dev mailbox, sign in, register a passkey, sign out, sign in with the passkey, remove it,
enrol TOTP, see the recovery codes once, sign out. Each step writes `pass` or `fail` and an
error key into its own status element. Outside Development the page answers 401 without a
session and 404 with one.

**Frontend on another port.** Use the dev server's proxy, so requests reach the API from
the same origin and pass the cross-site guard. The `dev` CORS policy carries no credentials.

Synced from loadout auth v0.8.0, recipe verified 10.11.2026 on packages 10.0.14.

## Before you ship (adoption checklist)

1. Swap the dev mailer for a real provider. It is a processor: sign a DPA and pick the region.
2. Set `AllowedHosts`, `Auth:Origin` and `Auth:PasskeyDomain` to the real host.
3. Set `Auth:TrustedProxies` if the app runs behind a proxy.
4. Put `Auth:KeysPath` on persistent storage on the host.
5. Name the Pwned Passwords range call in the privacy notice.
6. The throttle is in memory, so a multi-instance deploy moves it to the database.
7. Run the manual browser check before shipping passkeys.

## Where your data lives

`app.db` is created next to the startup project (or wherever you launch from). It is
gitignored (`*.db`). A database with real data must never be committed. The SQLite
connection string is harmless in `appsettings.json`, but the day a real password arrives
it goes in `dotnet user-secrets`, never in a tracked file.

## Working rules

- Entities never leave the service layer. Controllers speak DTOs only.
- `App.Core` has zero package references. If it can't compile without one, something leaked.
- The app never calls `EnsureCreated()`; schema changes are migrations
  (`dotnet ef migrations add <Name>` with the two flags above). Tests may use
  `EnsureCreated` because migration history doesn't matter there.
- Timestamps come from the injected `TimeProvider`, never `DateTime.UtcNow` inline.
- Role checks live only in `App.Core/Authorization/`. Database access lives only in
  `App.Data/` and `App.Api/Auth/`. Every `.Notes` read in `App.Data/Repositories/` applies
  the filter it was passed, and `NoteService` builds that filter from `NotePolicy.Filter`.
  `GuardTests` fails on anything else.
- CORS: the `dev` policy allows any localhost origin, Development only. Production origins
  are an explicit decision, not a default.

## Localization

Same bundles, same keys, same fallback rule as the web library (locale standard,
`docs/specs/2026-10-01-locale-standard.md` § 10). `Locales/en.json` and `nb.json` ship;
add a language by adding a file. `JsonStringLocalizer` loads them once at startup and
is registered as `IStringLocalizer`.

- `Accept-Language` is the only source. No cookie, no query string. `no` and `nn` map
  to `nb`; `nb-NO` strips to `nb`; anything unknown is English. The response carries
  `Content-Language` with the culture that won.
- Lookup is per key: the resolved language, then `en`, then the key itself. A missing
  key renders as the key, visible and greppable.
- Placeholders are named: `localizer["greeting", ("name", user.Name)]` fills `{name}`.
- ProblemDetails titles are the first consumer (`problem.400`, `problem.500`). Add keys
  as the API grows; the header is never logged and never becomes a file path.

## Request lifecycle (one POST, end to end)

`POST /api/notes` first meets the cross-site guard, which refuses a form post from another
origin. The session cookie then resolves to a user, and the second-factor gate holds back an
account that enrolled TOTP but has not passed it. `NotesController.Create` binds + validates
`CreateNoteDto` (400 on failure, automatic) → `NoteService.CreateAsync` asks
`NotePolicy.Can(create)`, stamps timestamps and maps DTO ↔ entity → `NoteRepository.AddAsync`
saves via `AppDbContext` → SQLite → `201 Created` with a `Location` header pointing at
`GET /api/notes/{id}`. A missing session answers 401, a rule that says no answers 403, and
a note the caller cannot see answers 404.
