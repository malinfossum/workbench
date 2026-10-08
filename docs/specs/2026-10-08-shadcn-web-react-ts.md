# shadcn/ui in web-react-ts

- **Date:** 2026-10-08
- **Home:** `libraries/design-system/tokens/tailwind.css` (DS 3.9.0), `scaffolds/web-react-ts/`
- **Depends on:** DS 3.8.0, i18n 2.1.0, Node 22, Vite 8, React 19.2, TypeScript 7, Biome 2.5, Vitest 5 (the pins the scaffold already carries); Tailwind 4.3, shadcn CLI 4.21, Base UI 1.8 (read off npm 2026-10-08)
- **Blocks:** Varde's next UI round (first React consumer); the Workbench registry (phase 3)
- **Supersedes:** the 2026-09-22 plan to fill the DS gaps (dialog, dropdown, popover, combobox) in vanilla CSS. Dropped 2026-10-02: shadcn covers them for React, and web-vite does not need them.

## 1. Overview

A reviewer of Hugin pointed at shadcn/ui. On 2026-10-02 I decided three things: the default
web stack is React + TypeScript (vanilla only where a framework is overkill), the design system
is not replaced, and shadcn comes into `web-react-ts` on top of it. This spec settles how.

The short version: `tokens/` stays the single contract. A new DS file maps my tokens onto
Tailwind's theme namespace so every shadcn component paints with my colours, my radii, my
fonts and my focus ring in both themes and every brand palette, without a second set of
values to keep in step. Five shadcn components ship in the scaffold with the handful of
house edits my standards require (44 px targets, named controls), each with the same three
test layers every other component has. Tailwind is installed without its reset, in a cascade
layer order that lets utilities win over DS component classes and lets DS tokens win over
Tailwind's defaults.

web-react-ts becomes the primary web scaffold. web-vite stays for vanilla work and does not
get Tailwind.

## 2. Goals

- **One contract.** `tokens/colors.css` and friends remain the only place a colour, radius or
  font is decided. shadcn reads them; it never duplicates them. A palette switch recolours
  shadcn components with no shadcn change.
- **My standards hold inside shadcn.** 44 px controls, a named trigger on every menu and
  combobox, a description on every dialog, visible focus, both themes at AA. The same axe,
  ARIA-snapshot and keyboard tests that guard my own components guard these.
- **The DS gaps close.** Dialog, dropdown menu, popover and combobox exist in React without
  me writing their focus management.
- **Nothing in web-vite changes.** The bridge file is inert in a project without Tailwind.
- **Measured, not assumed.** Every phase ends with a computed-style read, an axe scan or a
  keyboard walk against the real render.

## 3. Non-goals

- **No replacement of the design system.** The CSS components (`.btn`, `.card`, `.picker`
  and the rest) stay the house components; the header pickers stay `<details>` disclosures
  per the locale standard. shadcn fills gaps; it does not take over.
- **No Tailwind in web-vite, the storyboard, the gallery or any C# scaffold.** Tailwind is a
  React-scaffold concern.
- **No restyling of shadcn components to look like the DS components.** They inherit the
  tokens, which gets them most of the way. Pixel parity between `Button` and `.btn` is not
  a target; the rule is that a page never mixes the two for the same job.
- **No utility-first project code.** Project components keep using DS classes and
  `src/styles/main.css`. Tailwind utilities are for the generated `components/ui/` files
  and for composing them. A test fails on a raw Tailwind palette colour anywhere in `src/`.
- **No React Aria.** shadcn offers it as a third base; two bases is already one more than I
  want to reason about.
- **No `shadcn/create` presets, no `init -t` template.** The scaffold is the template.

## 4. Decisions (locked 2026-10-08)

