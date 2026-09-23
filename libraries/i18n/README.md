# i18n

One file, no dependencies, no DOM: turns `(lang, key)` into a string from flat
key → string bundles. The current language lives in the project's model, persistence
lives in its controller, and the view calls `t()` — the module never touches
`localStorage`, `navigator` or `document`, so it tests in node and keeps the MVC split clean.

`scaffolds/web-vite` ships it wired through MVC, `scaffolds/web-react-ts` through a
`LanguageProvider` + `useI18n()` hook. Elsewhere:

```bash
node tools/extract.mjs i18n ../my-app    # → ../my-app/i18n/index.js + index.d.ts
```

`index.d.ts` types it for TypeScript projects without making the library TypeScript. Types
flow from the bundles: languages are the bundle names, keys are the keys every bundle shares, so
with JSON bundles imported as modules (`resolveJsonModule`) a mistyped or half-translated key
is a compile error. Plain-JS projects ignore the file.

## API

```js
import { createTranslator } from "./i18n/index.js"

const i18n = createTranslator({ en, nb }, { fallback: "en" })

i18n.t("nb", "app.title")                       // "Tidtaker"
i18n.t("nb", "greeting", { name: "Malin" })     // "Hei, Malin"   — {vars} interpolated
i18n.plural("en", "items", 5)                   // "5 items"      — picks items.one / items.other
i18n.resolveLang(stored, navigator.language)    // first candidate with a bundle, else fallback
i18n.languages                                  // ["en", "nb"]
```

- A key missing in the active language falls back to the fallback bundle, then to the
  key itself — visible in the UI, easy to grep, never a blank.
- `plural` uses `Intl.PluralRules`, so a bundle only needs the forms its language has:
  `one`/`other` for Norwegian and English, `one`/`few`/`many` for Ukrainian. `.other` is the
  catch-all. `{count}` is always available.
- Bundles are project content — `src/locales/<lang>.json` in the web scaffold — and every
  bundle must carry the same keys. The scaffolds' `tests/locales.test.js` / `.ts` fail when they drift.

## Rules

- `t()` returns plain text and does **not** escape `{vars}`. Escape before `innerHTML`, or set
  the string with `textContent`. User input in a var rendered via `innerHTML` is XSS.
- Keep `<html lang>` in sync with the active language (the scaffold controller does this) —
  screen readers pick their voice from it.
- Add a language by adding a bundle. Don't add one you can't have checked by someone who
  speaks it; a wrong translation in a public app costs more than a missing one.

## Adding a language to a project

1. Copy `src/locales/en.json` to `src/locales/<lang>.json` and translate every value.
2. Register it in `src/locales/index.js` (`index.ts` in the React scaffold).
3. `npm test` — the key-drift test passes when the bundle is complete.
