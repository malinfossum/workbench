# Locale standard: language, theme and currency preferences

- **Date:** 2026-10-01
- **Home:** `libraries/i18n/` (v2), `libraries/design-system/` (pickers, DS 3.8.0), `tools/translate.mjs`, both web scaffolds, the three C# scaffolds that have a UI or a response body
- **Depends on:** i18n 1.1.0, DS 3.7.1, Node 22, Vite 8, React 19.2, .NET SDK 10.0.300 (the pins the scaffolds already carry)
- **Blocks:** the Rookdex locale migration, which must land before its 1 November content freeze
- **Supersedes:** the 2026-09-10 "EN/NO toggle" rule and the web scaffolds' two-button language switcher

> **Revision note (stress test, 2026-10-01):** five-lens pass surfaced 17 findings, all folded
> in below: visually hidden trigger name instead of `aria-label` on `<summary>`, delegated
> picker listeners so re-rendered markup never double-binds, header re-render on any
> preference change, `localStorage` failure handling, `storage` event for the theme across
> tabs, flags as `<img>` with a script-free check, textContent rule for `Intl` output, a
> named list for every picker, 320 px header and list placement in the acceptance, noscript
> links on the per-URL root, a culture provider for the .NET alias, WPF `Language` property,
> a "same as source" category in the translate script, failing fixtures for every new guard,
> a machine-translation line in the consumer README, and the device-storage legal position.
> Accepted trade-offs in § 14, rejected fixes in § 16.

## 1. Overview

Every user-facing project I build ships Norwegian and English from day one. The audit on
2026-10-01 across Workbench, Rookdex, Varde and Hugin found four defaults, three storage keys,
two codes for Norwegian (`no` and `nb`) and four switcher designs. Each project solved the
same three questions differently: which language, which theme, which currency. This spec
settles them once, in Workbench, and gives every project the same answer:

- the system decides until the user says otherwise,
- one disclosure component presents the choice, used three times,
- one bundle format holds the strings, read by JavaScript and .NET alike.

The i18n library grows into v2, the design system gains a picker component and a theme
model with a System option, a script produces the translations I do not write myself, and
the C# scaffolds get a reader for the same JSON. Rookdex migrates first and proves the
standard in a real app.

## 2. Goals

- **One answer to "what does a fresh visitor see?"** Language from `navigator.languages`,
  theme from `prefers-color-scheme`, currency from the resolved region. Nothing is stored
  until the user picks.
- **One picker, three uses.** Language, theme and currency open the same disclosure with the
  same keyboard model, the same row anatomy and the same "System (resolves to)" first row.
- **One bundle format for every runtime.** Flat dotted-key JSON that the JavaScript library,
  ASP.NET Core and WPF all read without conversion.
- **Correct codes everywhere.** BCP 47, `nb` for Norwegian Bokmål in URLs, `<html lang>`,
  `hreflang` and bundle names. Never `no`.
- **Translations I can keep correct.** I write `nb` and `en`; a script finds what the other
  languages are missing, I translate it in-session, and a test fails when bundles drift.
- **Measured, not assumed.** Every phase ends with an observable check: a unit test, an axe
  scan, a keyboard walk or a measured render.

## 3. Non-goals

- **No right-to-left support in this round.** Arabic stays opt-in and blocked: the design
  system has two physical properties left (`left: 0` in `base/base.css`, `text-align: left`
  in `components/table.css`) and no `dir` handling. Converting those is a separate DS ticket
  that must land before any project opts into `ar`.
- **No currency conversion.** The currency picker chooses which stored price to show. Rates,
  rounding and tax are the project's data problem, not the picker's.
- **No translation service, no runtime fetch of bundles.** Bundles are committed files.
  General Translation was evaluated and rejected: per-token billing, no published free
  quota, account-bound, no Astro or .NET runtime, and a CLI licence that differs between npm
  and GitHub. Paraglide JS is the escape hatch if one file stops being enough.