| Question | Decision | Why |
|---|---|---|
| Where the mapping lives | `libraries/design-system/tokens/tailwind.css`, a `@theme inline` block that maps Tailwind's `--color-*` and `--font-*` names onto DS tokens. Not imported by `tokens/index.css`; the scaffold's CSS entry imports it | tokens/ is the contract (02.10 decision). Extract ships it to every scaffold; web-vite ignores it. Browsers ignore `@theme`, so the file is inert outside Tailwind. |
| shadcn's bare names (`--background`, `--primary`, …) | **Not defined.** The bridge targets Tailwind's `--color-background` directly from `var(--page-bg)` | shadcn's `--accent`, `--secondary` and `--radius-*` collide with DS names that mean something else. Mapping at the Tailwind layer avoids every collision and the second indirection. |
| Primitive library | **Base UI** (`init -b base`, style `base-nova`) | shadcn's default and its recommendation for new projects since July 2026; 1.0 in December 2025, monthly releases by a full-time team. Radix is alive but every shadcn doc example now assumes Base UI's `render` prop, and going against the default means translating each one. |
| Cascade layers | `@layer theme, base, design-system, components, utilities;` with the DS imported into `design-system` | DS tokens beat Tailwind's theme defaults, so `rounded-md` and `font-sans` read DS values. Utilities beat DS component rules, so `className="btn mt-4"` works. shadcn's `* { border-color }` base rule sits under the DS. |
| Tailwind preflight | **Off.** `theme.css` and `utilities.css` are imported, `preflight.css` is not | The DS reset is the reset. Two resets fight over `button`, `img` and `h1`. Tailwind v4's border utilities set their own style and width, so the preflight dependency shadcn had in v3 is gone. |
| Dark mode | `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` | The theme model keys on `html[data-theme]`. Without this line every `dark:` utility in a generated component silently never matches. No `.dark` class is ever written. |
| Tailwind's default colour palette | Removed (`--color-*: initial`), then `white`, `black` and the DS mapping re-declared | A stray `bg-red-500` must render nothing rather than a colour the DS does not own. Smaller CSS as a side effect. |
| `cn()` | shadcn's `cn` package, re-exported from `src/lib/utils.ts` as the CLI writes it | It is what the CLI generates today; swapping it for `clsx` would fight every future `add`. Pre-1.0, pinned exact. |
| `shadcn` as a runtime dependency | **Ejected** (`npx shadcn eject`) after init, so its `tailwind.css` is inlined and the package leaves `dependencies` | One CSS file is not worth a runtime dependency. The CLI stays an npx tool. If eject breaks a later `add`, § 16 says what to do. |
| Icons inside generated components | `lucide-react` stays, for the generated files only | The components import it internally; replacing those imports is a house edit on every file for no user-visible gain. Project code keeps the DS `Icon`. |
| Biome and Tailwind | `css.parser.tailwindDirectives: true`; `useSortedClasses` **off** until Biome 2.6 | The parser flag is required or the entry CSS fails to format. The sorter is nursery, uses the Tailwind 3.4 order and skips `md:`; its v4 order ships in 2.6. |
| Path alias | `@/*` → `src/*` in `tsconfig.json` and `vite.config.ts` | What the CLI and every doc assume. Vitest inherits it from Vite. |
| Component install discipline | `npx shadcn@<pinned> add <name>`, diff reviewed, `npm run check`, house edits applied, tests written, then commit. Re-adding a component is a diff review, never `--overwrite` | The CLI writes files from a remote registry into the repo. Every one of those files is my code after the commit. |
| Components shipped | `button`, `dialog`, `dropdown-menu`, `popover`, `combobox` | The four gaps plus the button the others compose with. Everything else is per project. |

## 5. The token bridge

`libraries/design-system/tokens/tailwind.css`, DS 3.9.0. One `@theme inline` block. `inline`
so each utility carries the DS variable itself (`background-color: var(--page-bg)`), which
means a token overridden on a subtree still applies, and palettes and themes flip it for free.

