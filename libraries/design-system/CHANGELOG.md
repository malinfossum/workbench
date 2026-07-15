# Changelog

Versions track the `VERSION` file. Consumers: compare your extracted copy's version, then
re-run `node tools/extract.mjs design-system <target>` to catch up.

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
