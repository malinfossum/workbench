# Workbench

[![CI](https://github.com/malinfossum/workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/malinfossum/workbench/actions/workflows/ci.yml)

One source-of-truth home for reusable libraries and copy-to-start scaffolds. Libraries are edited here and extracted into projects; scaffolds are copied once and owned by the project.

**Front door:** [`index.html`](./index.html), the dashboard GitHub Pages serves. It links every tier.

## Structure

| Tier | What it is |
|---|---|
| [`libraries/`](./libraries) | The source of truth. Versioned, reused as-is: `design-system/`, `storyboard/` and `i18n/` |
| [`scaffolds/`](./scaffolds) | Starters you copy once to begin a project, then own |
| [`tools/`](./tools) | `extract.mjs`, `translate.mjs` plus the test suite CI runs (extract, translate, structure, scaffold drift, links). The repo-hygiene checker moved to [Ward](https://github.com/malinfossum/ward/blob/main/docs/repo-hygiene.md) |
| [`guide/`](./guide) | Setup guide. The dashboard's scaffold cards link into it |
| [`docs/`](./docs) | Specs, plans, and workbench notes |
| [`reference/`](./reference) | Read-only reference material |
| [`archive/`](./archive) | Retired experiments, kept for history |

App content (screens, flows, data) never lives here. It lives in the project you spin up from a scaffold.

## Pick a scaffold

| Scaffold | Use it for | Build step |
|---|---|---|
| [`scaffolds/web-vite/`](./scaffolds/web-vite) | Web projects: vanilla-JS MVC, Vite + Biome, accessibility tests + CI gate | `npm install` |
| [`scaffolds/web-react-ts/`](./scaffolds/web-react-ts) | Web projects: React + TypeScript, Vite + Biome + Vitest, shadcn/ui on Base UI painted by the design system | `npm install` |
| [`scaffolds/csharp-console/`](./scaffolds/csharp-console) | Single-project console app. `init.sh` injects editor configs | `dotnet build` |
| [`scaffolds/csharp-layered/`](./scaffolds/csharp-layered) | Solution with class library, console front-end, NUnit | `dotnet build` |
| [`scaffolds/csharp-wpf/`](./scaffolds/csharp-wpf) | WPF/MVVM desktop: CommunityToolkit.Mvvm, tokens.xaml, JSON localizer + language picker, xUnit | `dotnet build` |
| [`scaffolds/csharp-api/`](./scaffolds/csharp-api) | ASP.NET Core Web API: layered API + repository, EF Core + SQLite, JSON `IStringLocalizer`, xUnit | `dotnet build` |

Both web scaffolds ship a bundled copy of the design system, a no-flash dark/light toggle, a mobile-first responsive baseline, and accessibility defaults. Both also ship the i18n library with English and Norwegian bundles: `web-vite` wires it through its MVC layers, `web-react-ts` through a `LanguageProvider` and a `useI18n()` hook with typed keys. Every scaffold ships the [Ward](https://github.com/malinfossum/ward) caller, `.github/workflows/ward.yml`, with its modules set for that stack and `a11y: "off"` until Ward's accessibility module lands (Plan 4). Each web scaffold also has an accessibility harness: `web-vite` runs axe-core component tests in `npm test` and a Pa11y scan with `npm run a11y:scan`, `web-react-ts` runs Vitest component tests in Chromium and a Playwright axe scan with `npm run test:e2e`. Each scaffold's `README.md` has the first setup steps.

## Reuse a library

Libraries live in `libraries/`. Copy one into any project (web or C#) with the extract tool:

```bash
node tools/extract.mjs design-system ../my-app            # → ../my-app/design-system
node tools/extract.mjs design-system ../my-api/wwwroot    # into a C# wwwroot
node tools/extract.mjs design-system ../my-app --check    # is my copy stale or drifted?
node tools/extract.mjs storyboard ../my-app               # engine only → ../my-app/storyboard
node tools/extract.mjs i18n ../my-app                     # translator → ../my-app/i18n
```

The tool copies only the lean parts, records the version, and refuses to overwrite files you've edited locally (pass `--force` to override). Edit a library **in the workbench**, never in a consuming project, then re-run extract.

One rule for consumers: exclude copied libraries from your formatter, so format hooks don't count as local edits. For Biome that is `"!design-system"` and `"!i18n"` in `files.includes`. The web scaffold already ships this.

## Keep translations current

`tools/translate.mjs` reads a project's `src/locales/en.json` as the source and every other bundle as a target. A hidden `src/locales/.translated.json` records, per language, a hash of the English value each translation was written against, so an edit to the English sentence surfaces as a stale translation instead of shipping unnoticed.

```bash
node tools/translate.mjs ../my-app                          # status: missing, changed, never stamped; exit 1 if any
node tools/translate.mjs ../my-app --worklist work.json     # the same as JSON, English values included
node tools/translate.mjs ../my-app --stamp                  # record hashes after writing translations
```

A value that equals the English one is printed as a warning with exit 0: "OK" is "OK" in Swedish, but an untranslated placeholder looks the same, and the warning is where you tell them apart. `nb.json` is exempt from staleness tracking because it is written alongside `en.json` and the scaffolds' key-drift test already proves it complete.

## Design system

The source of truth is [`libraries/design-system/`](./libraries/design-system). It holds tokens, primitives, components, compositions, utilities, theme, plus its own `gallery/` (live component browser) and `sandbox/`. It versions independently via its `VERSION` file. See its [README](./libraries/design-system/README.md) for principles and structure.

## Storyboard

[`libraries/storyboard/`](./libraries/storyboard) is a design-first planning tool: clickable app mocks with screens, named states, and hotspot flows, running as plain scripts with no build step. Extraction copies the engine only. Screens are authored in the consuming project, with `storyboard/` kept sibling to `design-system/`. The demo app (Frond) doubles as the starter. See its [README](./libraries/storyboard/README.md).

## i18n

[`libraries/i18n/`](./libraries/i18n) is a one-file, DOM-free translator: `t(lang, key, vars)`, `plural` via `Intl.PluralRules`, and `resolveLang`. Language bundles are project content (`src/locales/<lang>.json`); the library only turns a key into a string, so the current language stays in the model and persistence in the controller. See its [README](./libraries/i18n/README.md).

## License

[MIT](./LICENSE)
