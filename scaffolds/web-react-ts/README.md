# web-react-ts

React + TypeScript starter, Vite + Biome + Vitest. Use this for web projects built with React; for vanilla-JS MVC use `web-vite` instead.

## What's included

- Full design system (`design-system/`) — tokens, primitives, components, compositions, utilities, theme
- No-flash dark/light theme toggle (works on first load, persists in `localStorage`, plays fine with React)
- Component → hook → service layering with a small Counter example (delete it when you start)
- Strict TypeScript (`tsc --noEmit` runs before every build)
- Biome (formatter + linter with the React rules domain + import organizer)
- Tests via Vitest (`tests/`) — service tests in Node, component tests in real Chromium (axe-core, ARIA snapshots, keyboard)
- Full-page accessibility scan via Playwright + axe (`e2e/`), both themes, gated in CI

## First 5 steps

1. `npm install`, then `npx playwright install --only-shell chromium` (once per machine, about 270 MB; headless tests need only the shell, not full Chrome)
2. Set `<title>` and `<meta name="description">` in `index.html`
3. Replace the Counter example: your logic in `src/services/`, state in `src/hooks/`, UI in `src/components/`
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

- `index.html` — app shell, React mounts into `#root`
- `src/main.tsx` — boots the app (StrictMode + createRoot)
- `src/App.tsx` — top-level layout and composition
- `src/services/` — pure logic, no React/DOM — this is what unit tests target
- `src/hooks/` — state + behavior wrapping the services
- `src/components/` — rendering + event wiring, no business logic
- `src/styles/main.css` — project-specific overrides
- `tests/` — service tests (DOM-free, run in Node) and `tests/components/` component tests (run in Chromium)
- `e2e/` — full-page axe scan of the built app
- `design-system/` — read-only foundation, do not edit
- `biome.json` — formatter and linter config
- `tsconfig.json` — strict TS, single config
- `vite.config.ts` — Vite config with the React plugin and the two Vitest projects
- `playwright.config.ts` — builds, serves and scans the app for `test:e2e`

## Testing

Three layers, cheapest first:

1. **Service tests** (`npm test`, `unit` project) — pure logic in `src/services/`, run in Node. Most of your tests belong here.
2. **Component tests** (`npm test`, `browser` project) — `tests/components/` renders each component in real Chromium with the design-system CSS loaded, then checks axe finds no violations (colour contrast included), the accessibility tree matches its ARIA snapshot, and it works from the keyboard. Copy `tests/components/Counter.test.tsx` for every new component. After an intended markup change, update snapshots with `npx vitest -u`.
3. **Full-page scan** (`npm run test:e2e`) — Playwright builds the app, serves the preview and scans it with axe in dark and light theme. This is where document-level rules (lang, title, landmarks, one `h1`) are checked. Add a test per route as you build them.

`.github/workflows/ci.yml` runs all three on every pull request.

Automated checks catch only a third to a half of WCAG issues, and never keyboard order, focus traps, focus return, or whether labels make sense. Before shipping a component, check it with a keyboard (tab order, arrow and Escape on menus, focus return on close) and a screen reader.

axe skips contrast on very short text (a single digit or glyph), so a low-contrast count or icon label can pass. Check those by eye.