| Tailwind name | DS token | Note |
|---|---|---|
| `--color-background` | `var(--page-bg)` | |
| `--color-foreground` | `var(--text)` | |
| `--color-card`, `--color-card-foreground` | `var(--card-bg)`, `var(--text)` | |
| `--color-popover`, `--color-popover-foreground` | `var(--elevated-bg)`, `var(--text)` | Menus, popovers, combobox lists |
| `--color-primary`, `--color-primary-foreground` | `var(--accent-solid)`, `var(--on-accent)` | The solid-button pair, already AA in every palette |
| `--color-secondary`, `--color-secondary-foreground` | `var(--interactive-bg)`, `var(--text)` | shadcn's "secondary" is a quiet fill. The DS brand hue is exposed as `--color-brand-secondary` |
| `--color-muted`, `--color-muted-foreground` | `var(--interactive-bg)`, `var(--text-muted)` | |
| `--color-accent`, `--color-accent-foreground` | `var(--accent-ghost)`, `var(--text)` | shadcn's "accent" is the hover and selected-row fill, not the brand colour |
| `--color-destructive` | `var(--danger)` | Plus `--color-destructive-foreground: var(--on-accent)` for the components that still use it |
| `--color-border` | `var(--border)` | |
| `--color-input` | `var(--control-border)` | The SC 1.4.11 control boundary, not the decorative border |
| `--color-ring` | `var(--accent-strong)` | Opaque, so `ring-ring/50` can mix it. DS focus is `--shadow-focus`; see house edits |
| `--color-success`, `--color-warning`, `--color-info`, `--color-danger` and their `-soft` | the DS pairs | DS extras shadcn does not name; projects may use them |
| `--color-brand-secondary`, `--color-brand-secondary-soft` | `var(--secondary)`, `var(--secondary-soft)` | The DS hue, renamed so it cannot be mistaken for shadcn's fill |
| `--color-chart-1` … `-5` | accent, brand secondary, success, warning, info | |
| `--color-sidebar*` | panel-bg, text, accent-solid, on-accent, accent-ghost, text, border, accent-strong | So the `sidebar` component works if a project adds it |
| `--color-white`, `--color-black` | `#fff`, `#000` | Re-declared after the palette reset; `text-white` appears in generated files |
| `--font-heading` | `var(--font-display)` | `font-heading` utility. Named differently so it never self-references |
| `--shadow-ring` | `var(--shadow-focus)` | `focus-visible:shadow-ring`, the DS focus ring on shadcn controls (§ 7) |

What is **not** in the bridge, because the cascade already handles it: `--radius-sm/md/lg/xl`,
`--font-sans/mono/serif`, `--text-xs…4xl` and `--shadow-xs/sm/md`. Tailwind's default theme
declares all of these; the DS declares the same names in a later layer, so `rounded-md`
resolves to the DS 0.5 rem, `font-sans` to Figtree and `shadow-sm` to the theme-tuned DS
shadow. shadcn's `--radius` and its `calc()` derivations are left out on purpose.

Spacing is the one scale that stays Tailwind's: `p-4` is 1 rem through `--spacing`, and the
DS `--space-*` steps agree with it up to 4 and diverge above. Generated components use
Tailwind numbers; DS components use `--space-*`; nobody converts.

The file also carries the palette reset (`--color-*: initial`), the dark variant line, and
nothing else. Every `var()` it references must exist in `tokens/colors.css`; a DS test checks
that and that the file is not imported by `tokens/index.css`.

## 6. The cascade

The scaffold's CSS entry, `src/styles/index.css`, imported once from `src/main.tsx`:

```css
@layer theme, base, design-system, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "../../design-system/tokens/tailwind.css";
@import "tw-animate-css";

@import "../../design-system/tokens/index.css" layer(design-system);
@import "../../design-system/base/reset.css" layer(design-system);
@import "../../design-system/base/base.css" layer(design-system);
@import "../../design-system/primitives/index.css" layer(design-system);
@import "../../design-system/components/index.css" layer(design-system);
@import "../../design-system/compositions/index.css" layer(design-system);
@import "../../design-system/utilities/index.css" layer(design-system);

@import "tailwindcss/utilities.css" layer(utilities);

@layer base {
	* {
		@apply border-border outline-ring/50;
	}
}
```

The seven `<link>` tags leave `index.html`; the theme-init snippet and the `picker.js` module
stay. `tests/components/setup.ts` imports this one file instead of the seven. `main.css`
stays unlayered and last, so project overrides still beat everything.