- **No `.resx`.** The C# scaffolds read the same JSON the web scaffolds use. Visual Studio
  resource designers are not worth a second string format.
- **No flags on languages.** W3C guidance, and Windows browsers render flag emoji as letter
  pairs anyway. Flags appear on currency rows only, as SVG.
- **No geo-IP, no server-side language guessing.** Resolution happens in the browser from
  what the browser already exposes.

## 4. Decisions (locked 2026-10-01)

| Question | Decision | Why |
|---|---|---|
| Default for language, theme, currency | **System.** Nothing stored until the user picks; choosing "System" clears the key | A stored default is a guess that outlives the reason for it. The system value follows the user to every site; a wrong stored value follows nothing. |
| Storage keys | `localStorage` keys `lang`, `theme`, `currency`, unprefixed | Three projects used three keys for the same thing. Unprefixed because each app is its own origin. |
| Language detection | `navigator.languages` (plural), first entry with a bundle wins; `no` and `nn` map to `nb` when they have no bundle of their own | `navigator.language` is only the first preference. Someone listing `en-GB, nb` gets English; someone listing `nn, en` gets Bokmål, the closest thing that exists. |
| Codes | BCP 47 language subtags; `nb`, never `no`; URLs `/nb/` | `no` is a macrolanguage tag that names neither written form. Screen readers, hreflang and CLDR all know `nb`. |
| Picker component | One `<details>` disclosure, icon-only trigger, list of rows, "System (resolves to)" first. Rookdex's `LanguageSwitch.astro` is the reference, minus the two-letter code beside the globe | It works without JavaScript, the script adds Escape, outside-click and arrow keys. The code text duplicated the accessible name and was wrong for three-letter codes. |
| Language row text | Autonyms from `Intl.DisplayNames`, `lang` attribute on every row, no flags | The browser already knows "norsk bokmål" and "українська". No translation file carries language names, so no bundle can get one wrong. |
| Theme | Light, dark, system; `prefers-color-scheme` resolves System; `<meta name="color-scheme" content="dark light">` | The current toggle is light/dark with dark as the stored default and no media query. System is the honest default and the OS already has a toggle. |
| Bundle format | Flat dotted keys, `{name}` placeholders, `.one`/`.other` plurals chosen by `Intl.PluralRules`, `en` as fallback | Unchanged from i18n 1.x. Nested JSON costs every runtime a flattening step and buys nothing. |
| Currency | Separate preference from language. Prices are numbers in data, never inside copy. Rendered with `Intl.NumberFormat`, `currencyDisplay: "symbol"` | `narrowSymbol` collapses NOK, SEK and DKK to "kr", which is wrong the moment two of them meet. `symbol` gives "kr" at home and "NOK" abroad. |
| Currency rows | Circle-flags SVG (MIT) + ISO 4217 code + `Intl.DisplayNames` currency name; EU flag for EUR | A currency belongs to a place in a way a language does not. SVG renders the same on every OS. |
| Default language set | `nb`, `en` (source) + `sv`, `da`, `de`, `fr`, `es`, `pl`, `uk` | Neighbours, the big European languages, and the two largest immigrant-language groups in Norway by the 2026 SSB figures. |
| Opt-in languages | `fi`, `is`, `nn` (public-sector duty only), `ar` (needs the RTL ticket first), `se` (no duty for private sites) | A project ships only what it can keep correct. These need a reader I can ask. |
| Translation production | I write `nb` and `en`. `tools/translate.mjs` diffs keys per language and emits a work list; the translation happens in-session and is committed; the key-drift test guards | Keeps translations in the repo, reviewable, and free of a runtime dependency on any service. |
| .NET reader | JSON-backed `IStringLocalizer` + `UseRequestLocalization` in `csharp-api`; a small reader bound to `CurrentUICulture` in `csharp-wpf` | Same files, same keys, same fallback rule as the web library, so a project with both ends never carries two string sets. |
| Build order | Spec → i18n v2 → DS pickers and theme model → translate script → C# readers. Rookdex migrates first | Each phase is usable alone and testable alone; Rookdex has the deadline. |

