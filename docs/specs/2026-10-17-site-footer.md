# Site footer: icons where the meaning is universal, short text where it is not

- **Date:** 2026-10-17
- **Home:** `libraries/design-system/` (DS 3.11.0)
- **Depends on:** DS 3.10.0 from the layout-by-construction plan (`.control-row`,
  `--control-height`), shipped 04.11.2026 as workbench v2.22.0. `VERSION` reads 3.10.0 on
  04.11.2026, so 3.11.0 is free; the version moves up if something else claims it first.
- **Origin:** Varde's footer redesign (`malinfossum/varde`,
  `docs/superpowers/specs/2026-10-16-varde-footer-design.md`), approved 2026-10-16. Varde builds
  it first in its own Tailwind port; this spec makes the pattern a standard.

## 1. Why

The footer I want is a small muted label over a row of plain brand icons, short small
uppercase text, and a theme switcher as three icons in a pill. It is clean because it spends
words only where an icon cannot carry the meaning. Inspired by the footer on sanity.io. Every project I ship
needs a footer, and today each one invents its own. This spec gives them one.

## 2. The rule

**An icon where the meaning is universal, short text where it is not. A safety, legal or trust
link is always text.**

- Universal: a brand mark linking to that brand (GitHub, LinkedIn, YouTube), sun, monitor and
  moon for the theme.
- Not universal: "Report an error", "About and liability", "Delete your history", a privacy
  promise. These stay words, because a wrong guess at an icon costs the reader more than the
  space the words take.
- Every icon-only control has a hidden name in every language the app ships, and a tooltip with
  the same name for mouse users.

This rule goes into `docs/component-rules.md` (a new § Icons or text) and applies to headers and toolbars too, not
only footers.

## 3. What ships in DS 3.11.0

| Piece | File | New or changed |
| --- | --- | --- |
| Site footer composition | `compositions/site-footer.css` | new |
| Theme pill | `components/theme-pill.css` | new |
| Theme script v3 | `theme/theme-toggle.js` | changed: keeps `aria-pressed`, writes a status line |
| Tooltip | `components/tooltip.css`, `components/tooltip.js` | new |
| Brand marks | `components/brand-icons.js` | new, `github` only |
| Rules | `docs/component-rules.md` | changed |
| Gallery | `gallery/sections.js` | a Footer panel |
| Tests | `tools/design-system.test.mjs` | static checks |

### 3.1 Site footer composition

Markup, in reading order (the same at every width):

```html
<footer class="site-footer">
  <div class="site-footer-row" data-tips>
    <p class="site-footer-lead">One or two sentences that must be read, with any vital link.</p>
    <nav class="site-footer-nav" aria-labelledby="footer-label">
      <span id="footer-label" class="site-footer-label" data-align="label">About this site</span>
      <span class="cluster">…text links, each a 44 px target…</span>
    </nav>
    <p class="site-footer-note"><span>© Name · No tracking.</span> <span>No cookies.</span></p>
    <div class="site-footer-bar control-row">
      …icon links (brand marks)…
      …the theme pill…
    </div>
  </div>
</footer>
```

- **Below 1024 px:** a stack. The label shows over the links. The note sits on its own line. The
  bar spreads its two ends apart (icons at the start, the pill at the end).
- **From 1024 px:** one wrapping flex row, `justify-content: space-between`. The label becomes
  visually hidden but still names the nav. The lead is capped at `17rem` so it wraps to two
  lines inside the 44 px row in English; a longer language (Norwegian runs about a third
  longer) may take three, and the row grows with it, because the outer row is not a
  `.control-row` and makes no height promise. Every group except the nav is `flex: none`, so
  groups wrap whole, never in the middle.
- **Label and note** share one text style: `0.75rem`, `line-height: 1rem`, uppercase through
  `text-transform`, `letter-spacing: 0.14em`, `var(--text-muted)`. The note is two short lines
  (each `span` is `display: block`). The label carries `data-align="label"`, so layout-audit's
  label contract proves it stands off from the links after it (weight, size or colour), at
  every width, also while it is visually hidden.
