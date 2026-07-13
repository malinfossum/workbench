# Design-system identity refresh — design spec

- **Date:** 2026-07-13
- **Home:** `libraries/design-system/`
- **Depends on:** nothing new (pure CSS/token/asset change)
- **Blocks:** Ignite v2 styling (wants the new default look)

> **Revision note (implementation):** §7 gains two sibling tokens next to `--on-accent`:
> `--accent-solid` / `--accent-solid-strong` (fill + hover fill of `.btn-primary`,
> defaulting to `var(--accent)` / `var(--accent-strong)`). Palettes whose accent is
> mid-tone override the *solid fill* to reach 4.5:1 instead of altering their accent —
> keeping §3's "palettes visually untouched" promise everywhere except the one new
> solid surface. Enforced by the contrast test in `tools/design-system.test.mjs`.

## 1. Overview

The design system's default look finally gets a committed identity. Today `--font-sans`
lists Inter first, but Inter is not bundled — on most machines every default-look project
silently renders in Segoe UI. The bundled display fonts are only used by palettes. This spec
replaces the accidental default with a chosen one: **Sora 600** display + **Figtree** body,
a crisper shape language, and a high-contrast solid primary button — plus three opt-in type
skins (fraunces, instrument, nordic).

All candidates were compared as live browser specimens during brainstorm (2026-07-13);
the winning combination was picked visually by Malin, weight and shape included.

## 2. Goals

- Default look works and looks identical anywhere with zero setup: fonts self-hosted,
  latin subset (covers æøå), system-stack fallback.
- Distinctive headings, quiet body: personality lives in `--font-display`, reading comfort
  in `--font-sans`.
- One loud element per view: solid primary button; ghost/danger stay calm.
- Shape sharpens system-wide through the existing radius tokens — no per-component hacks.
- Type skins are the same opt-in mechanism as color palettes; consumers pick or ignore them.

## 3. Non-goals

- **No size-scale change** — `--text-xs…4xl` and line-heights stay as-is.
- **No color-palette changes** — daily, ignite, wend, gold, oled untouched (they keep
  their own font overrides and win over the new defaults, as today).
- **No component API changes** — class names, markup contracts, and token names all keep
  working; only values and new additive tokens.
- **No consumer migration** — projects that copied the design system keep their snapshot;
  they get the new look when they choose to re-sync via `extract.mjs`.
- **No mono/serif stack changes** — `--font-mono` and `--font-serif` stay.

## 4. Decisions (locked during brainstorm, 2026-07-13)

| Question | Decision | Why |
|---|---|---|
| Default fonts | Sora 600 display + Figtree 400/500/600 body | Picked visually from four live pairings; geometric-but-warm, reads "developer tool" without coldness |
| Heading weight | 600 (was 700 in early comps) | 700 felt too bold at hero size; 600 keeps small headings solid |
| Shape | 6px buttons/inputs, 8px cards, 4px badges, 42px control height | "Hybrid" winner: crisp geometry + solid primary from comp B, calm ghost/danger colors from comp A |
| Primary button | Solid `var(--accent)` fill, `var(--on-accent)` text, weight 600 | High contrast for the one action that matters; tints remain for secondary/danger |
| Type skins | `fraunces`, `instrument`, `nordic` as palette-style opt-ins | Malin liked three directions; skins keep the default lean while offering them per-project |
| Small serif headings | Serif skins apply display font to h1/h2/hero/stat only | Instrument Serif at ~22px was hard to read; h3-and-below stay in the body sans |
| Rejected | Syne+Onest pairing; Instrument Sans as body | Visual rejects during brainstorm |
| Version | design-system `VERSION` → 2.0.0 | Token API compatible, but the default identity changes fundamentally — the number should say so |

## 5. Typography changes

`tokens/typography.css`:

- `--font-sans`: `"Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
  (Inter removed everywhere).
- `--font-display`: `"Sora", "Figtree", sans-serif`.
- New tokens: `--weight-display: 600`, `--tracking-display: -0.03em`,
  `--tracking-heading: -0.02em` (replaces the hardcoded `-0.02em` in `base.css`).
- `@font-face` additions: Sora 600, Figtree 400/500/600.
- `@font-face` removals: none beyond Inter (which never had one). Fraunces **stays**
  (used by the new `fraunces` skin). Space Grotesk / Bricolage / Hanken stay (palettes).

`base/base.css`:

- `h1–h4`: `font-family: var(--font-display); font-weight: var(--weight-display);
  letter-spacing: var(--tracking-heading)`; `h1`/`h2` use `--tracking-display`.
- Headings currently inherit sans and rely on palettes for display type; after this change
  the default itself is the identity, palettes still override the same tokens.

## 6. Shape changes

`tokens/radius.css` (remap + one addition):

| Token | Old | New | Used by |
|---|---|---|---|
| `--radius-xs` | — | 0.25rem | badges, chips |
| `--radius-sm` | 0.5rem | 0.375rem | buttons, inputs |
| `--radius-md` | 0.75rem | 0.5rem | cards, panels |
| `--radius-lg` | 1rem | 0.75rem | modals, larger surfaces |
| `--radius-xl` | 1.5rem | 1rem | hero/feature surfaces |
| `--radius-pill` | 999px | 999px | pills, avatars |

Component sweep: any component hardcoding a radius or using a token that no longer matches
its intended size class gets re-pointed (badge → `--radius-xs`, etc.). Control height in
`button.css`/`input.css`: `2.75rem` → `2.625rem` (42px; still comfortably above WCAG 2.5.8
minimum target size).

## 7. Button changes

`components/button.css`:

- `.btn-primary`: `background: var(--accent); border-color: var(--accent);
  color: var(--on-accent); font-weight: 600`. Hover: `var(--accent-strong)` fill.
- `.btn-ghost`: transparent background, **visible** `var(--border)` border (today it
  inherits the border but the comp confirmed we keep it — no change beyond radius/height).
- `.btn-danger`: unchanged soft tint (`--danger-soft` + tinted border).
- `.btn` (neutral/secondary) unchanged beyond radius/height.

New token `--on-accent` in `tokens/colors.css`, overridable per palette:

- Default (dark theme): a near-black picked from the existing dark-surface tokens at
  implementation time (whichever passes the contrast check below) so the solid accent
  reads as a light chip with dark text.
- **Every palette must define or inherit an `--on-accent` with ≥4.5:1 contrast against its
  `--accent`.** This is the one real risk in the spec; verification is scripted (§10).

## 8. Type skins

Three new files in `tokens/palettes/` (same opt-in include mechanism as color palettes;
they set type tokens only, no colors):

| Skin | Display | Body | Note |
|---|---|---|---|
| `fraunces.css` | Fraunces 600 | Figtree | Warm editorial; candidate for Spindle/Kenaz |
| `instrument.css` | Instrument Serif 400 | Figtree | Sharp editorial |
| `nordic.css` | Schibsted Grotesk 700 | Atkinson Hyperlegible Next 400/500 | Norwegian display + Braille Institute hyperlegible body; the accessibility-first option |

Serif-display skins (`fraunces`, `instrument`) include a scoped rule returning `h3, h4` and
small headings to `var(--font-sans)` — the display font applies only at h1/h2/hero/stat
sizes. `nordic` needs no such rule (grotesk holds up small).

## 9. Assets and licensing

New self-hosted files in `assets/fonts/` (Fontsource latin subsets, existing naming
pattern), plus OFL texts for each new family:

- `sora-latin-600-normal.woff2`
- `figtree-latin-{400,500,600}-normal.woff2`
- `instrument-serif-latin-400-normal.woff2`
- `schibsted-grotesk-latin-700-normal.woff2`
- `atkinson-hyperlegible-next-latin-{400,500}-normal.woff2`

~8 files, ~250 KB total. All SIL OFL — safe to redistribute in the public repo. The latin
subset includes æøå (U+00C0–00FF range); verified visually with Norwegian specimen text
during brainstorm. No font files are removed.

## 10. Verification

- Existing repo tests + `node tools/extract.mjs design-system --check` stay green.
- Gallery browser sweep: all sections at mobile (375px) and desktop (1280px) widths,
  default + each type skin, `document.fonts.check()` confirms real font loads (no silent
  system fallback — the exact bug this spec kills).
- Scripted contrast check: `--on-accent` vs `--accent` (and `--accent-strong` hover) for
  the default theme and every palette, threshold 4.5:1.
- Reduced-motion, forced-colors, and focus-visible behavior unchanged — spot-check only.

## 11. Rollout

1. Ship as design-system **2.0.0**, workbench **v2.3.0** (tag + Pages deploy as usual).
2. Gallery and storyboard demo pick the change up automatically (token consumers).
3. Consumers (Ignite, Kenaz, scaffold copies) re-sync individually when wanted; Ignite v2
   is the first planned consumer of the new look.