## 5. The preference model

One rule for all three preferences:

```
value = stored key (if valid) ?? system value
```

- **Valid** means the stored string is one of the project's configured options. Anything
  else (an old `no`, a typo, a value from a previous project on the same origin during
  development) is treated as absent and the key is removed on first read.
- **System** is the absence of the key, not a stored string `"system"`. Choosing the System
  row calls `removeItem`. This keeps the invariant that an existing key always holds a real
  option, and a user who clears site data lands on System for free.
- **The system value is live.** When no key is stored, the theme follows `matchMedia`
  change events while the page is open. Language and currency are read once per page load:
  a browser-language change mid-session is not a case worth code.
- **Resolution per preference:**

| Preference | System value | Notes |
|---|---|---|
| `lang` | first entry of `navigator.languages` with a bundle, after stripping the region and applying aliases (`no` → `nb`, `nn` → `nb` unless `nn` has a bundle) | Falls back to `en`. The library does this; the app passes the array in. |
| `theme` | `matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"` | Dark when the query is unsupported, matching the DS default. |
| `currency` | region of the first `navigator.languages` entry that carries one (`nb-NO` → NOK, `en-GB` → GBP, `pl-PL` → PLN); no region anywhere → the project's base currency | The region-to-currency table is the project's: it lists only the currencies it has prices for. |

- **Where it lives.** The i18n library stays DOM-free and owns the pure parts: alias
  mapping, array handling, display names, money formatting. Reading and writing the three
  keys, and the `matchMedia` listener, live in the design system's `theme/preferences.js`
  because they touch the DOM. In an MVC app the controller calls those helpers and keeps the
  chosen values in the model; the view only renders them.
- **Storage can fail.** Safari private mode throws on `setItem`, and a user can disable
  storage entirely. `readPreference` and `writePreference` catch and return `null` or do
  nothing, so the app behaves as System and a choice still holds for the open page because
  the model owns it. No message is shown: nothing the user asked for has failed.
- **Other tabs.** `preferences.js` listens to the `storage` event and re-applies the theme
  when another tab changes or clears the `theme` key. Language and currency changes from
  another tab apply on the next load, consistent with the read-once rule above.
- **No consent banner.** The three keys hold settings the user chose and nothing is written
  before that choice, so they are strictly necessary storage under ekomloven § 3-15. Nothing
  is read from the device except those keys and the browser's own preference APIs. This
  paragraph exists so nobody adds a banner for them later.

## 6. The picker component

### 6.1 Anatomy

```html
<details class="picker" data-picker="lang">
  <summary class="icon-btn">
    <svg class="icon" aria-hidden="true"><use href="#globe" /></svg>
    <span class="sr-only">Language: Norsk bokmål</span>
  </summary>
  <ul class="picker-list" aria-label="Language">
    <li><button class="picker-row" type="button" data-action="set-lang" data-lang="">
      System (<span lang="nb">Norsk bokmål</span>)</button></li>
    <li><button class="picker-row" type="button" data-action="set-lang" data-lang="nb"
      lang="nb" aria-current="true">Norsk bokmål <svg class="icon" aria-hidden="true"><use href="#check" /></svg></button></li>
    <li><button class="picker-row" type="button" data-action="set-lang" data-lang="en"
      lang="en">English</button></li>
  </ul>
</details>
```

- **Trigger:** the DS `.icon-btn` (44 px), one icon per use: `globe` for language, `sun` or
  `moon` for the resolved theme, the active currency's flag for currency. The accessible
  name is `"<preference label>: <current value>"` in a `.sr-only` span inside the summary,
  updated on every change. Not `aria-label` on `<summary>`: its support is uneven across
  screen readers, and the hidden span is what Rookdex already ships. No visible text beside
  the icon. `summary:focus-visible` gets the DS focus ring; browsers do not all draw one.
