# Design System

Reusable UI foundation. Tokens, primitives, components, compositions, utilities, theme. Dark-mode-first, mobile-first, semantic.

Current version: see `VERSION`.

## Local preview

Serve the folder over HTTP. Opening the files directly via `file://` (double-click) won't load the linked CSS/JS, so the page renders blank. From this folder:

```powershell
python -m http.server 8099
```

Then open <http://localhost:8099/gallery/>, or `/sandbox/` for the scratch page.

## Principles

- Warm near-black dark mode (the house amber-gold, the default identity) with a restrained accent;
  true black stays reserved for the deepest layer via `--surface-0`
- Semantic tokens over hard-coded values
- Primitives before page-specific layout
- Subtle motion only when it improves clarity
- Accessible defaults from the start (focus rings, reduced-motion, forced-colors, skip link)
- Reusable structure for both small and growing projects

## Structure

- `tokens/`: colors, spacing, typography, radius, shadows, motion, layers (the values), plus `palettes/` (opt-in brand palettes)
- `base/`: `reset.css` and `base.css` (HTML defaults, focus rings, reduced motion, forced colors, skip link)
- `primitives/`: layout helpers (`stack`, `cluster`, `grid`, `sidebar`, `split`, `center`, `container`)
- `components/`: `button`, `card`, `input`, `nav`, `modal`, `alert`, `badge`, `progress`, `stat`, `table`, `toast`, `tabs`, `skeleton`, `icon`, `picker` (CSS) + `icons.js` (the SVG set) + `picker.js` (picker behaviour)
- `compositions/`: page patterns (`app-shell`, `dashboard`, `settings`, `hero`, `empty-state`)
- `utilities/`: single-purpose helpers
- `theme/`: `theme-toggle.js`, `palette-switch.js`, `preferences.js` (stored preferences and the theme model) and `theme-init-snippet.html` (inline `<head>` snippet)
- `assets/fonts/`: self-hosted fonts (Sora, Figtree, Fraunces, Instrument Serif, Schibsted Grotesk, Atkinson Hyperlegible Next, Space Grotesk, Bricolage Grotesque, Hanken Grotesk)
- `assets/flags/`: circle flags for the default currency set (NO, SE, DK, EU, US, GB, PL, UA), from circle-flags (MIT, notice in `assets/flags/LICENSE`)
- `gallery/`: panel-swap MVC reference (browse every component live)
- `sandbox/`: scratch page for quick experiments
- `docs/`: system spec and usage notes

## Icons

`components/icons.js` is an ES module: `icon(name, { size = 20, strokeWidth })` returns an
inline SVG string on a 24-unit grid with `stroke: currentColor`, so an icon takes the colour
of the control it sits in and follows the theme. Every icon is decorative (`aria-hidden`,
`focusable="false"`). The control carries the name: visible text beside the icon, or an
`aria-label` on an icon-only `.btn.icon-btn`. Stroke thins from 1.75 to 1.25 at 40px and up,
so a 48px empty-state icon keeps the weight of a 20px one. `ICON_NAMES` lists the set.

```js
import { icon } from "./design-system/components/icons.js";

`<button class="btn btn-primary" type="button">${icon("plus")} Add</button>`;
`<button class="btn icon-btn" type="button" aria-label="Close">${icon("close")}</button>`;
```

## File picker

The native file control's "Choose File" button cannot be styled. `.file-input-hidden` moves
the real `<input type="file">` off screen without taking it out of the tab order, and a
`<label class="btn file-input-label">` pointed at it by `for` becomes the visible control.
Clicking the label opens the picker, Tab lands on the input and the focus ring shows on
the label, and a screen reader still announces the field by its label. Because the native
filename text is gone with the control, reflect the choice yourself: write the name into
the field's `.help`, or show a preview.

```html
<div class="field">
  <span class="label" id="cover-label">Cover image</span>
  <input class="file-input-hidden" id="cover" type="file" accept="image/*" aria-labelledby="cover-label" aria-describedby="cover-help" />
  <label class="btn file-input-label" for="cover">Choose image</label>
  <span class="help" id="cover-help">JPEG, PNG or WebP.</span>
</div>
```

## Toggle buttons

A `.btn` with `aria-pressed="true"` gets the on look: an accent wash and a doubled accent
edge, so the state shows by shape as well as colour, and `Highlight` in forced-colors mode.
Use it for a set of options where one is active, such as a language switcher. Screen
readers announce the state from `aria-pressed` itself, so keep the attribute in sync.

```html
<nav aria-label="Language" class="cluster">
  <button class="btn btn-ghost" type="button" aria-pressed="true" lang="en">English</button>
  <button class="btn btn-ghost" type="button" aria-pressed="false" lang="nb">Norsk</button>
</nav>
```

## Pickers

