# Site footer: icons where the meaning is universal, short text where it is not

- **Date:** 2026-10-17
- **Home:** `libraries/design-system/` (DS 3.11.0)
- **Depends on:** DS 3.10.0 from the layout-by-construction plan (`.control-row`,
  `--control-height`). This work starts after that release, and the version moves up if
  something else claims 3.11.0 first.
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
      <span id="footer-label" class="site-footer-label">About this site</span>
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
  lines inside the 44 px row. Every group except the nav is `flex: none`, so groups wrap whole,
  never in the middle.
- **Label and note** share one text style: `0.75rem`, `line-height: 1rem`, uppercase through
  `text-transform`, `letter-spacing: 0.14em`, `var(--text-muted)`. The note is two short lines
  (each `span` is `display: block`).
- **Icon links** at the start of the bar get `margin-inline-start: -0.75rem` below 1024 px, so
  the 20 px glyph lines up with the text above while the 44 px target stays whole.
- The bar is a `.control-row` (3.10.0), so every control in it shares one height and one bottom
  edge by construction, and layout-audit checks it.

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
- Forced colours: the pill gets `outline: 1px solid CanvasText`; the pressed button
  `border: 2px solid Highlight`. A border, not an outline, so it never replaces the focus ring.
- `icons.js` gains `monitor` (it has `sun` and `moon`). Fifteen icons.
- **A project uses the pill or the 3.8.0 theme picker, not both on the same screen.** The pill
  suits a footer; the picker suits a header that already holds the language picker.

### 3.3 Theme script v3

`theme/theme-toggle.js` today applies the theme on a click on any `[data-theme-set]` but never
marks which one is current. v3 adds two things, still as one set of delegated listeners:

- **Pressed state:** on load, after every click, and on the `storage` and `prefers-color-scheme`
  events, every `[data-theme-set]` that is a `button` gets `aria-pressed="true"` when it matches
  the stored key (`system` when no key is stored) and `"false"` otherwise. Picker rows, which use
  `aria-current`, are left alone.
- **Status line:** after a click, if the page has a `[data-theme-status]` element, the script
  writes the group's name and the button's name into it ("Theme: Dark"), read from the closest
  `[role="group"]`'s `aria-label` and the button's `.sr-only` text. With no group name it
  writes the button's name alone, never ": Dark". No strings live in the script, so it works in
  any language. Clicking the pressed button changes nothing and writes nothing.
- **The status element** must be in the page's first HTML, outside any container a view
  re-renders, or a screen reader may miss the first change (the house live-region rule). The
  gallery and the composition docs show it as the footer's last child.

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
  tap on a phone never leaves a tooltip behind.
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
  rows from `min-width: 1024px` (no `max-width` query).
- `theme-pill.css` sets the inset outline, the pressed ring and the forced-colours border.
- `tooltip.css` hides tips outside `(hover: hover) and (pointer: fine)`, and `[data-tips="hidden"]`
  hides them inside it.
- `theme-toggle.js` sets `aria-pressed` and holds no user-facing strings (a regex for quoted
  words fails on any).
- `brand-icons.js`: every mark has a source comment with a URL and a date; no mark holds
  `<script`, `<foreignObject`, `href=` or an `on*=` attribute (the same check the flags have).
- `theme-toggle.js` in jsdom: a pill with no group name writes only the button's name; a click
  on the pressed button writes nothing; a `storage` event re-marks the pressed button.
- `brandIcon("nope")` returns `""`.
- Each new guard has a fixture that must fail.

A browser check through layout-audit (3.10.0) on the gallery's Footer panel: one row at 1280,
`.control-row` contract holds at 320, 375, 1024, 1280, both themes, text at 200 %.

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

## 9. Out of scope

- A multi-column "link farm" footer (Claude.com style). One footer pattern first.
- Social marks beyond GitHub until a project needs them.
- Changing the 3.8.0 theme picker.
- Varde adopting the DS. That is Varde's own decision, later.

> Stress-tested 2026-10-17 (skill 1b85fca): 5 applied, 0 adapted, 0 decided by me.