- **List:** `aria-label` with the setting name (`picker.language`, `picker.theme`,
  `picker.currency`), so a row reached in browse mode is "Dark, current, button, Theme list"
  and not a bare "Dark". Rows wrap long text; nothing is truncated.
- **Rows:** 44 px minimum height, full-width hit area, the active row carries
  `aria-current="true"` and a check icon. In an SPA the rows are buttons with `data-action`;
  in a per-URL site (Astro) the language rows are `<a hreflang lang href>` and
  `aria-current="page"`, exactly as Rookdex has them. Theme and currency rows are always
  buttons.
- **System row:** first, labelled `"System (<resolved value>)"` so the user sees what
  System means right now. Its `data-*` value is the empty string, which the controller
  maps to `removeItem`.
- **Language rows** carry `lang="<code>"` so a screen reader switches voice per row. The
  System row's resolved autonym sits in its own `<span lang>` because the rest of that row
  is in the UI language. Row text is the autonym with its first letter upper-cased in
  JavaScript (CLDR gives "norsk bokmål" in lower case; `::first-letter` does not apply to
  inline children). When `Intl.DisplayNames` is unavailable the row shows the code.
- **Currency rows:** flag as `<img alt="" src=".../flags/no.svg">`, ISO code, currency name.
  An `<img>` never runs a script inside an SVG and cannot leak page CSS; the flags need no
  `currentColor`. Width of the code column fixed with `ch` units so names align.
- **Text goes through `textContent` or the view's escape helper.** Autonyms, currency names
  and `money()` output are `Intl` strings, not user input, but the scaffold view renders
  with `innerHTML`, so the rule is the same as for every other string: never concatenate
  raw.
- **Icons** come from the DS icon set. `sun`, `moon` and `check` exist; the set gains
  `globe` (the sprite has no globe today).

### 6.2 Behaviour

Rookdex's `wireLanguageMenu` becomes `components/picker.js` in the DS. It installs one set
of delegated listeners on `document` (`click`, `keydown`, `focusout`, and `toggle` in the
capture phase, since `toggle` does not bubble) that act on whichever `details[data-picker]`
the event belongs to. Nothing is wired per node, so a view that re-renders its header needs
no rewiring and nothing double-binds. This is how `theme-toggle.js` and `palette-switch.js`
already work.

- Opening focuses the active row, or the first row when none is active.
- `ArrowDown` / `ArrowUp` move between rows and wrap. `Home` / `End` jump to the ends.
- `Escape` closes and returns focus to the trigger.
- A pointer-down outside, or focus leaving the disclosure, closes it without moving focus.
- Choosing a row closes the picker. In an SPA the controller updates the model, the view
  re-renders the header, and focus lands on the trigger of the picker that was used, found
  by its `data-picker` value (`lang`, `theme`, `currency`). The trigger's new name
  ("Theme: Dark") is the audible result of the press; no live region is involved. In a
  per-URL site the link navigates and the new page's focus rule applies.
- Only one picker is open at a time: opening one closes any other `[data-picker][open]`.
- No animation. The DS `prefers-reduced-motion` rule has nothing to suppress.
- The open list is positioned under its trigger and anchored to the trigger's right edge,
  so a right-aligned picker never pushes the list past the viewport at 320 px.

### 6.3 Where the pickers sit

In the header, right-aligned, in the order language, theme, currency, each only when the
project has more than one option for it. A project with one currency renders no currency
picker. The header is rendered by its own `renderHeader(state)`, outside the main
`render(state)` path, and re-rendered only when one of the three preferences changes. That
is the one place trigger names, icons and `aria-current` are updated, so no partial DOM
patching exists, and unrelated state updates never tear a picker down. The header must
fit at 320 px: three 44 px triggers, gaps and the wordmark, with no horizontal scroll.

### 6.4 Accessibility

- `<details>` and `<summary>` give the disclosure semantics; no `role="menu"`, since these
  are settings, not application commands, and menu semantics would demand arrow-key-only
  navigation and break Tab.