- **The note is each project's own true statement.** "No tracking. No cookies." is the
  gallery's sample, true for the gallery. A project writes what holds for it: a site that
  stores a theme in `localStorage` still has no cookies, but a site with analytics may not copy
  the sample unchanged (markedsføringsloven § 7, a misleading claim). The composition doc says
  so beside the markup.
- **A project with no text links omits the nav** (label included), never an empty landmark.
- **Icon links** at the start of the bar get `margin-inline-start: -0.75rem` below 1024 px, so
  the 20 px glyph lines up with the text above while the 44 px target stays whole.
- The bar is a `.control-row` (3.10.0), so every control in it shares one height and one bottom
  edge by construction, and layout-audit checks it. It wraps like any `.control-row`: at 320 px
  with three or more marks the pill drops to a second line at the end, and the contract holds
  per line.

### 3.2 Theme pill

```html
<div class="theme-pill" role="group" aria-label="Theme">
  <button class="theme-pill-btn" type="button" data-theme-set="light" aria-pressed="false">
    ${icon("sun")}<span class="sr-only">Light</span>
    <span class="tip tip-above" aria-hidden="true"><span class="tip-bubble">Light</span></span>
  </button>
  …system (monitor), then dark (moon, with tip-end)…
</div>
<p class="sr-only" role="status" data-theme-status></p>
```

- Order: light, system, dark, so the pill reads as a scale.
- Each button is `--control-height` square and round. The pill's outline is an inset 1 px
  `box-shadow` in `var(--border)`, so it adds no size. Pressed: `color: var(--text)` and an
  inset 1 px ring in `var(--text)`.
- Forced colours: the pill gets `outline: 1px solid CanvasText`; the pressed button takes the
  same look as `.btn[aria-pressed="true"]` in `button.css` (`forced-color-adjust: none`,
  `background: Highlight`, `color: HighlightText`), so the system has one pressed look. A fill,
  not an outline, so it never replaces the focus ring.
- `icons.js` gains `monitor` (it has `sun` and `moon`). Fifteen icons.
- **A project uses the pill or the 3.8.0 theme picker, not both on the same screen.** The pill
  suits a footer; the picker suits a header that already holds the language picker.

### 3.3 Theme script v3

`theme/theme-toggle.js` today applies the theme on a click on any `[data-theme-set]` but never
marks which one is current. v3 adds two things, still as one set of delegated listeners:

- **Pressed state:** on load, after every click, and on the `storage` and `prefers-color-scheme`
  events, every `button[data-theme-set][aria-pressed]` gets `aria-pressed="true"` when it
  matches the stored key (`system` when no key is stored) and `"false"` otherwise. Opt-in by
  the attribute: a control that ships without `aria-pressed` in its markup is never touched,
  which is how the 3.8.0 picker rows (buttons that carry `aria-current`) stay out of it. The
  gallery's sidebar group already ships `aria-pressed="false"` on its three buttons, so v3 takes
  that work over: `gallery/app.js` drops its own `aria-pressed` loop in `syncTheme`, leaving one
  writer.
- **Status line:** after every click on a pill button, the pressed one included, if the page
  has `[data-theme-status]` elements, the script writes the group's name and the button's
  name into every one of them with `textContent` ("Theme: Dark"), read from the closest
  `[role="group"]`'s `aria-label` and the button's `.sr-only` text. With no group name it
  writes the button's name alone, never ": Dark". No strings live in the script, so it works in
  any language. A click on the already pressed button writes the same line again, because every
  press needs an audible result (house rule, NVDA pass 07.10.2026): the script clears the
  element first and writes on the next frame, so a repeated line is announced and not swallowed
  as "no change".