Reading the order: Tailwind's theme defaults are lowest; shadcn's `*` border rule next; the
DS above both, so its tokens and component rules win; Tailwind utilities on top, so a
utility on a DS element wins. An element is either a DS component or a shadcn component;
the only utilities on a DS element are layout (`mt-4`, `flex`), never colour.

## 7. Theme and palettes

Nothing new. `html[data-theme]` flips every DS token, the bridge references the tokens, the
components follow. `html[data-palette="hugin"]` does the same. The scaffold's
`PreferencesProvider` stays the owner of the theme; shadcn's `ThemeProvider` from its dark
mode docs is not installed.

The only visible delta between a generated component and the DS is focus: shadcn draws a
3 px ring at 50 % of `--color-ring`, the DS draws `--shadow-focus` (4 px at 38 %). The house
edit in § 9 replaces the ring utilities with `focus-visible:shadow-ring`, where
`--shadow-ring: var(--shadow-focus)` is declared in the bridge. The Tailwind name differs
from the DS name on purpose: `--shadow-focus: var(--shadow-focus)` would be a self-reference.

## 8. Primitives: Base UI

`npx shadcn@4.21.4 init -b base` writes `components.json` with `"style": "base-nova"`,
`"iconLibrary": "lucide"`, `"tailwind": { "css": "src/styles/index.css", "cssVariables": true, "baseColor": "neutral" }` and the `@/` aliases. The `baseColor` is irrelevant after the
bridge replaces the generated `:root` and `.dark` blocks; `init` writes them into the entry
CSS and the first commit deletes them. The scaffold commits `components.json`, so a project
copied from it never runs `init` again, only `add`.

Base UI composes with a `render` prop where Radix used `asChild`. It matters in one place
for me: the dialog trigger that must be a DS `.btn` is `<DialogTrigger render={<button className="btn" />}>`.

Known accessibility gaps (2026-10-08) and what the scaffold does about each:

- **Combobox icon buttons have no accessible name** (shadcn issue 11589, open). House edit:
  the clear and toggle buttons get `aria-label` from the locale bundle. The axe test fails
  without it.
- **A dialog without a description** carried a dangling `aria-describedby` under Radix. Base
  UI is not affected, and the scaffold's rule is simpler anyway: every `Dialog` renders a
  `DialogDescription`. The ARIA snapshot test pins it.
- **Select triggers take no name from content.** `select` is not shipped; the README says
  to label it with `aria-labelledby` when a project adds it.

## 9. Components and house edits

Generated into `src/components/ui/`, one file each, formatted by Biome on add. Each then gets
the edits below, recorded as a comment block at the top of the file so a later diff against
the registry shows what is mine.

| Component | House edits |
|---|---|
| `button` | Sizes: `default` is `h-11 px-4` (44 px), `sm` is `h-11 px-3` (height never drops), `lg` is `h-12`, `icon` is `size-11`. Focus: `focus-visible:shadow-ring` replaces the ring utilities. `destructive` variant uses `bg-destructive text-destructive-foreground` |
| `dialog` | `DialogContent` always renders `DialogDescription`; the close button carries `aria-label` from the bundle (`dialog.close`). Overlay uses `bg-black/60`, content `bg-popover` with `shadow-md` |
| `dropdown-menu` | `DropdownMenuItem`, `CheckboxItem`, `RadioItem`: `min-h-11 px-3` so every row is a target. Content `bg-popover` |
| `popover` | `PopoverContent` `bg-popover`; nothing else |
| `combobox` | Input `h-11`; rows `min-h-11`; clear and toggle buttons get `aria-label` (`combobox.clear`, `combobox.toggle`); the list is named by the input's label |

A DS test already measures `.btn` at 44 px; the component tests do the same for every
shadcn control through `getBoundingClientRect()`.

Three examples go into the scaffold's demo page next to the Counter, each small enough to
delete in a minute: a dialog that confirms the Counter reset, a dropdown menu with three
items, and a combobox over the currency list. They prove the three interaction models
(modal, menu, listbox) and give the e2e scan something to open.

