# Changelog

Versions track the `VERSION` file. Consumers: compare your extracted copy's version, then
re-run `node tools/extract.mjs design-system <target>` to catch up.

## 3.4.0 — 2026-08-31

Light-mode redesign — crisp near-neutral ground. Visible change on every light-mode
surface in every palette (they all share the one light block) — re-extract.

- **Near-neutral grey ramp replaces the blue-tinted one.** The old ramp's tint
  (`--surface-5` was `#e2e8ee`, blue spread 12) bends pink under a warm display shift
  (Night Light, QD-OLED ambient cast) — the reported "light mode looks pink on every
  palette". New surfaces hold a blue spread ≤8 (`#f7f8f9` page → `#dee2e6`), pinned by
  a direction test (R ≤ G ≤ B, spread ≤ 8) like hugin's cool-cast test.
- **Crisper text and borders.** `--text` `#12161b` (18.2:1), `--text-muted` `#4e565f`
  (7.45:1, was 6.46), `--text-faint` `#697079` (5.01:1 — the old `#6f7b87` measured
  4.32:1 on the white field, under AA; a new test pins the 4.5 floor). Borders darken
  a step for edge definition; `--control-border` is `#82888f` (3.37:1 page, 3.58:1
  field — more headroom than 3.2.0's 3.16).
- **Neutral-first accent washes.** The dark wash formula (accent at 14% alpha) reads
  salmon over white for every warm accent — the old light washes carried an R-B excess
  of 19–25 on ember/amber/rust palettes. Light `--accent-soft`/`--accent-ghost` now mix
  a small accent share into the grey ramp (8% into `--surface-4`, 5% into `--surface-3`),
  opaque, so active/hover fills read as warm-neutral grey with a whisper of brand. A
  test caps the wash R-B excess at 10 for every palette's light scope.
- **Light-tuned shadows.** `shadows.css` shipped only the dark set (16–24% black,
  24–40px blurs — grey smears on white). A light block under the same selector pair
  carries lighter ink and tighter blurs; `--shadow-focus` stays derived.
- Light accents untouched (pinned by the classic freeze test); dark mode untouched.

## 3.3.0 — 2026-08-31

Hugin palette v3 "ember on slate" — a redesign of the hugin ground. Visible change on
every surface under `data-palette="hugin"` — re-extract.

- **Cool-slate ramp replaces the warm v2 ramp.** v2 put surfaces, borders and the ember
  accent in one warm hue family and everything blended. Every grey is re-found at its
  exact v2 contrast ratio (±0.001) on a cool cast (R ≤ G ≤ B), so nothing got lighter
  or darker — only the cast flipped. Ember `214 106 48` is now the sole warm element
  and is pinned by test; ivory `--text` stays; `--text-muted`/`--text-faint`
  desaturate to near-neutral. `--control-border` is `#5a656e` (3.34:1 page, 3.17:1
  field); `--border` `#2f3439` holds 1.51:1 on `--surface-2`. A new test asserts the
  cool-cast direction so a retune can't silently warm the ground back up.
- **Brand typography weights folded in** (previously local overrides in hugin-web):
  `--weight-display: 700` (Space Grotesk ships 700 only; root's 600 faux-bolded) and
  `th/strong/b` pinned to `font-weight: 600` (Figtree ships 400/500/600; the browser
  default 700 rendered synthesized).
- Light-mode ember values and all component wiring unchanged.

## 3.2.0 — 2026-08-28

Accessibility fix ([#16](https://github.com/malinfossum/workbench/issues/16)): control
boundaries now clear WCAG 2.2 SC 1.4.11's 3:1. Visible change on every input and
bordered button in every theme — re-extract.

- **New token `--control-border`** — the edge that identifies an interactive control.
  `--border` measured 1.22–1.50:1 against the page in every theme and palette, and no
  decorative border token cleared 3:1, so this is a new token per theme/palette
  (hue-matched to each ground), not a token swap. Every value clears 3:1 against both
  `--page-bg` and the field fill `--surface-2`, with headroom (3.15:1+). `tidsro`
  aliases its existing `--border-strong`, which was already tuned as its control
  affordance (4.17:1). Light mode carries one shared value, since palettes keep the
  base light surfaces.
- **`.input` / `.textarea` / `.select` and the bordered `.btn` variants point at it.**
  The base `.btn` (and so `.btn-ghost`) uses it directly; `.btn-secondary` /
  `.btn-danger` keep their hue by mixing 28% of their tint over it, which keeps the
  floor. Hovers strengthen toward the text ink via `color-mix` — `--border-strong` now
  sits *below* the resting boundary, so pointing hover at it would dim the edge.
- **Decorative edges do not move**: `.card`, `.alert`, `.table`, `.toast`, `.modal`
  keep `--border`/`--border-soft`, per the issue's scope — SC 1.4.11 doesn't apply to
  them, and a test now pins that they never adopt the control token.
- **Tests**: new contrast loop asserts the 3:1 floor for the token *and* the composed
  secondary/danger borders across every theme × palette (tidsro and the `_oled.css`
  foundation joined the loop while it was being built). Floors, not equalities — a
  palette may raise its value; only a drop fails.
- **`--border` / `--border-strong` values are untouched** — same route as the 42px
  control floor in 2.0.2: fixed here, synced out, no consumer-local overrides.

## 3.1.0 — 2026-08-25

Kenaz's palette is replaced. No change to the default identity, any other palette,
tokens, or components — re-extract only if you consume `kenaz`.

- **`kenaz` is now the Lantern brand identity**: cool blue-grey accent (`124 154 179`)
  over the true-black / cool near-black surface ramp, Sora display over Figtree body
  (both inherited from `:root` — the palette sets no `--font-display`). It replaces the
  torchlight-amber ramp shipped in 2.1.0. The Kenaz app's brand pack was designed in
  these colours, and the palette existed to serve that app; the amber version was the
  one that didn't match. It also removes a real collision — amber Kenaz differed from
  3.0.0's default only in the accent (`217 154 78` vs `222 166 72`), which is not a
  visible difference.
- **These are the same values `classic` carries**, on purpose. `classic` is a frozen
  compatibility pin that must keep tracking the plain `:root` blocks; `kenaz` is a
  living brand that may diverge. Both files say so, and both are covered by tests.
- **The default identity is untouched** — still the warm amber-gold ramp with the
  `222 166 72` accent, byte-for-byte. Its comments no longer describe it as "a
  Kenaz/Gold blend", since Kenaz no longer looks like that; the values it was blended
  from in 3.0.0 are recorded as history instead. Prose only, no behaviour change.
- MINOR, not MAJOR: the "no palette chosen" state renders exactly what it did in
  3.0.0, so no unpinned consumer changes. Consumers that opted into `data-palette="kenaz"`
  do get a full visual replacement — today that is the Kenaz app, deliberately.

## 3.0.0 — 2026-08-24

Identity pivot. Visual break for anyone on the default look — re-extract rather than
cherry-pick.

- **Default identity is a Kenaz/Gold blend.** The "no palette chosen" state — no
  `data-palette` attribute, or `data-palette="default"` (what the init snippet writes
  when nothing is saved) — now renders Kenaz's warm near-black ground, warm ivory text
  and warm borders, with an amber-gold accent at the arithmetic midpoint of Kenaz's
  torchlight amber and Gold's brass-gold (`222 166 72`), and Sora display type
  (inherited from `:root` — no typography override). In 2.1.0 (the last release) this
  state rendered the true-black / cool-blue-grey / Sora identity carried in `colors.css`'s
  plain `:root` blocks.
- **Those 2.1.0 values are not gone** — the plain `:root` blocks in `colors.css` and
  `typography.css` still declare them, unedited. `gold`, `wend`, `tidsro` and `kenaz`
  never carried their own surfaces or `--font-display`, so they've always derived those
  from `:root` directly; leaving it untouched and layering the blend on as a
  higher-priority-but-mutually-exclusive `[data-palette="default"], html:not([data-palette])`
  block means those four palettes keep resolving exactly the colors and type they did
  before.
- **New palette: `classic`** (`data-palette="classic"`) — preserves the pre-3.0.0
  default identity as an opt-in: true-black surfaces, cool blue-grey accent, Sora
  display over Figtree body, every value copied byte-for-byte from the (unedited)
  plain `:root` blocks. For any unpinned consumer that wants to keep the 2.1.0 look
  on their next sync instead of adopting the new default.
- **New palette: `hugin`** (`data-palette="hugin"`) — hardened ember for the Hugin
  app: deeper ground, wider surface steps, brighter muted text and stronger borders
  than the shared OLED foundation (`daily`/`ignite`), plus a hotter ember accent.
  Declares its own `--text`/`--border` ramp rather than sharing `_oled.css`'s —
  it isn't in that file's selector list. Separation over cozy: less blending between
  background and text, per spec item 1 ("current look is too soft/cozy"). `--border`
  sits at `#3b3227` rather than the round `#3a3126` to clear the 1.5:1 WCAG 1.4.11
  non-text floor kenaz.css documents (1.48:1 on `--surface-2` otherwise).
- **Daily is unaffected** — still a standalone opt-in palette (`data-palette="daily"`),
  same as `ignite`.
- MAJOR bump because this changes what unpinned consumers render, the same reasoning
  2.0.0 used for its own identity change.

## 2.1.0 — 2026-08-18

Two new opt-in brand palettes — no changes to tokens, components, or the default identity.
Re-extract to pick them up.

- **Kenaz palette** (`data-palette="kenaz"`): the low-energy sibling to Ignite — warm
  near-black surfaces over a true-black OLED page, torchlight amber accent. Border sits at
  `#322b22` to hold non-text contrast parity with the default palette (WCAG 1.4.11).
- **Tidsro palette** (`data-palette="tidsro"`): the Tidsro WPF app's palette ported to web
  tokens — neutral (hue-free) near-black surfaces starting at `#0a0a0a` so drop shadows still
  read, brass-gold accent as the only saturated colour, reserved `--surface-0` true black for
  non-casting overlays.
- Housekeeping: these palettes first landed on `main` without a version bump, which left the
  scaffold bundles stamped 2.0.2 while canonical content moved — the extract tool then
  (correctly) refused to sync, reading the same-version diff as local edits. This release
  stamps them properly; the rule stands that any canonical content change bumps `VERSION`.

## 2.0.2 — 2026-08-13

Accessibility patch — no new tokens or components. Re-extract to pick up the fix.

- **Controls return to a 44px floor.** `.btn`, `.input`/`.textarea`/`.select` and `.tab` go back
  to `min-height: 2.75rem` from the `2.625rem` (42px) that 2.0.0's shape pass introduced as
  "42px controls". WCAG 2.5.8 (AA) only requires 24×24, so 42px was never a conformance failure
  — but 44×44 is the house standard, taken from 2.5.5 Enhanced, and it is the number consumers
  write their own a11y checks against. Found when Wend synced 1.2.0 → 2.0.1 and its 44px rule
  met a 42px bundle with nothing in between to object.
- **Two tests now hold the floor**, because the 2.0.0 change was deliberate and documented and
  still wrong for consumers — so the guard has to be a test rather than a habit. One asserts the
  shortest `min-height` on each of the three control components; the other asserts no file in
  the bundle sets a root `font-size`, since that would rescale every rem-based floor without
  touching a single `min-height` value.
- **Not changed:** `.nav-link` stays at `2.5rem` (40px). It predates the shape pass rather than
  coming from it, so it is its own decision rather than part of this fix. Flagged, not folded in.

## 2.0.1 — 2026-08-11

Correctness patch — no new tokens or components. Re-extract to pick up the fixes.

- **`[hidden]` now always hides** (#6): one `!important` guard in `base/reset.css`. An
  author `display` beats the UA `[hidden]` rule, so button, badge, input, nav and toast
  rendered visible and keyboard-focusable while hidden. The local `.tab-panel[hidden]`
  patch in tabs is removed — the root rule covers it.
- **Daily palette body is Figtree** (#9): the stack named Inter, which is not bundled, and
  silently fell back to system-ui. A test now asserts every palette's lead typeface has a
  bundled `@font-face`.
- **Light-theme solid button gains contrast headroom** (#10): the fill steps down to the
  strong accent (4.59:1 → 5.62:1) and hover mixes 16% toward black (7.25:1). Both stay
  derived, so palette light modes resolve to their own ramp; ignite light rises to 6.17:1.
  Default identity is now test-held at ≥5.0:1, above the general 4.5 floor.
- Extract tooling (repo-side, #7 #8): `--check` detects within-version content drift, and
  the `VERSION` file is copied into consumers, so this file's "compare your version"
  instruction works from the vendored tree alone.

## 2.0.0 — 2026-07-14

The identity release. Visual break from 1.x — re-extract rather than cherry-pick.

- **Type identity:** Sora 600 display + Figtree body, self-hosted OFL woff2 (latin incl.
  æøå). Replaces Inter and kills the Inter→Segoe silent-fallback bug.
- **Crisp shape scale:** 6px buttons/inputs, 8px cards, 4px badges, 12px modals,
  42px controls.
- **Solid primary button** via new `--accent-solid`, `--accent-solid-strong`, and
  `--on-accent` tokens; WCAG ≥4.5:1 contrast is script-tested across all themes+palettes.
- **Type skins** via new `data-typeskin` attribute (composes with `data-palette`):
  `fraunces`, `instrument`, `nordic` (Schibsted Grotesk + Atkinson Hyperlegible Next).
  Serif skins return h3/h4 to the body sans.
- Mid-tone palette accents (e.g. daily's ember) override the button fill only; accent
  identity is untouched.

## 1.3.0 — 2026-06-23

- OLED palettes: `daily`, `ignite`.

## 1.2.0 — 2026-06-18

- Brand palette layer: `gold`, `wend`. Display font slot introduced.

## 1.1.0 — 2026-06-10

- MVC gallery and sandbox.
- Channel-token cascade.
- New components: toast, tabs, skeleton.

## 1.0.0 — 2026-04-27

- Initial release: tokens, primitives, components, compositions, utilities, theme.