- **The status element** must be in the page's first HTML, outside any container a view
  re-renders, or a screen reader may miss the first change (the house live-region rule). The
  gallery and the composition docs show it as the footer's last child. Every element with
  the attribute gets the line, so a hidden live region and a visible echo coexist (amended
  09.11.2026: the draft said only the first).

### 3.4 Tooltip

A generic hover and focus tooltip, because icon-only controls need one and the DS has none.

- Markup: a `span.tip` inside the control, holding a `span.tip-bubble`, `aria-hidden="true"`
  (the control's hidden text carries the name). The control gets `class="tip-host"`.
- Position: below by default; `tip-above` for controls near the bottom of the screen (a footer);
  `tip-start` and `tip-end` align to the control's start or end edge instead of its centre, for
  controls at the page edges.
- The gap between control and bubble is the tip's own transparent padding, so the pointer can
  move onto the bubble without it closing (WCAG 1.4.13, hoverable).
- Shown on `:hover` and `:focus-visible`, only under `(hover: hover) and (pointer: fine)`, so a
  tap on a phone never leaves a tooltip behind. It appears at once, with no transition, so there
  is nothing for `prefers-reduced-motion` to switch off.
- Forced colours: the bubble gets `border: 1px solid CanvasText`, because its background and
  shadow are dropped and the text would float on the canvas.
- `tip-start` and `tip-end` exist so a bubble never leaves the viewport: at 320 px the first
  and last control in the bar use them, and the Footer panel proves it (§ 6).
- `tooltip.js` (delegated, like the other scripts): Escape sets `data-tips="hidden"` on every
  `[data-tips]` container, which hides its tips, until the pointer enters or focus lands on a
  `.tip-host` inside it (WCAG 1.4.13, dismissible).

### 3.5 Brand marks

`components/brand-icons.js` exports `brandIcon(name, { size })` with the same calling style as
`icon()`. Brand marks are **filled**, unlike the stroke icons, because a mark is drawn the way its
owner draws it.

- Ships with `github` only. A project adds a mark when it needs one, through a PR to the DS.
- An unknown name returns an empty string, so a typo shows nothing rather than markup from a
  caller. Names are never built from user input.
- Octicons is MIT: its copyright and permission notice travel with the mark as a comment block in
  `brand-icons.js`, as the flags' notice travels in `assets/flags/LICENSE`.
- Each mark's comment cites its source, its licence, and the owner's logo guidelines, checked
  on a named date. The mark is used unaltered, coloured only through `currentColor`.
- `docs/component-rules.md` § Icons: "one stroke family, no mixing in filled icons" gains the
  exception "except brand marks from `brand-icons.js`".

## 4. Varde mapping

Varde builds first, in its Tailwind port, with its own class names. When it later adopts the DS
it maps them as follows:

| Varde | DS |
| --- | --- |
| `.footer-row` | `.site-footer-row` |
| `.footer-liability` | `.site-footer-lead` |
| `.footer-label`, `.footer-note` | `.site-footer-label`, `.site-footer-note` |
| `.footer-bar` | `.site-footer-bar.control-row` |
| `.footer-tip`, `.footer-tip-bubble`, `.footer-tip-start/end`, `.footer-tip-host` | `.tip.tip-above`, `.tip-bubble`, `.tip-start/end`, `.tip-host` |
| `.theme-pill`, `.theme-pill-btn` | same |
| `useDismissibleTips()` | `tooltip.js` and `[data-tips]` |

## 5. Gallery

A **Footer** panel shows the composition with sample text in English, the GitHub mark and a live
theme pill that drives the gallery's own theme. Its status line is visible in the panel (not
only to screen readers), so the behaviour can be seen.

## 6. Tests

Static checks in `tools/design-system.test.mjs`, in the style of the 3.10.0 tests:

- `site-footer.css` exists, is imported by `compositions/index.css`, stacks below 1024 px and
  rows from `min-width: 1024px`. The "no `max-width` query in shipped CSS" guard already exists
  in `tools/design-system-layout.test.mjs` and covers the new file for free.
