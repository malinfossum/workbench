# csharp-api

C# starter for web APIs. Four projects (controllers, domain, data, tests) wired in the
layered API + repository shape: controller → service → repository → DbContext.

## Folder structure

- `App.Core/`: entities, DTOs, service, repository interface. No packages, no IO, no EF.
- `App.Data/`: EF Core + SQLite: `AppDbContext`, repository implementations, migrations.
- `App.Api/`: controllers and `Program.cs` (DI wiring only). The only project that runs.
  `Localization/` reads `Locales/<tag>.json` (same flat keys as the web i18n library)
  and resolves the request language from `Accept-Language`.
- `App.Tests/`: xUnit. Unit tests fake the repository; integration tests boot the real
  pipeline via `WebApplicationFactory` on in-memory SQLite.

## First 5 steps in a new project

1. Copy this folder to wherever the project lives.
2. Rename `App.slnx`, each `App.*` project + folder, and `App.Api.http` to `<YourName>.*`
   (find/replace `App.` across files).
3. `dotnet tool restore && dotnet restore && dotnet build && dotnet test`
4. Create the database:
   `dotnet ef migrations add Init --project <YourName>.Data --startup-project <YourName>.Api`
   `dotnet ef database update    --project <YourName>.Data --startup-project <YourName>.Api`
5. `dotnet run --project <YourName>.Api` and send the requests in `<YourName>.Api.http`.

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

`POST /api/notes` → `NotesController.Create` binds + validates `CreateNoteDto` (400 on
failure, automatic) → `NoteService.CreateAsync` stamps timestamps and maps DTO ↔ entity →
`NoteRepository.AddAsync` saves via `AppDbContext` → SQLite → `201 Created` with a
`Location` header pointing at `GET /api/notes/{id}`.