Locale bundle keys added to `en.json` and `nb.json`: `dialog.close`, `combobox.clear`,
`combobox.toggle`, `combobox.empty`, plus the strings the three examples show.
`tests/locales.test.ts` keeps them in step.

## 10. Tooling

- **Tailwind:** `tailwindcss` and `@tailwindcss/vite` as devDependencies, `tailwindcss()` in
  `vite.config.ts` plugins. No `tailwind.config.*`, no PostCSS file.
- **TypeScript:** `baseUrl` and `paths` added; strict settings unchanged. Generated files
  that trip `noUnusedLocals` or `verbatimModuleSyntax` get fixed on add, not exempted.
- **Biome:** `tailwindDirectives: true` under `css.parser`; `src/components/ui` is formatted
  and linted like everything else; `design-system` stays excluded. `useSortedClasses` is not
  enabled (§ 4). The `@apply` line in the entry CSS is the only one in the project.
- **Dependencies added:** `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`
  (runtime); `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `@types/node`
  (development). Licences MIT, Apache-2.0 (cva), ISC (lucide). `cn` and `shadcn` pinned
  exact; the rest caret like the existing pins. Dependabot already watches the scaffold.
- **Telemetry:** none is documented for the shadcn CLI, Tailwind or Base UI. Phase 2 greps
  the installed CLI for `telemetry` before its first run and records the result in the PR.
- **The CLI's network step:** `init` and `add` fetch JSON from `ui.shadcn.com` and write
  files. The pinned version, the reviewed diff and the commit are the control; no
  `postinstall`, no registry other than the default until phase 3.

## 11. Tests

The existing three layers, extended; no new runner.

**DS (`tools/design-system.test.mjs`):** the bridge references only tokens that exist; it is
not imported by `tokens/index.css`; the dark variant line targets `data-theme`; VERSION is
3.9.0 and the README documents the bridge.

**Component tests (`tests/components/*.test.tsx`, Chromium):** one file per shipped component:

- axe clean, closed and open, with the stylesheet loaded (contrast counts);
- ARIA snapshot of the open state (names, roles, `aria-expanded`, `aria-controls`);
- keyboard: open with Enter, move with arrows, close with Escape, focus returns to the
  trigger;
- geometry: every control and row at ≥ 44 px; `rounded-md` resolves to 8 px; a `.btn` with
  `mt-4` gets 16 px of margin (proves the layer order);
- palette: with `data-palette="hugin"` on `<html>`, `Button` reads hugin's `--accent-solid`.

**Full page (`e2e/app.spec.ts`):** the scan opens the dialog, the menu and the combobox in
turn, in both themes, in Norwegian, and at 320 px. Document-level rules, focus trap inside
the dialog, scroll lock, and that the header pickers still work with a popover open.

**Guards (`tests/`):** a test greps `src/` for Tailwind palette classes (`-(red|blue|…)-\d+`)
and for `.dark` and fails on a hit; another asserts `index.html` has no stylesheet `<link>`.

## 12. Structure

```
libraries/design-system/
├── tokens/tailwind.css        # new: @theme inline bridge, palette reset, dark variant
├── README.md                  # "Tailwind and shadcn" section
├── CHANGELOG.md               # 3.9.0
└── VERSION                    # 3.9.0

scaffolds/web-react-ts/
├── components.json            # base-nova, lucide, @/ aliases, css: src/styles/index.css
├── src/styles/index.css       # the cascade (§ 6); replaces the seven <link> tags
├── src/styles/main.css        # unchanged role: project styles, unlayered
├── src/lib/utils.ts           # export { cn } from "cn"; nothing else lives in lib/
├── src/components/ui/         # button, dialog, dropdown-menu, popover, combobox
├── src/components/            # ResetDialog, ExampleMenu, CurrencyCombobox examples
├── tests/components/          # one test per ui component + the guards
├── e2e/app.spec.ts            # opens each example
├── biome.json                 # tailwindDirectives
├── tsconfig.json, vite.config.ts  # @/ alias, tailwindcss() plugin
└── README.md                  # "shadcn" section: add discipline, house edits, when to use which button
```

web-vite receives `tokens/tailwind.css` through extract and never imports it. A line in its
README says so.

## 13. Consumer migration

| Project | What changes | When |
|---|---|---|
| Varde (React) | Re-extract DS 3.9.0; add the cascade entry, `components.json` and the alias; take `dialog` first (it has a confirm flow today in DS `.modal`), then whatever the next feature needs | Next Varde UI session, after this scaffold ships |
| Wend (ASP.NET MVC views), Hugin (vanilla) | Nothing. DS sync as usual; the bridge file rides along unused | Their own sessions |
| Rookdex (Astro) | Nothing. Astro islands could take shadcn later; not before the 1 November freeze | Not planned |
| Ignite, Spindle | Nothing until they are React | Not planned |

## 14. Acceptance

Each phase is its own PR off `main` and is done when its checks pass.

**Phase 1: DS 3.9.0**
- `tokens/tailwind.css` exists, every `var()` resolves, `tokens/index.css` does not import
  it, the DS test suite is green including the new test, README and CHANGELOG updated.
- Both web scaffolds re-extracted; `scaffold-sync.test.mjs` green.

**Phase 2: the scaffold (workbench v2.21.0)**
- `npm run build`, `npm test`, `npm run test:e2e`, `npm run check` all green on a fresh copy
  of the scaffold after `npm install` and the Playwright shell install.
- Measured: every shadcn control ≥ 44 px, `rounded-md` 8 px, `.btn mt-4` margin 16 px,
  hugin palette colours the `Button`, 320 px layout holds with each example open.
- axe: no violations in any component test or in the full-page scan, both themes.
- Keyboard walk by me, NVDA pass by me on the three examples, findings as PR comments.
- README sections written; `index.html` has no stylesheet links; the telemetry grep result
  is in the PR body.

**Phase 3: the Workbench registry (later, its own spec note)**
- A `registry.json` under `docs/r/` built with `npx shadcn build` and served from Pages, so a
  project runs `npx shadcn add @workbench/dialog` and gets the house-edited file. Stable per
  shadcn's docs; worth it once Varde has consumed the scaffold version and I know the edits
  hold.

## 15. Accepted trade-offs

- **Two button systems in one scaffold.** `.btn` for project UI, `Button` inside and beside
  shadcn components. The README says which to use when; a page never carries both for the
  same job. Merging them means restyling `Button` to the DS pixel for pixel, which is the
  "replace the DS" work I rejected.
- **Spacing scales diverge above step 4.** Generated files use Tailwind numbers; nobody
  converts. The visible effect is a few pixels inside menus, which the 44 px rule governs
  anyway.
- **House edits are re-applied by hand on a re-add.** The comment block at the top of each
  file is the checklist. Phase 3 turns the edited files into the registry source and removes
  the step.
- **`cn` is pre-1.0.** Pinned exact; `npm update` will not move it. If it breaks, the file is
  one line to point at `clsx`.
- **Biome does not sort class strings yet.** Unsorted strings are a readability cost, not a
  correctness one. Revisit at Biome 2.6.
- **Lucide and the DS icon set coexist.** Both are 24-grid stroke icons; the difference is
  invisible at 16 px. Project code uses the DS set.
- **No Tailwind preflight means a generated component may assume a reset the DS does not
  do.** The component tests render with the DS stylesheet and would show it; the fix is a
  utility on the element, never a global rule.

## 16. Open questions

- **Does `shadcn eject` block a later `add`?** The changelog says it inlines the CSS and
  drops the package; it does not say what `add` does afterwards. Phase 2 tests it on the
  fresh copy. If `add` refuses, keep `shadcn` as a dependency and record that here.
- **Does `@tailwindcss/vite` run inside Vitest browser mode?** Everything says yes (browser
  mode runs on the Vite dev server, plugins included); no official line confirms it. The
  first component test answers it.
- **`--destructive-foreground`.** Absent from shadcn's default theme, still referenced by
  some generated files. The bridge defines it; if no shipped component uses it after phase
  2, drop it.