- `theme-pill.css` sets the inset outline, the pressed ring, and under `forced-colors: active`
  the `Highlight` fill with `HighlightText` ink.
- `tooltip.css` hides tips outside `(hover: hover) and (pointer: fine)`, `[data-tips="hidden"]`
  hides them inside it, the bubble has a `CanvasText` border under forced colours, and the file
  holds no `transition` or `animation`.
- `theme-toggle.js` sets `aria-pressed` and holds no user-facing strings (a regex for quoted
  words fails on any).
- `brand-icons.js`: every mark has a source comment with a URL and a date; no mark holds
  `<script`, `<foreignObject`, `href=` or an `on*=` attribute (the same check the flags have).
- `theme-toggle.js` in jsdom: a pill with no group name writes only the button's name; a click
  on the pressed button writes the line again; a `button[data-theme-set]` without
  `aria-pressed` in its markup is never given one; a `storage` event re-marks the pressed
  button; the status element is written with `textContent` (a name holding `<b>` arrives as
  text).
- `gallery/app.js` no longer sets `aria-pressed` (a grep guard), so v3 is the only writer.
- `brandIcon("nope")` returns `""`.
- The two scanners (`userFacingStrings` and the markup check the brand marks share with the
  flags) each have a fixture that must fail; the guards that pin shipped files need none
  (amended 09.11.2026: the draft asked one of every guard).

**Browser check, manual.** No CI job audits the gallery (the layout-audit job runs the
library's own fixtures), so I run this myself before the 3.11.0 tag, on the gallery served
locally, and paste the counts into the PR: layout-audit (3.10.0) over the Footer panel at every
cell of the shared matrix (`shared.js`: 320, 375, 768, 1024, 1280, 1920 px, text at 100 and
200 %, WCAG 1.4.12 spacing at 320 and 1280), default theme only until themes join the matrix
(layout-by-construction ruling 10, deferred); one row at 1280; and a hover on the first and
last `.tip-host` at 320 px with the bubble's `getBoundingClientRect()` inside the viewport.

## 7. Version and release

DS `3.11.0` (minor, additive). CHANGELOG entry, `VERSION`, README components list. Consumers
re-extract when they want it. Nothing existing changes, apart from `theme-toggle.js` now
setting `aria-pressed` on pressed-style buttons, which a consumer with its own pressed logic
should check (named in the CHANGELOG).

## 8. Considered and rejected

- **A radio group for the pill.** One tab stop and arrow keys would also be valid. The 3.8.0
  picker rows and Varde's Meny already use pressed buttons, so the pill does too: one model.
- **The pill without JavaScript.** Its buttons do nothing until `theme-toggle.js` runs, like the
  picker rows. The init snippet already applies the stored or system theme, so nothing looks
  wrong meanwhile.
- **Escape in `tooltip.js` and `picker.js` both firing.** Hiding tooltips while a picker closes
  is harmless, so the two scripts do not coordinate.
- **A gallery audit in CI.** It needs a served gallery and a Playwright harness inside the DS
  library, which no consumer needs. The manual run in § 6 is honest about who runs it and when;
  a CI job comes when a second composition needs the same proof.
- **Themes in the browser check.** The shared matrix has no theme axis yet (ruling 10 of the
  layout plan). The footer uses only tokens that both themes define, so a theme adds no layout
  risk; the check joins the matrix when the axis lands.
- **Writing the status line when another tab changes the theme.** Nothing was pressed here, so
  there is no result to confirm; the pressed state updates silently, as the picker rows do.

## 9. Out of scope

- A multi-column "link farm" footer (Claude.com style). One footer pattern first.
- Social marks beyond GitHub until a project needs them.
- Changing the 3.8.0 theme picker.
- Varde adopting the DS. That is Varde's own decision, later.

> Stress-tested 2026-11-04 (skill a217382): 8 applied, 3 adapted, 0 decided by me.
