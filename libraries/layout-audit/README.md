# Layout audit

Checks that UI built from my design system primitives lines up, in a real browser, at every width, text size and locale. Each primitive's class is also its test contract.

## Contracts

| Contract | Marker | What must hold (1 px tolerance) |
|---|---|---|
| `control-row` | `.control-row`, `data-align="row"` | Per visual row: one height, one bottom edge |
| `switcher` | `.switcher`, `data-align="switch"` | All items in one row, or all in one column |
| `row-list` | `.row-list`, `data-align="rows"` | One arrangement for all rows; one left edge for the actions |
| `card-grid` | `.card-grid`, `data-align="slots"` | Slot k of every card on one visual row shares one top edge; no card has more parts than `--card-slots` |
| `label` | `dt` before `dd`, `data-align="label"` before its value | Label and value differ in weight, size or colour |
| `control-floor` | any control inside a primitive | At least 44 px tall |
| `clipped-text` | any element inside a primitive | Text is never cut off by `overflow: hidden` or `clip` |
| `no-sideways-scroll` | the page | The page is never wider than the viewport |
| `data-align` | `data-align` | The value is one of `row`, `switch`, `rows`, `slots`, `label` |

Hidden elements are skipped with `checkVisibility()`, and so are 1 px visually hidden boxes. A primitive that holds items in a collapsed or overflowing box is reported: a zero-size box, or a query container whose content is wider than the container (the message names the width the content needs).

## Use it

Copy it into a scaffold's test folder with the extract tool, never into `src/`:

    node tools/extract.mjs layout-audit ../my-app/e2e          # Playwright: ../my-app/e2e/layout-audit
    node tools/extract.mjs layout-audit ../my-app/tests/e2e    # Puppeteer:  ../my-app/tests/e2e/layout-audit

Playwright (`e2e/layout.spec.ts`):

    import { layoutSuite } from "./layout-audit/playwright.js"
    layoutSuite({ paths: ["/"], locales: ["en-US", "nb-NO"] })

Puppeteer: see `scaffolds/web-vite/tests/e2e/layout.test.js`.

## API

`playwright.js` exports `layoutSuite`, `checkLayout`, `settle`, `CONTRACTS`, `validateKnown` and `unreachableKnown`. `puppeteer.js` exports `checkLayout(page, url, cell, { locale, known, checkLang })`, `cells`, `cellName`, `knownFor`, `validateKnown`, `CONTRACTS` and `unreachableKnown`.

- `CONTRACTS` is the list of the nine contract names, for validating a known list.
- `unreachableKnown(known, paths, locales)` returns the known entries that no matrix cell reaches. `layoutSuite` throws on any; a Puppeteer test should assert that it returns an empty list.

## The matrix

Widths 320, 375, 768, 1024, 1280 and 1920 px; text at 100 % and 200 % (`html { font-size: 200% }`, the WCAG 1.4.4 case); every locale I pass. The WCAG 1.4.12 text-spacing override (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em) runs at 320 and 1280 only. Each cell waits for `document.fonts.ready`, reloads once with fonts cached, and runs with reduced motion. Themes are not in the matrix, and 1.0.0 has no theme option. I add one later if a project needs it.

A cell fails when:
- any violation is not on the known list;
- a known entry no longer reproduces (the list can only shrink);
- the page found zero primitives, unless the path says `{ path, expectPrimitives: 0 }`;
- the page answered an HTTP error;
- `<html lang>` does not match the cell's locale (turn off with `checkLang: false`).

## Known violations

    layoutSuite({
    	paths: ["/"],
    	known: [{ contract: "row-list", selector: ".helplines", reason: "fix after the adoption preview", widths: [320, 375] }],
    })

`selector` matches the violator or any ancestor; a selector that matches `html`, `body` or `main`, or a wrapper that contains `main` (`#root`, `body > *`), is refused, since it would silence the whole page. `reason` is required. `paths`, `widths`, `textSizes`, `locales` and `spacing` scope an entry to the cells it names.

## Before Claude shows me UI

In the browser pane, on the live preview:

1. `resize_window` to 320 x 800 (the pane reports a 0 x 0 viewport until a size is set).
2. Read the project's `audit.js` and run its text with `javascript_tool`, then `auditLayout(document, { mark: true })`.
3. Repeat at 1280 px, and at 320 px after `document.documentElement.style.fontSize = "200%"`.
4. Fix every violation that is not on the project's known list before showing me anything. If a fix is a judgment call, screenshot the red outlines and ask.

## Test-only

`audit.js` and the adapters never ship. Each scaffold has a bundle test that builds the app and fails if `auditLayout` appears in the output. Audits run against fixture or seed data only, so failure screenshots carry no personal data.

## Self-test

    cd libraries/layout-audit
    npm ci
    npx playwright install --only-shell chromium
    npm test

`fixtures/good.html` keeps every contract (with zero items, one item, long unbroken strings, Norwegian labels, hidden content and nested primitives); `fixtures/bad.html` breaks each one once.