- Trigger and rows meet 44 × 44 px; the DS test for `.icon-btn` already pins the floor.
- The check icon and the flags are decorative (`aria-hidden`); state is in `aria-current`
  and the trigger name, never in the icon alone.
- Forced-colors mode: the active row uses the DS `Highlight` pattern from the 3.7.0
  pressed-state work; the check icon draws with `currentColor`.
- `<html lang>` and `<title>` follow the active language, as the scaffolds already do.
- Zoomed to 200 % text size, the list must not clip: `max-block-size` with scroll, never a
  fixed height.

## 7. Language

### 7.1 The i18n library, v2.0.0

`libraries/i18n/index.js` stays one DOM-free file. Changes:

```js
const i18n = createTranslator({ en, nb, sv }, {
  fallback: "en",
  aliases: { no: "nb", nn: "nb" },   // the default; a project may extend or override it
})

i18n.resolveLang(stored, navigator.languages)
// candidates may be strings or arrays, in priority order; each is lower-cased,
// the region stripped, aliases applied when the plain tag has no bundle.
// "nb-NO" → "nb", ["en-GB", "nb"] → "en", "no" → "nb", "nn" → "nb" (no nn bundle), "xx" → skipped

i18n.displayName("nb")               // "Norsk bokmål" (Intl.DisplayNames autonym, first letter upper-cased)
i18n.displayName("nb", "en")         // "Norwegian Bokmål" (named in another language, for admin screens)
i18n.money("nb", 949, "NOK")         // "949,00 kr"
i18n.money("en", 949, "NOK")         // "NOK 949.00"   (currencyDisplay: "symbol", never narrowSymbol)
i18n.t / i18n.plural / i18n.languages / i18n.fallback   // unchanged
```

Why a major bump: `resolveLang` changes its contract (arrays, aliases), the scaffold wiring
changes (System entry, header split), and `index.d.ts` gains two functions. `t()` still does
not escape variables; that rule stands.

### 7.2 Bundles

Unchanged format, now with reserved keys every project carries because the pickers need
them:

```json
{
  "picker.language": "Language",
  "picker.theme": "Theme",
  "picker.currency": "Currency",
  "picker.system": "System ({value})",
  "theme.light": "Light",
  "theme.dark": "Dark"
}
```

Language names and currency names are not keys; `Intl.DisplayNames` supplies them.

### 7.3 Codes and URLs

- Bundle files are `src/locales/<tag>.json` with the plain language subtag: `nb.json`,
  `en.json`, `uk.json`.
- Per-URL sites use `/<tag>/` and emit `hreflang` for every language plus `x-default` on
  the root. The root `/` is a small page that resolves the stored `lang` or
  `navigator.languages` in the browser and replaces the location with `/<bundle key>/`,
  never with the stored string itself; crawlers see the root with its `hreflang` links and
  no redirect. The same root page lists every language as a plain link, so a visitor without
  scripts, and a crawler, can still get in. Legacy `/no/` paths get a permanent redirect to
  `/nb/` in the project's hosting config.
- `<html lang>` is the plain subtag. Formatting calls (`Intl.DateTimeFormat`,
  `Intl.NumberFormat`) receive the same subtag. The region from `navigator.languages` is used
  for currency resolution only; it is not stored.

## 8. Currency

- A project declares its currencies in its model config:
  `currencies: ["NOK", "EUR", "USD"]`, `baseCurrency: "NOK"`, and a region table
  `{ NO: "NOK", SE: "SEK", DK: "DKK", DE: "EUR", ... }` listing only regions it maps.
- Prices are stored as `{ amount: 949, currency: "NOK" }` or as a map of amounts per
  currency when the project sets prices per market. A string like `"949 kr"` in a bundle is
  a key-drift test failure: the test rejects values that match a digit followed by a
  currency symbol or code.
