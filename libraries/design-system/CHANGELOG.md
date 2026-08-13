# Changelog

Versions track the `VERSION` file. Consumers: compare your extracted copy's version, then
re-run `node tools/extract.mjs design-system <target>` to catch up.

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