A preference picker is a `<details class="picker" data-picker="lang|theme|currency">`
disclosure: the `.btn.icon-btn` on its `<summary>` is the trigger (one icon, the name in a
`.sr-only` span), and a `.picker-list` of `.picker-row` buttons (or links on a per-URL site)
opens under it, anchored to its right edge. The System row goes first and names what it
resolves to right now. The active row carries `aria-current` and a check icon. Currency rows
add a `.picker-flag` image and a `.picker-code` column. The markup works without JavaScript;
`components/picker.js` (a classic script, loaded like `theme-toggle.js`) adds the keyboard
and focus rules for every `details[data-picker]` on the page: open on the active row,
arrows wrap, Home and End, Escape refocuses the trigger, outside pointer-down and Tab out
close, one picker open at a time. Full anatomy and behaviour: the locale standard spec.

```html
<details class="picker" data-picker="theme">
  <summary class="btn icon-btn">${icon("moon")}<span class="sr-only">Theme: Dark</span></summary>
  <ul class="picker-list" aria-label="Theme">
    <li><button class="picker-row" type="button" data-theme-set="system">System (Dark)</button></li>
    <li><button class="picker-row" type="button" data-theme-set="light">Light</button></li>
    <li><button class="picker-row" type="button" data-theme-set="dark" aria-current="true">Dark ${icon("check")}</button></li>
  </ul>
</details>
```

## Theme behavior

The rule for every preference is `stored key (if valid) ?? system value`, and System is the
absence of the key. The initial theme is set by an **inline `<head>` snippet** so there's no
flash on first paint. Copy `theme/theme-init-snippet.html` into every scaffold's `<head>`,
before stylesheets; it also carries `<meta name="color-scheme" content="dark light">`. The
click handler in `theme/theme-toggle.js` sets the theme from any `[data-theme-set="light"]`,
`"dark"` or `"system"` element; `system` removes the key, and while no key is stored the page
follows `prefers-color-scheme` and other tabs. `[data-theme-toggle]` (cycle light and dark)
still works for consumers that have not migrated; it is deprecated and goes in 4.0.0.

`theme/preferences.js` is the ES-module half for a controller: `readPreference(key, valid)`
(an invalid stored value is removed on first read), `writePreference(key, value)` (`""` or
`null` removes the key), `systemTheme()`, `applyTheme()`, `watchSystemTheme()`,
`watchStorage()` and `initTheme()`. Every helper catches storage errors, so Safari private
mode behaves as System and the model still holds the choice for the open page.

**Brand palettes** use a separate `data-palette` axis. Set `data-palette="gold"`, `"wend"`, `"daily"`, `"ignite"`, `"kenaz"`, `"tidsro"`, `"hugin"` or `"classic"` on `<html>` to recolour the accent (and, for full brands, the surfaces and gradient), with every derived token following automatically. The OLED palettes (`daily`, `ignite`, `hugin`) go further and also carry **type**: switching one swaps fonts and heading treatment along with colour, so the whole feel changes. `palette-switch.js` sets it on `[data-palette-set]` clicks; the init snippet restores the saved palette. **No attribute (or `data-palette="default"`) renders the house amber-gold**. Since 3.0.0 the default identity is a warm near-black ground with a `222 166 72` accent; Sora stays the display face, inherited from `:root` with no typography override. It was blended out of the Kenaz and Gold palettes as they stood in 3.0.0; `kenaz` has since moved to its Lantern brand colours, so the default is now its own identity rather than a mirror of a shipped palette. See the "Default identity" comment block in `tokens/colors.css` for the exact mechanism. Daily (`data-palette="daily"`) is a standalone opt-in palette again, not the default's source. `classic` opts back into the pre-3.0.0 default byte-for-byte, for a consumer that wants to keep it; `kenaz` (3.1.0) carries the same values as a living brand rather than a frozen pin. Each palette ships dark + a contrast-tuned light variant. See `docs/oled-palettes.md`.

## Type skins

The default identity (3.0.0+) is Sora display over a Figtree body, inherited straight from
`:root`. It's the same pairing `gold`, `wend`, `tidsro` and `kenaz` resolve to, since none of them
set their own `--font-display` either. Only `daily` carries its own type (Space Grotesk); it's
a standalone opt-in palette, not the default's source. `data-palette="classic"` opts back into
the pre-3.0 default wholesale: same type as today's default, different colour. Three opt-in
type skins swap the display face (and for nordic, the body) without touching color, and compose
with any palette including the default:

| Skin | Headings | Body |
|---|---|---|
| `fraunces` | Fraunces 600 (h1/h2/stats only) | Figtree |
| `instrument` | Instrument Serif (h1/h2/stats only) | Figtree |
| `nordic` | Schibsted Grotesk 700 | Atkinson Hyperlegible Next |

Opt in with `<html data-typeskin="fraunces">`. Skins compose with color palettes
(`data-palette`). Set both attributes to combine them.

## Versioning

Bump `VERSION` when the system changes in a way that would affect existing projects:

- **MAJOR**: breaking change (renamed token, removed component)
- **MINOR**: additive (new component, new utility)
- **PATCH**: fix (bug, accessibility correction, doc update)

When bumping, sync the lean parts (`tokens/`, `base/`, `primitives/`, `components/`, `compositions/`, `utilities/`, `theme/`, `assets/`) into each scaffold's bundled `design-system/`.
