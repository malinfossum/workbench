# OLED palettes — daily, ignite & hugin

Opt-in palettes built on a warm, near-black ground. Unlike the accent-only
brand palettes (`gold`, `wend`, `tidsro`, `kenaz`), these also carry **typography** —
switching to one swaps colour *and* type, so the whole feel changes. They're dark-first
("OLED-focused"); in light mode they fall back to the base light surfaces with a
contrast-tuned accent.

Opt in on `<html>`:

```html
<html data-palette="daily">
<html data-palette="ignite">
<html data-palette="hugin">
```

**As of 3.0.0, the default identity — no `data-palette` attribute, or
`data-palette="default"` — is a Kenaz/Gold blend**: Kenaz's surfaces, text
and borders, an accent at the arithmetic midpoint of Kenaz's amber and
Gold's gold, Sora display inherited from `:root` (see the "Default
identity" comment in `tokens/colors.css`, and the design system README).
In 2.1.0 (the last release) this state rendered the true-black,
cool-blue-grey, Sora identity carried in the plain `:root` blocks — that
identity isn't gone, see `classic` below. `daily` is a standalone opt-in
palette, exactly like `ignite` and `hugin` — set `data-palette="daily"`
explicitly to get it.

`hugin` is a new palette as of 3.0.0: hardened ember for the Hugin app. It
declares its own `--text`/`--border` ramp rather than sharing the OLED
foundation in `_oled.css` — deeper ground, wider surface steps and less
background↔text blending than `daily`/`ignite` — see its own section below.

`tokens/palettes/classic.css` (`data-palette="classic"`), also new as of
3.0.0, restates the 2.1.0 default (true-black surfaces, cool blue-grey
accent, Sora display) byte-for-byte, for a consumer that wants to pin
exactly what rendered before the Kenaz/Gold blend, without freezing the
rest of the library at an old version.

## daily — general-purpose

Warm-charcoal ground, ember accent, calm scale. Space Grotesk headings + Figtree body.

| Token | Value |
|---|---|
| `--surface-1` … `--surface-5` | `#0f0c09 → #2e271e` |
| `--surface-0` (true black) | `#000000` |
| `--accent` (ember) | `rgb(190 85 38)` · `#be5526` |
| `--text` / `--text-muted` / `--text-faint` | `#faf9f5` / `#beb9ad` / `#8a8478` |
| headings | Space Grotesk (`--font-display`) |
| body | Figtree (`--font-sans`) |

## ignite — the Ignite app

Greyer, wider-spread ground, flame accent, energetic type. Bricolage Grotesque
headings (tighter tracking) + Hanken Grotesk body, with bigger `.stat-value`
numbers for streaks and counts.

| Token | Value |
|---|---|
| `--surface-1` … `--surface-5` | `#0b0a0a → #343230` |
| `--surface-0` (true black) | `#000000` |
| `--accent` (flame) | `rgb(249 110 34)` · `#f96e22` |
| `--text` / `--text-muted` / `--text-faint` | `#faf9f5` / `#beb9ad` / `#8a8478` |
| headings | Bricolage Grotesque (`--font-display`) |
| body | Hanken Grotesk (`--font-sans`) |

## hugin — the Hugin app

Hardened v2: deeper ground and wider surface steps than the shared OLED
foundation, brighter muted text, stronger borders — separation over cozy
blending. Still ember-family. Space Grotesk headings + Figtree body.

| Token | Value |
|---|---|
| `--surface-1` … `--surface-5` | `#0a0806 → #362a1a` |
| `--surface-0` (true black) | `#000000` |
| `--accent` (ember) | `rgb(214 106 48)` · `#d66a30` |
| `--text` / `--text-muted` / `--text-faint` | `#fbf7ef` / `#cfc5b4` / `#9a9080` |
| `--border` | `#3b3227` |
| headings | Space Grotesk (`--font-display`) |
| body | Figtree (`--font-sans`) |

## How type-in-palette works

A palette sets `--font-sans` / `--font-display` and adds a scoped rule so headings
pick up the display face *only* under that palette — the default look is untouched.
For these overrides to win the cascade, `tokens/palettes/index.css` is imported
**last** in `tokens/index.css` (after `typography.css`).

Shared bits (true black, ivory text, warm borders) live once in
`palettes/_oled.css`, for `daily` and `ignite`; `hugin` declares its own
`--surface-0`/`--text`/`--border` ramp directly in `hugin.css` instead. Each
palette file owns its surfaces, accent and type. Fonts are self-hosted woff2
in `assets/fonts/`, declared in `typography.css`.

## Light mode

`daily`, `ignite` and `hugin` are dark-first. Toggling light keeps the base light
surfaces and only re-tunes the accent for contrast — the same approach `gold` and
`wend` use.
