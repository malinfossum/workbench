# Template

Reusable starter scaffolds for web and C# projects. Pick one, copy it, start coding.

## Pick a scaffold

### Web

| Scaffold | Use it for | Build step |
|---|---|---|
| [`web-vite/`](./web-vite) | Web projects — anything that benefits from a build | `npm install` |

The web scaffold ships `design-system/` (tokens, primitives, components, theme), a no-flash dark/light toggle, a mobile-first responsive baseline, and accessibility defaults — visible focus rings, reduced-motion handling, forced-colors mode, skip link.

### C#

| Scaffold | Use it for | Build step |
|---|---|---|
| [`csharp-console/`](./csharp-console) | A single-project console app — `init.sh` auto-injects editor configs | `dotnet build` |
| [`csharp-console-mvc/`](./csharp-console-mvc) | C# coursework — solution with class library, console front-end, NUnit | `dotnet build` |

C# scaffolds are independent of the web design system. `csharp-wpf/` is a planned stub (editor config only — not yet a working project), intended to later mirror palette, spacing, and typography tokens via `tokens.xaml`.

Each scaffold has its own `README.md` with the first 5 setup steps and conventions.

## How to use this template

### From GitHub (recommended)

1. Click **Use this template** → **Create a new repository**
2. Clone the new repo locally
3. Delete the scaffolds you don't need (keep one)
4. Move the contents of the kept scaffold up to the project root if you prefer a flat layout
5. Open the scaffold's `README.md` for the next steps

### Locally (this folder on disk)

1. Copy the scaffold folder you want to wherever the new project lives
2. Open the project's `README.md` for the first 5 setup steps

## Design system (web)

The shared `design-system/` lives at the top level and is the canonical source of truth for the web scaffold. `web-vite/` ships a lean copy (no gallery, sandbox, or docs) so a single folder copy is enough to start.

When the system improves, edit the canonical `design-system/` and sync the lean parts (`tokens/`, `base/`, `primitives/`, `components/`, `compositions/`, `utilities/`, `theme/`) into `web-vite/`.

See [`design-system/README.md`](./design-system/README.md) for principles, structure, and how to preview the component **gallery** locally. Current version: see `design-system/VERSION`.

## License

[MIT](./LICENSE)
