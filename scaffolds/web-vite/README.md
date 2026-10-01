# web-vite

Module-based MVC starter, Vite + Biome. Use this for personal projects and anything that benefits from a build step.

## What's included

- Full design system (`design-system/`): tokens, primitives, components, compositions, utilities, theme
- Translations (`i18n/` + `src/locales/`): `t()` in the view, English + Norwegian bundles, `<html lang>` and `<title>` kept in sync, prices through `money()`
- Three header pickers (language, theme, currency) on one preference model, no-flash theme on first load
- Mobile-first responsive baseline
- Accessibility defaults (focus rings, reduced-motion, forced-colors, skip link)
- Biome (formatter + linter + import organizer)
- Tests via node's built-in runner (`tests/`): model, controller and view tests, locale key-drift check, axe-core component a11y tests, Puppeteer e2e tests for the pickers

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
npm run test:e2e       # only the browser tests (Vite + Puppeteer, in-process)
npm run a11y:scan      # Pa11y full-page scan (needs `npm run preview` running)

npm run format         # format files in place
npm run format:check   # report files that would be reformatted
npm run lint           # run linter
npm run check          # format + lint + organize imports (write changes)
```

## Folder layout

- `index.html`: app shell, contains `<main id="main">`
- `src/main.js`: boots the app
- `src/app.js`: wires `createModel` / `createView` / `createController`
- `src/model/`, `src/view/`, `src/controller/`: MVC layers
- `src/locales/`: UI strings, one JSON bundle per language; `tests/locales.test.js` fails when bundles drift
- `src/styles/main.css`: project-specific overrides
- `tests/`: model and controller tests (DOM-free), view tests (jsdom), `tests/a11y/` component a11y tests (jsdom + axe-core), `tests/e2e/` browser tests (Puppeteer), node's built-in runner
- `design-system/`: read-only foundation, do not edit
- `i18n/`: read-only translator (`t`, `plural`, `resolveLang`, `displayName`, `money`), refresh with the extract tool

## Preferences: language, theme, currency

One rule for all three: `value = stored key (if valid) ?? system value`. The keys are `lang`, `theme` and `currency` in `localStorage`; System is the absence of a key, never a stored `"system"`, and the System row removes it. An invalid stored value is removed on first read. Language resolves from `navigator.languages` through `i18n.resolveLang`, theme from `prefers-color-scheme` (followed live while no key is stored, and across tabs), currency from the region of `navigator.languages` through the table in `src/model/model.js` (`currencies`, `baseCurrency`, `regions`, `flags`), else the base currency. The controller reads and writes the keys through `design-system/theme/preferences.js`; the model holds the values; the view renders the header pickers in `renderHeader(state)`, re-rendered only when a preference changes. Picker rows need the bundle keys `picker.language`, `picker.theme`, `picker.currency`, `picker.system`, `theme.light` and `theme.dark`; language and currency names come from `Intl.DisplayNames`, prices from `money(lang, amount, currency)`, so no bundle carries a language name or a price string.
- `biome.json`: formatter and linter config
- `vite.config.js`: Vite config

## Accessibility

Three layers catch accessibility issues:

1. **axe DevTools** browser extension: manual checks while you build.
2. **Component tests** (`npm test`): `tests/a11y/` renders each view into jsdom and asserts axe-core finds no violations. Copy `tests/a11y/view.test.js` for every new view.
3. **Pa11y CI** (`.github/workflows/ci.yml`): scans the built page in a real browser on every pull request; catches colour contrast and document-level issues the component tests can't. `.pa11yci.json` waits for a rendered element, so a blank page fails instead of passing, and scans the page once more with each picker open. Add every route to `urls` as you build them.

`tests/e2e/` drives the real page with Puppeteer: the theme rules (fresh profile, stored key, System, another tab), the keyboard walk of a picker and the 320 px header measurements. Automated checks still catch only a third to a half of WCAG issues. They never catch whether labels make sense. Before shipping a view, check it with a keyboard (tab order, arrow and Escape on menus, focus return on close) and a screen reader.

`pa11y-ci` pulls in Puppeteer, which downloads its own Chrome on `npm install` (about 190 MB, cached in `~/.cache/puppeteer`). npm 11 blocks install scripts it has not been told about, so `package.json` carries an `allowScripts` entry for the exact Puppeteer version; when a dependency update bumps Puppeteer, run `npm install-scripts approve puppeteer` and commit the change. If Chrome is still missing, `npx puppeteer browsers install chrome` fetches it. Set `PUPPETEER_SKIP_DOWNLOAD=1` before installing if you only want the component tests locally; `npm test` then needs `node --test "tests/*.test.js" "tests/a11y/*.test.js"` instead, since it includes `tests/e2e/`.

`package.json` also carries `overrides` that lift `pa11y-ci`'s own `pa11y` 9 and Puppeteer 24 to `pa11y` 10 and Puppeteer 25. Puppeteer 24's browser downloader depends on `extract-zip`, which has two unpatched path-traversal advisories (GHSA-7pqw-9j4j-h8q3, GHSA-jmr9-qjv8-65gv); Puppeteer 25 dropped it. Remove the overrides once a `pa11y-ci` release depends on `pa11y` 10 itself. Puppeteer 25 needs Node 22.13 or newer.
