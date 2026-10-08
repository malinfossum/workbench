# web-react-ts

React + TypeScript starter, Vite + Biome + Vitest. Use this for web projects built with React; for vanilla-JS MVC use `web-vite` instead.

## What's included

- Full design system (`design-system/`): tokens, primitives, components, compositions, utilities, theme
- Translations (`i18n/` + `src/locales/`): `t()`, `plural()` and `money()` from `useI18n()`, English + Norwegian bundles, typed keys, `<html lang>` and the tab title kept in sync
- Language, theme and currency pickers in the header (`PreferencesProvider` + `Header`), System as the default, no-flash theme on first load
- Component → hook → service layering with a small Counter example (delete it when you start)
- Strict TypeScript (`tsc --noEmit` runs before every build)
- Biome (formatter + linter with the React rules domain + import organizer)
- Tests via Vitest (`tests/`): service tests in Node, component tests in real Chromium (axe-core, ARIA snapshots, keyboard)
- Full-page accessibility scan via Playwright + axe (`e2e/`), both themes, gated in CI

## First 5 steps

1. `npm install`, then `npx playwright install --only-shell chromium` (once per machine, about 270 MB; headless tests need only the shell, not full Chrome)
2. Set `<title>` and `<meta name="description">` in `index.html`
3. Replace the Counter example: your logic in `src/services/`, state in `src/hooks/`, UI in `src/components/`, every UI string in `src/locales/en.json` and `nb.json`
4. Add project-specific styles in `src/styles/main.css` (mobile-first, no `max-width` queries)
5. `npm run dev` and start building

## Scripts

```bash
npm run dev            # start dev server
npm run build          # typecheck, then build for production
npm run preview        # preview the build
npm test               # service + component tests (vitest)
npm run test:e2e       # build, serve and scan the page with axe (playwright)
npm run typecheck      # tsc --noEmit only

npm run format         # format files in place
npm run format:check   # report files that would be reformatted
npm run lint           # run linter
npm run check          # format + lint + organize imports (write changes)
```

## Folder layout

- `index.html`: app shell, React mounts into `#root`
- `src/main.tsx`: boots the app (StrictMode + createRoot)
- `src/App.tsx`: top-level layout and composition
- `src/services/`: pure logic, no React/DOM. This is what unit tests target
- `src/hooks/`: state + behavior wrapping the services
- `src/components/`: rendering + event wiring, no business logic
- `src/config/`: the project's options (currencies, base currency, region table)
- `src/locales/`: UI strings, one JSON bundle per language; `tests/locales.test.ts` fails when bundles drift, a value hard-codes a price, or a picker key is missing
- `src/types/`: ambient types for the design-system modules the app imports
- `src/styles/main.css`: project-specific overrides
- `tests/`: service tests (DOM-free, run in Node) and `tests/components/` component tests (run in Chromium)
- `e2e/`: full-page axe scan of the built app, the preference model and the keyboard walk against the built page
- `design-system/`: read-only foundation, do not edit
- `i18n/`: read-only translator (`t`, `plural`, `resolveLang`) with its type declarations, refresh with the extract tool
- `biome.json`: formatter and linter config
- `tsconfig.json`: strict TS, single config
- `vite.config.ts`: Vite config with the React plugin and the two Vitest projects
- `playwright.config.ts`: builds, serves and scans the app for `test:e2e`

## Preferences

`PreferencesProvider` wraps the app in `src/main.tsx` and owns language, theme and currency:

- One rule for each: the stored key if it is valid, else the system value. System is the absence of the key: choosing it removes the key, and nothing is stored until someone picks.
- Keys: `lang`, `theme`, `currency` in `localStorage`, unprefixed.
- Language: `navigator.languages` through the i18n library (`no` and `nn` map to `nb`), read once per page load.
- Theme: `prefers-color-scheme`, live while no key is stored, and mirrored when another tab changes the key.
- Currency: the region of the first language entry that `src/config/preferences.ts` maps, else the base currency.
- Storage that refuses a write (Safari private mode) keeps the choice for the open page and shows no message.

`Header` renders the three pickers, each only when the project has more than one option, and is the one place their names, icons and `aria-current` are rendered. `design-system/components/picker.js`, loaded in `index.html`, adds the keyboard and focus rules.

```tsx
const { t, plural, money, lang } = useI18n()          // strings only, what most components need
const { lang, theme, currency } = usePreferences()     // { value, stored, system, set } each

t("app.title")                       // "Project" / "Prosjekt"
plural("items", 3)                    // picks items.one / items.other by the language's rules
money(949)                            // "949,00 kr" / "NOK 949.00": active language and currency
theme.set("light"); theme.set("")     // store a choice; "" is the System row, it removes the key
```

`t()` only accepts keys that every bundle has, so a typo or a key missing in one language is a type error. It returns plain text, which JSX escapes; never pass it to `dangerouslySetInnerHTML`. Every bundle carries the picker keys (`picker.language`, `picker.theme`, `picker.currency`, `picker.system`, `theme.light`, `theme.dark`); language and currency names come from `Intl.DisplayNames`, prices are numbers rendered with `money()`, never strings in a bundle. Component tests render inside the provider with `render(<Thing />, { wrapper: PreferencesProvider })`, and both test browsers are pinned to `en-US` and a dark colour scheme so snapshots read the same on every machine.

To add a language, copy `src/locales/en.json` to `<lang>.json`, translate every value, register it in `src/locales/index.ts`, and run the workbench's `tools/translate.mjs` with `--stamp` so later edits to the English text show up as stale translations. To add a currency, add it to `src/config/preferences.ts` with the regions that map to it and the flag file it uses from `design-system/assets/flags/`.

## Testing

Three layers, cheapest first:

1. **Service tests** (`npm test`, `unit` project): pure logic in `src/services/`, run in Node. Most of your tests belong here.
2. **Component tests** (`npm test`, `browser` project): `tests/components/` renders each component in real Chromium with the design-system CSS loaded, then checks axe finds no violations (colour contrast included), the accessibility tree matches its ARIA snapshot, and it works from the keyboard. Copy `tests/components/Counter.test.tsx` for every new component. After an intended markup change, update snapshots with `npx vitest -u`.
3. **Full-page scan** (`npm run test:e2e`): Playwright builds the app, serves the preview and scans it with axe in dark and light theme, in Norwegian, and with each picker open. This is where document-level rules (lang, title, landmarks, one `h1`) are checked. `e2e/preferences.spec.ts` also proves the theme rule against a real colour scheme, the storage event between two pages, the keyboard walk and the header at 320 px. Add a test per route as you build them.

`.github/workflows/ward.yml` calls [Ward](https://github.com/malinfossum/ward), which runs the linter, the type check and all three layers on every pull request.

Automated checks catch only a third to a half of WCAG issues, and never keyboard order, focus traps, focus return, or whether labels make sense. Before shipping a component, check it with a keyboard (tab order, arrow and Escape on menus, focus return on close) and a screen reader.

axe skips contrast on very short text (a single digit or glyph), so a low-contrast count or icon label can pass. Check those by eye.
