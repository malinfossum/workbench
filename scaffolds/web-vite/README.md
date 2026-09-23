# web-vite

Module-based MVC starter, Vite + Biome. Use this for personal projects and anything that benefits from a build step.

## What's included

- Full design system (`design-system/`) — tokens, primitives, components, compositions, utilities, theme
- Translations (`i18n/` + `src/locales/`) — `t()` in the view, language in the model, English + Norwegian bundles, persisted choice, `<html lang>` kept in sync
- No-flash dark/light theme toggle (works on first load, persists in `localStorage`)
- Mobile-first responsive baseline
- Accessibility defaults (focus rings, reduced-motion, forced-colors, skip link)
- Biome (formatter + linter + import organizer)
- Tests via node's built-in runner (`tests/`) — model example, locale key-drift check, axe-core component a11y tests

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
npm run test:a11y      # only the component a11y tests
npm run a11y:scan      # Pa11y full-page scan (needs `npm run preview` running)

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
- `tests/` — model tests (DOM-free) and `tests/a11y/` component a11y tests (jsdom + axe-core), node's built-in runner
- `design-system/` — read-only foundation, do not edit
- `i18n/` — read-only translator (`t`, `plural`, `resolveLang`), refresh with the extract tool
- `biome.json` — formatter and linter config
- `vite.config.js` — Vite config

## Accessibility

Three layers catch accessibility issues:

1. **axe DevTools** browser extension — manual checks while you build.
2. **Component tests** (`npm test`) — `tests/a11y/` renders each view into jsdom and asserts axe-core finds no violations. Copy `tests/a11y/view.test.js` for every new view.
3. **Pa11y CI** (`.github/workflows/ci.yml`) — scans the built page in a real browser on every pull request; catches colour contrast and document-level issues the component tests can't. `.pa11yci.json` waits for a rendered element, so a blank page fails instead of passing. Add every route to `urls` as you build them.

Automated checks catch only a third to a half of WCAG issues — never keyboard order, focus traps, focus return, or whether labels make sense. Before shipping a view, check it with a keyboard (tab order, arrow and Escape on menus, focus return on close) and a screen reader.

`pa11y-ci` pulls in Puppeteer, which downloads its own Chrome on `npm install` (about 190 MB, cached in `~/.cache/puppeteer`). npm 11 blocks install scripts it has not been told about, so `package.json` carries an `allowScripts` entry for the exact Puppeteer version; when a dependency update bumps Puppeteer, run `npm install-scripts approve puppeteer` and commit the change. If Chrome is still missing, `npx puppeteer browsers install chrome` fetches it. Set `PUPPETEER_SKIP_DOWNLOAD=1` before installing if you only want the component tests locally.

`package.json` also carries `overrides` that lift `pa11y-ci`'s own `pa11y` 9 and Puppeteer 24 to `pa11y` 10 and Puppeteer 25. Puppeteer 24's browser downloader depends on `extract-zip`, which has two unpatched path-traversal advisories (GHSA-7pqw-9j4j-h8q3, GHSA-jmr9-qjv8-65gv); Puppeteer 25 dropped it. Remove the overrides once a `pa11y-ci` release depends on `pa11y` 10 itself. Puppeteer 25 needs Node 22.13 or newer.
