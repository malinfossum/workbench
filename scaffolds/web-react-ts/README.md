# web-react-ts

React + TypeScript starter, Vite + Biome + Vitest. Use this for web projects built with React; for vanilla-JS MVC use `web-vite` instead.

## What's included

- Full design system (`design-system/`) — tokens, primitives, components, compositions, utilities, theme
- No-flash dark/light theme toggle (works on first load, persists in `localStorage`, plays fine with React)
- Component → hook → service layering with a small Counter example (delete it when you start)
- Strict TypeScript (`tsc --noEmit` runs before every build)
- Biome (formatter + linter with the React rules domain + import organizer)
- Tests via Vitest (`tests/`), targeting the DOM-free service layer

## First 5 steps

1. `npm install`
2. Set `<title>` and `<meta name="description">` in `index.html`
3. Replace the Counter example: your logic in `src/services/`, state in `src/hooks/`, UI in `src/components/`
4. Add project-specific styles in `src/styles/main.css` (mobile-first, no `max-width` queries)
5. `npm run dev` and start building

## Scripts

```bash
npm run dev            # start dev server
npm run build          # typecheck, then build for production
npm run preview        # preview the build
npm test               # run tests (vitest, discovers *.test.ts)
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
- `tests/` — service tests (DOM-free; add jsdom + @testing-library/react when components need tests)
- `design-system/` — read-only foundation, do not edit
- `biome.json` — formatter and linter config
- `tsconfig.json` — strict TS, single config
- `vite.config.ts` — Vite config with the React plugin
