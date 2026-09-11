# web-vite

Module-based MVC starter, Vite + Biome. Use this for personal projects and anything that benefits from a build step.

## What's included

- Full design system (`design-system/`) — tokens, primitives, components, compositions, utilities, theme
- Translations (`i18n/` + `src/locales/`) — `t()` in the view, language in the model, English + Norwegian bundles, persisted choice, `<html lang>` kept in sync
- No-flash dark/light theme toggle (works on first load, persists in `localStorage`)
- Mobile-first responsive baseline
- Accessibility defaults (focus rings, reduced-motion, forced-colors, skip link)
- Biome (formatter + linter + import organizer)
- Tests via node's built-in runner (`tests/`, no extra packages) — model example + locale key-drift check

## First 5 steps

1. `npm install`
2. Set `<title>` and `<meta name="description">` in `index.html`
3. Put every UI string in `src/locales/en.json` and `nb.json`, render it with `t("key")` in the view
4. Add project-specific styles in `src/styles/main.css` (mobile-first, no `max-width` queries)
5. `npm run dev` and start building

## Scripts

```bash
npm run dev            # start dev server
npm run build          # build for production
npm run preview        # preview the build
npm test               # run tests (node --test, discovers *.test.js)

npm run format         # format files in place
npm run format:check   # report files that would be reformatted
npm run lint           # run linter
npm run check          # format + lint + organize imports (write changes)
```

## Folder layout

- `index.html` — app shell, contains `<main id="main">`
- `src/main.js` — boots the app
- `src/app.js` — wires `createModel` / `createView` / `createController`
- `src/model/`, `src/view/`, `src/controller/` — MVC layers
- `src/locales/` — UI strings, one JSON bundle per language; `tests/locales.test.js` fails when bundles drift
- `src/styles/main.css` — project-specific overrides
- `tests/` — model tests (DOM-free, node's built-in runner)
- `design-system/` — read-only foundation, do not edit
- `i18n/` — read-only translator (`t`, `plural`, `resolveLang`), refresh with the extract tool
- `biome.json` — formatter and linter config
- `vite.config.js` — Vite config
