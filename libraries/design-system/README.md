# Design System

Reusable UI foundation. Tokens, primitives, components, compositions, utilities, theme. Dark-mode-first, mobile-first, semantic.

Current version: see `VERSION`.

## Local preview

Serve the folder over HTTP — opening the files directly via `file://` (double-click) won't load the linked CSS/JS, so the page renders blank. From this folder:

```powershell
python -m http.server 8099
```

Then open <http://localhost:8099/gallery/> — or `/sandbox/` for the scratch page.

## Principles

- True-black dark mode with restrained, damped accent color
- Semantic tokens over hard-coded values
- Primitives before page-specific layout
- Subtle motion only when it improves clarity
- Accessible defaults from the start (focus rings, reduced-motion, forced-colors, skip link)
- Reusable structure for both small and growing projects

## Structure

- `tokens/` — colors, spacing, typography, radius, shadows, motion, layers (the values), plus `palettes/` (opt-in brand palettes)
- `base/` — `reset.css` and `base.css` (HTML defaults, focus rings, reduced motion, forced colors, skip link)
- `primitives/` — layout helpers (`stack`, `cluster`, `grid`, `sidebar`, `split`, `center`, `container`)
- `components/` — `button`, `card`, `input`, `nav`, `modal`, `alert`, `badge`, `progress`, `stat`, `table`, `toast`, `tabs`, `skeleton`
- `compositions/` — page patterns (`app-shell`, `dashboard`, `settings`, `hero`, `empty-state`)
- `utilities/` — single-purpose helpers
- `theme/` — `theme-toggle.js`, `palette-switch.js`, and `theme-init-snippet.html` (inline `<head>` snippet)
- `assets/fonts/` — self-hosted fonts (Sora, Figtree, Fraunces, Instrument Serif, Schibsted Grotesk, Atkinson Hyperlegible Next, Space Grotesk, Bricolage Grotesque, Hanken Grotesk)
- `gallery/` — panel-swap MVC reference (browse every component live)
- `sandbox/` — scratch page for quick experiments
- `docs/` — system spec and usage notes

## Theme behavior

The initial theme is set by an **inline `<head>` snippet** so there's no flash on first paint. Copy `theme/theme-init-snippet.html` into every scaffold's `<head>`, before stylesheets. The click handler in `theme/theme-toggle.js` toggles between dark and light when any `[data-theme-toggle]` element is clicked.

Default is dark. User's saved choice (from `localStorage`) wins.

**Brand palettes** use a separate `data-palette` axis. Set `data-palette="gold"`, `"wend"`, `"daily"` or `"ignite"` on `<html>` to recolour the accent — and, for full brands, the surfaces and gradient — with every derived token following automatically. The two OLED palettes go further and also carry **type**: `daily` (warm charcoal + ember, Space Grotesk / Inter) and `ignite` (greyer + flame, Bricolage Grotesque / Hanken Grotesk) swap fonts and heading treatment along with colour, so switching palette changes the whole feel. `palette-switch.js` sets it on `[data-palette-set]` clicks; the init snippet restores the saved palette. No attribute (or `default`) = the base palette. Each palette ships dark + a contrast-tuned light variant. See `docs/oled-palettes.md`.

## Type skins

The default identity is Sora 600 headings over a Figtree body. Three opt-in type skins
swap the display face (and for nordic, the body) without touching color:

| Skin | Headings | Body |
|---|---|---|
| `fraunces` | Fraunces 600 (h1/h2/stats only) | Figtree |
| `instrument` | Instrument Serif (h1/h2/stats only) | Figtree |
| `nordic` | Schibsted Grotesk 700 | Atkinson Hyperlegible Next |

Opt in with `<html data-typeskin="fraunces">`. Skins compose with color palettes
(`data-palette`) — set both attributes to combine them.

## Versioning

Bump `VERSION` when the system changes in a way that would affect existing projects:

- **MAJOR** — breaking change (renamed token, removed component)
- **MINOR** — additive (new component, new utility)
- **PATCH** — fix (bug, accessibility correction, doc update)

When bumping, sync the lean parts (`tokens/`, `base/`, `primitives/`, `components/`, `compositions/`, `utilities/`, `theme/`, `assets/`) into each scaffold's bundled `design-system/`.
