# csharp-api scaffold — design spec

- **Date:** 2026-07-16
- **Home:** `scaffolds/csharp-api/`
- **Depends on:** nothing new (sibling of `csharp-layered`; same SDK pin, same `.editorconfig`)
- **Blocks:** nothing — but GET Prepared starts 2026-08-06 and is backend-first, so this
  scaffold should exist before then.

## 1. Overview

The workbench has scaffolds for console, layered console, and WPF — but not for the one
architecture the next six months revolve around: an ASP.NET Core Web API with the layered
API + repository shape. `csharp-layered`'s README already sketches "adding an API project
later"; this spec promotes that sketch to a first-class scaffold. Copy once, rename, and the
first course project starts from a working, tested, layered API instead of `dotnet new webapi`
and a blank page.

## 2. Goals

- **Teach the layering by shape:** request flows controller → service → repository →
  DbContext, and each arrow is a project or folder boundary you can see.
- **Real persistence, zero install:** EF Core + SQLite. Migrations work exactly like they do
  against production databases, so the habits transfer.
- **Tested from minute one:** unit tests on the service layer (hand-rolled fake repository —
  no mocking library) and one `WebApplicationFactory` end-to-end test, so both patterns have
  a live example to copy.
- **Same working rules as its sibling:** pure logic in Core, IO at the edges, tests never
  reference the host project's internals directly.
- **Copy-once ownership:** like every scaffold, projects own their copy; nothing syncs back.

## 3. Non-goals

- **No auth.** JWT/identity is its own learning arc; a later ticket, not scaffold baggage.
- **No third-party conveniences** — no AutoMapper, MediatR, FluentValidation, Moq. Manual
  DTO mapping and a hand-written fake teach the boundaries these libraries later hide.
- **No frontend, no `wwwroot`.** This is an API. The design system can be extracted into a
  `wwwroot` later if a project grows pages — that path already exists in `extract.mjs`.
- **No Docker, no versioned API routes, no repository/unit-of-work ceremony** beyond one
  simple repository per aggregate.

## 4. Decisions (locked with Malin, 2026-07-16)

| Question | Decision | Why |
|---|---|---|
| API style | Controllers (`[ApiController]` classes) | The layering is explicit and visible; matches most course material and job codebases. Minimal APIs blur the layers the scaffold exists to teach. |
| Database | SQLite via EF Core | Real persistence, zero install, real migrations. InMemory skips migrations (the part worth learning); LocalDB is Windows-only and heavier. |
| Test framework | xUnit | Microsoft's own integration-testing docs (`WebApplicationFactory`) are written in xUnit, so first-party tutorials map 1:1; matches `csharp-wpf`. NUnit stays in `csharp-layered` — both are current, this is a per-scaffold fit, not a migration. |
| Placeholder name | `App.*` | Matches `csharp-layered`'s rename-by-find/replace flow. (The WPF `MyApp` exception exists because a WPF project literally named `App` fails to compile — APIs have no such problem.) |
| Sample domain | `Note` (Id, Title, Body, CreatedAt, UpdatedAt) | Concrete enough to make CRUD obvious, generic enough to delete without regret. |
| Migrations | Not committed — README walks `dotnet ef migrations add` | Running the commands once teaches more than inheriting a migration for an entity you're about to rename. Local tool manifest ships `dotnet-ef` so `dotnet tool restore` is the only setup. |
| OpenAPI | Built-in `AddOpenApi()` / `MapOpenApi()` (dev only) | Zero packages beyond `Microsoft.AspNetCore.OpenApi`; Swashbuckle left .NET templates in 9. UI viewers (Scalar) are a consumer add-on, noted in README. |
| DTOs | `record` types + manual mapping in the service | Entities never cross the API boundary; the mapping is ~4 lines and visible. |
| Errors | `AddProblemDetails()` + exception handler; `[ApiController]` auto-400s | Standard RFC 7807 responses with no custom middleware to maintain. |

## 5. Structure

```
scaffolds/csharp-api/
├── App.slnx
├── global.json                  # same 10.0.300 pin as csharp-layered
├── .editorconfig                # same rules as csharp-layered
├── .config/dotnet-tools.json    # dotnet-ef local tool
├── README.md
├── App.Api/
│   ├── App.Api.csproj           # references App.Core + App.Data
│   ├── Program.cs               # DI wiring, middleware pipeline — no logic
│   ├── App.Api.http             # ready-made requests for every endpoint
│   ├── appsettings.json         # ConnectionStrings:Default = Data Source=app.db
│   ├── Controllers/NotesController.cs
│   └── Dtos/                    # NoteDto, CreateNoteDto, UpdateNoteDto (records)
├── App.Core/
│   ├── App.Core.csproj          # no references, no IO — same rule as csharp-layered
│   ├── Models/Note.cs
│   ├── Interfaces/INoteRepository.cs
│   └── Services/NoteService.cs  # rules + DTO mapping; depends on INoteRepository
├── App.Data/
│   ├── App.Data.csproj          # references App.Core; owns EF Core + SQLite packages
│   ├── AppDbContext.cs
│   └── Repositories/NoteRepository.cs
└── App.Tests/
    ├── App.Tests.csproj         # xUnit; references App.Core + App.Api
    ├── Unit/NoteServiceTests.cs      # NoteService against FakeNoteRepository
    ├── Unit/FakeNoteRepository.cs    # hand-rolled, List<Note>-backed
    └── Integration/NotesApiTests.cs  # WebApplicationFactory + SQLite in-memory
```

Four projects instead of layered's three: `App.Data` exists so "EF Core lives behind the
repository interface" is a project boundary, not a convention. `App.Core` still compiles
with zero package references — if it can't, something leaked.

## 6. Behavior

- `NotesController` exposes `GET /api/notes`, `GET /api/notes/{id}`, `POST`, `PUT /{id}`,
  `DELETE /{id}` — async end to end, returning `200/201/204/404` with `CreatedAtAction`
  on POST.
- Validation via DataAnnotations on the DTO records (`[Required]`, `[MaxLength]`);
  `[ApiController]` turns violations into ProblemDetails 400s automatically.
- `Program.cs` registers `AppDbContext` (SQLite), `INoteRepository → NoteRepository`,
  `NoteService`, ProblemDetails, and OpenAPI — and nothing else. It should read as a
  table of contents for the architecture.
- Integration tests swap the SQLite file for a shared in-memory connection
  (`Data Source=:memory:` with the connection held open) via `WebApplicationFactory`
  service overrides — the canonical pattern from the ASP.NET Core docs.

## 7. README (contract, not content)

Same skeleton as `csharp-layered`: what each project may and may not do, "first 5 steps"
(copy → find/replace `App.` → `dotnet tool restore` → `dotnet ef migrations add Init` +
`database update` → run and hit `App.Api.http`), working rules, and a short "request
lifecycle" walkthrough tracing one POST from controller to database and back.

## 8. Acceptance

- Fresh copy: `dotnet restore && dotnet build && dotnet test` green with zero edits.
- README's first-5-steps executed verbatim on a copy produces a renamed, migrated, running
  API whose `.http` requests all succeed.
- `App.Core.csproj` has no PackageReference and no project references.
- Suite includes at least: service unit tests covering the not-found and validation edges,
  and one integration test doing a full POST → GET round-trip.
- Workbench README + dashboard gain the scaffold row/card; `check-links` green.
- Workbench version → **v2.4.0** on ship.

## 9. Open questions

- None blocking. Auth (JWT) and a paging example are the first candidate follow-up tickets
  after the scaffold ships.
