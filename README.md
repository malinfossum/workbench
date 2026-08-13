# Workbench

[![CI](https://github.com/malinfossum/workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/malinfossum/workbench/actions/workflows/ci.yml)

One canonical home for reusable libraries and copy-to-start scaffolds. Libraries are edited here and extracted into projects; scaffolds are copied once and owned by the project.

**Front door:** [`index.html`](./index.html) — the dashboard GitHub Pages serves, linking every tier.

## Structure

| Tier | What it is |
|---|---|
| [`libraries/`](./libraries) | Canonical, versioned, reused as-is: `design-system/` and `storyboard/` |
| [`scaffolds/`](./scaffolds) | Starters you copy once to begin a project, then own |
| [`tools/`](./tools) | `extract.mjs` plus the test suite CI runs (extract, structure, scaffold drift, links) |
| [`guide/`](./guide) | Setup guide — the dashboard's scaffold cards link into it |
| [`docs/`](./docs) | Specs, plans, and workbench notes |
| [`reference/`](./reference) | Read-only reference material |
| [`archive/`](./archive) | Retired experiments, kept for history |

App content — screens, flows, data — never lives here. It lives in the project you spin up from a scaffold.

## Pick a scaffold

| Scaffold | Use it for | Build step |
|---|---|---|
| [`scaffolds/web-vite/`](./scaffolds/web-vite) | Web projects — vanilla-JS MVC, Vite + Biome | `npm install` |
| [`scaffolds/web-react-ts/`](./scaffolds/web-react-ts) | Web projects — React + TypeScript, Vite + Biome + Vitest | `npm install` |
| [`scaffolds/csharp-console/`](./scaffolds/csharp-console) | Single-project console app — `init.sh` injects editor configs | `dotnet build` |
| [`scaffolds/csharp-layered/`](./scaffolds/csharp-layered) | Solution with class library, console front-end, NUnit | `dotnet build` |
| [`scaffolds/csharp-wpf/`](./scaffolds/csharp-wpf) | WPF/MVVM desktop — CommunityToolkit.Mvvm, tokens.xaml, xUnit | `dotnet build` |
| [`scaffolds/csharp-api/`](./scaffolds/csharp-api) | ASP.NET Core Web API — layered API + repository, EF Core + SQLite, xUnit | `dotnet build` |

Both web scaffolds ship a bundled copy of the design system, a no-flash dark/light toggle, a mobile-first responsive baseline, and accessibility defaults. Each scaffold's `README.md` has the first setup steps.

## Reuse a library

Libraries live in `libraries/`. Copy one into any project (web or C#) with the extract tool:

```bash
node tools/extract.mjs design-system ../my-app            # → ../my-app/design-system
node tools/extract.mjs design-system ../my-api/wwwroot    # into a C# wwwroot
node tools/extract.mjs design-system ../my-app --check    # is my copy stale or drifted?
node tools/extract.mjs storyboard ../my-app               # engine only → ../my-app/storyboard
```

The tool copies only the lean parts, records the version, and refuses to overwrite files you've edited locally (pass `--force` to override). Edit a library **in the workbench**, never in a consuming project, then re-run extract.

One rule for consumers: exclude the copied `design-system/` from your formatter (Biome: `"!design-system"` in `files.includes` — the web scaffold already ships this), so format hooks don't count as local edits.

## Design system

The canonical source of truth is [`libraries/design-system/`](./libraries/design-system) — tokens, primitives, components, compositions, utilities, theme, plus its own `gallery/` (live component browser) and `sandbox/`. It versions independently via its `VERSION` file. See its [README](./libraries/design-system/README.md) for principles and structure.

## Storyboard

[`libraries/storyboard/`](./libraries/storyboard) is a design-first planning tool: clickable app mocks with screens, named states, and hotspot flows, running as plain scripts with no build step. Extraction copies the engine only — screens are authored in the consuming project, with `storyboard/` kept sibling to `design-system/`. The demo app (Frond) doubles as the starter. See its [README](./libraries/storyboard/README.md).

## License

[MIT](./LICENSE)