- Rendering goes through `i18n.money(lang, amount, currency)`. The active language chooses
  separators and symbol placement; the active currency chooses the symbol.
- Flags: `libraries/design-system/assets/flags/<cc>.svg` holds only the flags the default
  currency set needs (NO, SE, DK, EU, US, GB, PL, UA), copied from circle-flags (MIT,
  confirmed from the repository's licence metadata on 2026-10-01) with its notice in
  `assets/flags/LICENSE`. A DS test fails if any file under `assets/flags/` contains
  `<script`, `<foreignObject`, `href="http` or an `on*=` attribute. A project adding a
  currency copies the flag it needs and inherits the test.

## 9. Translation production

`tools/translate.mjs <project-dir>`:

- Reads `src/locales/en.json` as the source and every other bundle as a target.
- Keeps `src/locales/.translated.json`: for each language, key → SHA-256 of the English
  value at the time the translation was written.
- `--status` (default) prints, per language, the keys that are missing and the keys whose
  English source changed since they were translated. Exit code 1 when anything is listed,
  so CI can run it. A third group, keys whose value equals the English value, is printed as
  a warning with exit code 0: "OK" is the same in Swedish, but an untranslated placeholder
  looks identical, and the warning is where I see the difference.
- `--worklist out.json` writes the same as JSON: `{ "sv": { "picker.theme": "Theme" } }`.
  I translate that in-session (or hand it to a reader for the opt-in languages), write the
  values into the bundles, and run `--stamp` to record the hashes.
- `--stamp` rewrites `.translated.json` for every key whose target value is non-empty.
- `nb.json` is exempt from staleness tracking: I write it alongside `en.json`, and the
  key-drift test already proves it is complete.
- Languages I do not read are machine-translated and reviewed by me as the responsible
  editor. The consumer project's README says which languages those are and where to send a
  correction. The EU AI Act's labelling duty does not reach UI strings, but a reader who
  finds a clumsy sentence deserves to know why and how to fix it.

The scaffolds' key-drift test gains two checks: no value contains a price-like string
(§ 8), and every bundle contains the reserved picker keys (§ 7.2).

## 10. .NET readers

Same JSON files, same fallback rule, pinned to .NET SDK 10.0.300.

- **`csharp-api`:** `App.Api/Localization/JsonStringLocalizer.cs` implementing
  `IStringLocalizer`, loading `App.Api/Locales/<tag>.json` once at startup, falling back to
  `en` per key, then to the key itself. `Program.cs` adds `UseRequestLocalization` with
  the supported cultures from the files present, `Accept-Language` as the only provider
  (no cookie, no query string), and a small `IRequestCultureProvider` placed first that maps
  `no` and `nn` to `nb` before the supported-culture match. The culture used for lookup is
  always the one the middleware resolved from the supported list, never the raw header, so
  no file path is ever built from request text. The header is not logged. Error
  responses (ProblemDetails `title`) are the first consumer. One integration test per
  rule: `Accept-Language: nn` returns Bokmål, an unknown language returns English, a
  missing key returns the key.
- **`csharp-wpf`:** `Services/Localizer.cs` with `string T(string key, params (string, object)[] vars)`,
  `Plural(key, count)` via `CultureInfo.CurrentUICulture` plural categories for `one`/`other`
  (the only two the shipped languages need on the desktop), and a `LanguageChanged` event the
  view models re-raise `PropertyChanged` on. `Locales/*.json` are embedded resources. The
  stored preference lives in the app's settings file under the same three keys. On a
  language change the main window's `Language` property is set to the chosen culture, so
  Narrator and NVDA switch voice the way `<html lang>` does on the web.
- **`csharp-layered` and `csharp-console`** have no user-facing UI strings worth a bundle;
  they get a README line pointing here and nothing else.

## 11. Structure

```
libraries/i18n/
├── index.js                   # v2: resolveLang arrays + aliases, displayName, money
├── index.d.ts                 # types for the two new functions
├── README.md                  # the preference model in six lines, the API, the rules
└── VERSION                    # 2.0.0

libraries/design-system/
├── components/picker.css      # .picker, .picker-list, .picker-row, currency column
├── components/picker.js       # delegated document listeners, from Rookdex's language-menu.ts
├── components/icons.js        # + globe if missing
├── theme/preferences.js       # readPreference, writePreference, systemTheme, watchSystemTheme
├── theme/theme-toggle.js      # v2: [data-theme-set="light|dark|system"]; [data-theme-toggle] kept and deprecated
├── theme/theme-init-snippet.html  # v2: stored key ?? prefers-color-scheme; color-scheme meta
├── assets/flags/*.svg + LICENSE
├── gallery/                   # a Pickers panel showing all three
├── CHANGELOG.md               # 3.8.0
└── VERSION                    # 3.8.0

tools/translate.mjs + tools/translate.test.mjs

scaffolds/web-vite/            # header with three pickers, controller owns the keys, model holds lang + theme + currency
scaffolds/web-react-ts/        # PreferencesProvider replaces LanguageProvider; same keys
scaffolds/csharp-api/          # Localization/, Locales/, UseRequestLocalization, tests
scaffolds/csharp-wpf/          # Services/Localizer.cs, Locales/, tests
```

Theme toggle compatibility: `[data-theme-toggle]` keeps cycling light and dark for
consumers that have not migrated (Hugin, Wend), logs nothing, and is removed in DS 4.0.0.
The new attribute is the standard from 3.8.0.

## 12. Consumer migration

| Project | What changes | When |
|---|---|---|
| Rookdex (Astro) | `no` → `nb` in routing, content folders, `hreflang`, `<html lang>`; permanent redirects `/no/*` → `/nb/*`; TypeScript string objects → flat JSON through the i18n library; the two-letter code leaves the trigger; "949 kr" becomes a number rendered with `money()`; root `/` resolves from the stored key or `navigator.languages` | First, before 1 November |
| web-vite, web-react-ts | Re-extract i18n and DS; replace the switcher with the header pickers; add theme and currency to the model | With the DS 3.8.0 release |
| Varde (React) | Keeps its own React i18n for now; adopts the picker markup and the `lang` key when next touched | Its own session |
| Hugin, Wend | DS sync (both are behind already); `data-theme-toggle` keeps working until they adopt the picker | Their own sessions |

## 13. Acceptance

Each phase ships on its own PR and is done when its checks pass:

**i18n 2.0.0**
- `tools/i18n.test.mjs` covers: array candidates, region stripping, `no`/`nn` aliases,
  alias skipped when the plain tag has a bundle, `displayName` autonym with upper-cased
  first letter, `money` producing `"949,00 kr"` for `nb` and `"NOK 949.00"` for `en`.
- `index.d.ts` compiles against the React scaffold's bundles with the two new functions typed.

**DS 3.8.0**
- Gallery Pickers panel: all three pickers, both themes, measured in the browser: trigger
  44 × 44 px, every row ≥ 44 px tall, one bottom edge across the header row, no clipping at
  200 % text size (rows scroll), and at 320 px wide the header has no horizontal scroll and
  each open list stays inside the viewport (bounding boxes read off the page).
- `summary:focus-visible` shows the DS focus ring in both themes and in forced-colors mode.
- Keyboard walk recorded in the PR: Tab to trigger, Enter opens on the active row, arrows
  wrap, Escape returns focus, Tab out closes.
- axe (the web-vite Pa11y harness and the React Playwright scan) reports zero violations on
  a page with the three pickers open one at a time.
- A fresh profile with `prefers-color-scheme: light` and no stored key renders light; with
  the key set to `dark` renders dark; choosing System removes the key; a stored `no` or
  `system` is removed on first read (asserted in the e2e tests of both scaffolds via
  `localStorage`). A second page in the same context flips theme when the first clears the
  key.
- A unit test stubs `localStorage.setItem` to throw and asserts the model still holds the
  choice and nothing else throws.
- The flags test goes red on a fixture SVG containing `<script>`.
- `scaffold-sync.test.mjs` green after re-extracting both bundling scaffolds.

**translate.mjs**
- Unit tests: missing key listed, changed source listed, unchanged key silent, identical
  value warned with exit 0, `--stamp` writes hashes, `nb` exempt, exit code 1 on findings.
- The scaffolds' price-string check goes red on a fixture bundle containing `"949 kr"` and
  on `"NOK 949"`, and stays green on `"{price}"`.
- Run against web-vite with `sv` added and one key removed: the status output names it.

**C# readers**
- `csharp-api`: three integration tests from § 10 green, plus one with a malformed
  `Accept-Language` value that returns English and a 200; `dotnet test` green on a fresh
  copy with zero edits.
- `csharp-wpf`: unit tests for `T`, placeholder interpolation, plural `one`/`other`, and
  fallback; `dotnet test` green.

**Rookdex (in its repo)**
- `/no/` returns 301 to `/nb/`; every page carries `hreflang` for `en`, `nb` and
  `x-default`; the root resolves client-side with no 3xx; its copy test rejects price strings.

Workbench bumps a minor version per shipped phase. `docs/index.html` gets the spec card when
the first phase ships.

## 14. Accepted trade-offs

- **Formatting ignores the user's region.** A Norwegian speaker in the UK gets Norwegian
  number and date formats. Storing the full tag would fix it and double the resolution
  rules; not worth it until a user asks.
- **Language and currency are not live.** Changing the OS language while the page is open
  takes effect on the next load. Theme is live because the OS toggle is a thing people flip
  with the page open.
- **No arrow-key wrap-around between pickers.** Each picker is its own disclosure; Tab moves
  between them.
- **The System row shows the resolved value in the current language.** "System (English)"
  in a Norwegian UI reads oddly for a second; it is still more honest than a bare "System".
- **Autonym casing is a JavaScript upper-case of one character.** Wrong for a language whose
  autonym must start lower-case. None in the default or opt-in sets does.
- **`.translated.json` is a committed sidecar.** One more file in `src/locales`; the
  alternative (metadata inside bundles) would break the flat-key contract every runtime
  relies on.
- **The deprecated `data-theme-toggle` cycles light and dark only.** A migrated consumer
  gets System; an unmigrated one keeps what it had. Removing it now would break Hugin and
  Wend on their next sync for no gain.

## 15. Open questions

- None blocking. The RTL ticket (two physical properties plus `dir` handling) is the first
  follow-up, and it gates `ar`. The region-to-currency table could become a shared default
  in the library if a third project needs it; until then it is project config.

## 16. Considered and rejected (stress test, 2026-10-01)

- **A live region announcing "Language changed".** Focus returns to a trigger whose name now
  states the value, which is the result itself. A second announcement is noise.
- **`role="menu"` with `aria-activedescendant`.** Menu semantics force arrow-key-only
  travel and break Tab; these are settings rows, and the disclosure already has native state.
- **Blocking `--stamp` on values identical to English.** Legitimate in many languages
  ("OK", brand names); a warning keeps the signal without a per-key allowlist.
- **A cookie so the server can render the right theme without the inline snippet.** The
  snippet already prevents the flash, a cookie would turn a local setting into a request
  header, and no scaffold renders server-side.
- **Storing `"system"` as a value.** The absent key already means System; a stored sentinel
  would need its own validation and would survive a project's own `clear()` paths wrongly.
- **Per-node `wirePicker` with a dispose function held by the view.** Delegation removes the
  lifecycle entirely; a dispose handle is a bug waiting for the one view that forgets it.
- **Locking the summary name to `aria-label` for brevity.** Shorter markup, uneven support
  on `<summary>`; the hidden span is the proven form.

> Stress-tested 2026-10-01 (skill 0b01b4c) — 13 applied, 4 adapted, 0 decided by me.
