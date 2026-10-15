# Layout by Construction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make UI built from my design system line up at every width, text size and locale by construction, and fail CI with measured numbers when it does not.

**Architecture:** Design system 3.10.0 adds layout primitives that decide per group, never per item (`.control-row`, `.switcher`, `.row-list`, `.card-grid` + `.card`), a `--control-height` token, intrinsic collapse rules and text rules. A new library, `libraries/layout-audit` v1, holds one dependency-free in-page function (`auditLayout`) that checks each primitive's contract, plus thin Playwright and Puppeteer adapters that run it over a width, text-size and locale matrix. The three scaffolds consume both, and the WPF scaffold gets the same idea in XAML (`Align.Contract` plus a `LayoutAudit` STA test). A loadout standard tells Claude to run the audit before showing me UI.

**Tech Stack:** CSS (flex, grid, subgrid, container queries), vanilla JS (classic script for the audit, ES modules for adapters), Playwright `@playwright/test` ^1.63.0, Puppeteer 25 (already in web-vite through pa11y-ci), `node:test`, React 19 + TypeScript 7, WPF on .NET 10 with xUnit 2.9.3, PowerShell + Pester for loadout.

**Spec:** `C:\Users\Nugget\Documents\Development\GitHub\repos\loadout\docs\superpowers\specs\2026-10-15-layout-by-construction-design.md` (merged in loadout PR #15, [on GitHub](https://github.com/malinfossum/loadout/blob/main/docs/superpowers/specs/2026-10-15-layout-by-construction-design.md)). Read it before Task 1. Part 1 is the primitive table, Part 2 the checker, Part 3 WPF, Part 4 the rollout.

## Global Constraints

- **Branches and PRs.** Tasks 1 to 9 on `feat/layout-by-construction`, cut from current `main` after this plan merges (PR A: design system 3.10.0 and layout-audit v1). Tasks 10 to 12 on `feat/layout-scaffolds`, cut from `feat/layout-by-construction` (PR B, stacked on PR A; GitHub retargets it to `main` when PR A merges and its branch is deleted). Task 13 in loadout (PR C). Task 14 is the release and runs only on my go.
- **Stacked branch hygiene.** Any commit added to `feat/layout-by-construction` after Task 10 starts (review fixes on PR A) is merged into `feat/layout-scaffolds` before the next scaffold task, so PR B never tests against a stale design system.
- **Telemetry stays off.** Playwright, Puppeteer, Vite and the Node test runner send none. `dotnet` does unless opted out: before Task 12, confirm `DOTNET_CLI_TELEMETRY_OPTOUT=1` is set (`echo $DOTNET_CLI_TELEMETRY_OPTOUT`) and set it if not.
- **Merging, tags and Releases are mine.** Push branches and open PRs freely; never merge, tag or cut a Release without my explicit yes in chat.
- **Commits:** plain imperative messages, author `malinfossum.dev@proton.me`, no `Co-Authored-By`, no AI attribution of any kind.
- **No em dashes** in anything written: CSS and JS comments, C# comments, Markdown, commit messages, PR text. Rewrite the sentence instead. Two existing formats keep their dash: the version header extract generates, and the CHANGELOG heading separator that `tools/design-system.test.mjs` matches. Copy those from the file, never type new ones.)
- **Voice:** READMEs, comments and the loadout standard read as if I wrote them, first person where a person speaks.
- **Version floors:** design system `3.10.0` (from 3.9.1), `libraries/layout-audit` `1.0.0` (new), workbench release `v2.22.0` (from v2.21.0).
- **Tolerance and floor, verbatim from the spec:** every contract is checked "with a 1 px tolerance"; controls inside a primitive are "at least 44 px tall"; `--control-height` is `2.75rem` (44 px); WPF `ControlHeight` is `44`.
- **Matrix, verbatim from the spec:** widths `320, 375, 768, 1024, 1280, 1920`; text at `100 %` and `200 %` (`html { font-size: 200% }`); every shipped locale; the WCAG 1.4.12 override (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em) at `320` and `1280` only; themes are not in the matrix.
- **No `order`, `row-reverse` or `column-reverse`** in any primitive (WCAG 1.3.2, 2.4.3).
- **No `max-width` media queries** in shipped design system CSS after Task 4. Mobile-first: intrinsic sizing first, then container queries, then `min-width` viewport breakpoints.
- **Credit:** the primitives follow ideas from Every Layout (every-layout.dev). Credit the book by title and URL in a comment, written as my own CSS, never copied verbatim, no author names.
- **Test-only code never ships:** `audit.js` and the adapters live under each scaffold's test folder and are injected by the runner. A bundle test greps production output for `auditLayout`.
- **Data:** audits and fixtures use made-up data only. No real accounts, names or numbers beyond public emergency and helpline numbers.
- **Design system edits happen in `libraries/design-system` only**, never in a scaffold's `design-system/` copy. Scaffold copies change only through `node tools/extract.mjs`.
- **Mid-branch red test, expected:** from Task 1 until Task 9 re-extracts, `tools/scaffold-sync.test.mjs` reports the design system as drifted (same version string, changed content). Run the root suite in those tasks as `node --test --test-skip-pattern="bundles the current design-system" "tools/*.test.mjs"`. Every other root test stays green after every task.
- **Root suite command** (from the workbench root): `node --test "tools/*.test.mjs"`, then `node tools/check-links.mjs`.
- **New dependency (needs my yes when I approve this plan):** `@playwright/test` ^1.63.0 as a devDependency of `libraries/layout-audit/package.json`, for the self-test only. Nothing else is installed. web-vite reuses the Puppeteer it already has through pa11y-ci.
- **Analyzer rule (WPF):** `TreatWarningsAsErrors` is on. If an analyzer fires on new C#, change the code; never add a suppression.
- **Out of scope:** Varde, Hugin, Rookdex and Wend adoption; Tidsro and Spindle; Ward changes; screenshot regression gates; a lint rule against Tailwind control rows.

## Review Focus

1. **A card that lacks a slot** (no badges, so an empty element holds its place). Expected: body and actions still line up across the row, and the audit does not report a false slot mismatch. The slot check counts children by `checkVisibility()`, not by size, because an empty element still takes its grid track. Pinned by `#cards-good` in `fixtures/good.html` (Task 6) and the full matrix in Task 7.
2. **Hidden content inside a primitive** (a closed picker `<details>`, a visually hidden file input, a `hidden` button). Expected: skipped, never reported. Pinned by `#row-picker` and `#row-file` in `fixtures/good.html` (Task 6).
3. **Nested primitives** (a `.control-row` inside a `.card` inside a `.card-grid`). Expected: each contract is checked once, and a short control is reported once, not once per ancestor. Pinned by `#bad-nested` in `fixtures/bad.html` (Task 6, asserts exactly one `control-floor` hit).
4. **A page that renders nothing checkable** (an error page, a route that renders late, a locale cell that rendered the wrong language, a primitive that collapsed to zero width). Expected: the cell fails loudly instead of passing green over nothing. Pinned by `adapter.spec.js` (Task 7: 404, no primitives, wrong `lang`) and `#bad-collapsed` (Task 6).
5. **A typo** in a `data-align` value or a known-list selector. Expected: a failure that names the typo, never a silent skip. Pinned by `#bad-typo` (Task 6) and the invalid-selector and stale-entry tests (Task 7).

---

## File map

**Design system (`libraries/design-system/`)**
- Create `primitives/control-row.css`, `primitives/switcher.css`, `primitives/row-list.css`, `primitives/card-grid.css`
- Modify `primitives/index.css`, `primitives/grid.css`, `primitives/split.css`, `primitives/sidebar.css`
- Modify `tokens/spacing.css` (`--control-height`, rem terms in clamps), `tokens/typography.css` (`--weight-label`, rem terms in clamps)
- Modify `components/button.css`, `components/input.css`, `components/tabs.css`, `components/picker.css` (token as `min-block-size`)
- Modify `compositions/dashboard.css`, `compositions/hero.css` (bare rem minimums, clamp)
- Modify `base/base.css` (text-wrap, heading wrap, `dt`/`dd` and `[data-align="label"]`)
- Modify `gallery/sections.js`, `README.md`, `CHANGELOG.md`, `VERSION`

**Layout audit (`libraries/layout-audit/`, new)**
- `audit.js` (in-page check, classic script), `shared.js` (matrix and verdict), `playwright.js` + `playwright.d.ts`, `puppeteer.js`
- `fixtures/good.html`, `fixtures/bad.html`, `fixtures/empty.html`
- `selftest/serve.mjs`, `selftest/audit.spec.js`, `selftest/adapter.spec.js`, `selftest/good.spec.js`
- `package.json`, `package-lock.json`, `playwright.config.js`, `.gitignore`, `extract.json`, `VERSION`, `README.md`

**Workbench tools and CI**
- Create `tools/design-system-layout.test.mjs`, `tools/layout-audit.test.mjs`, `tools/csharp-wpf.test.mjs`
- Modify `tools/design-system.test.mjs` (floor tests read the token; VERSION test), `tools/scaffold-sync.test.mjs` (sub-folder targets)
- Modify `.github/workflows/ci.yml` (self-test job), `.github/dependabot.yml` (npm entry), `README.md` (structure and extract rows)

**Scaffolds**
- web-react-ts: `src/components/layout.tsx`, `src/components/Counter.tsx`, `e2e/layout.spec.ts`, `e2e/layout-audit/` (extracted), `tests/components/layout.test.tsx`, `tests/bundle.test.ts`, `biome.json`, `README.md`
- web-vite: `src/view/view.js`, `tests/e2e/layout.test.js`, `tests/e2e/layout-audit/` (extracted), `tests/bundle.test.js`, `biome.json`, `.gitignore`, `README.md`
- csharp-wpf: `MyApp/Layout/Align.cs`, `MyApp/MainWindow.xaml`, `MyApp/Resources/tokens.xaml`, `MyApp.Tests/Layout/WpfThread.cs`, `MyApp.Tests/Layout/WpfGroup.cs`, `MyApp.Tests/Layout/LayoutHost.cs`, `MyApp.Tests/Layout/LayoutAudit.cs`, `MyApp.Tests/MainWindowLayoutTests.cs`, `README.md`

**Loadout (separate repo, separate worktree)**
- Create `standards/layout.md`; modify `CLAUDE.md`, `lib/Loadout.psm1`, `tests/Manifest.Tests.ps1`, `skills/write-code/SKILL.md`, `skills/review-code/SKILL.md`, `skills/mobile-first-css/SKILL.md`, `skills/mobile-first-css/references/breakpoints.md`, `skills/design-system-sync/references/ds-map.md`

---

## PR A: design system 3.10.0 and layout-audit v1

### Task 1: `--control-height` token as every control's floor

About 20 minutes.

**Files:**
- Create: `tools/design-system-layout.test.mjs`
- Modify: `libraries/design-system/tokens/spacing.css`, `components/button.css:8` and `:74-77`, `components/input.css:5` and `:22`, `components/tabs.css:12`, `components/picker.css:60`
- Modify: `tools/design-system.test.mjs:102-125` (floor test) and `:596-597` (picker floor)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom property `--control-height` (declared in `tokens/spacing.css`), used by every later primitive and by the audit's 44 px floor. Test helpers `read(path)` and `shippedCss()` in `tools/design-system-layout.test.mjs`, reused by Tasks 2 to 5.

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b feat/layout-by-construction
```

- [ ] **Step 2: Write the failing test file**

Create `tools/design-system-layout.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Static tests for the layout layer of the design system (3.10.0). They pin the
// mechanism; the fixtures in libraries/layout-audit prove the behaviour in a browser.
const DS = join(import.meta.dirname, "..", "libraries", "design-system");
// Normalize CRLF so content assertions hold on Windows checkouts (core.autocrlf).
const read = (p) => readFileSync(join(DS, p), "utf8").replaceAll("\r\n", "\n");
const SHIPPED = ["tokens", "base", "primitives", "components", "compositions", "utilities", "theme"];

// Every shipped CSS file as [relative path, text with comments removed].
function shippedCss() {
	const out = [];
	const walk = (dir) => {
		for (const entry of readdirSync(join(DS, dir), { withFileTypes: true })) {
			const rel = `${dir}/${entry.name}`;
			if (entry.isDirectory()) walk(rel);
			else if (rel.endsWith(".css")) out.push([rel, read(rel).replace(/\/\*[\s\S]*?\*\//g, "")]);
		}
	};
	for (const dir of SHIPPED) walk(dir);
	return out;
}

test("--control-height is declared once, at least 2.75rem (44 px)", () => {
	const value = read("tokens/spacing.css").match(/--control-height:\s*([\d.]+)rem;/)?.[1];
	assert.ok(value, "tokens/spacing.css must declare --control-height in rem");
	assert.ok(Number(value) >= 2.75, `--control-height is ${value}rem, under the 2.75rem (44 px) floor`);
});

test("every control takes its floor from --control-height as min-block-size, never a literal", () => {
	for (const file of ["components/button.css", "components/input.css", "components/tabs.css", "components/picker.css"]) {
		const css = read(file);
		assert.match(css, /min-block-size: var\(--control-height\);/, `${file} must use min-block-size: var(--control-height)`);
		assert.doesNotMatch(css, /min-height:\s*2\.75rem/, `${file} still carries the literal 2.75rem`);
	}
	// An icon button has no label to stretch it, so its width is its whole hit area.
	assert.match(read("components/button.css"), /\.icon-btn \{\s*inline-size: var\(--control-height\);/);
});

export { read, shippedCss };
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test tools/design-system-layout.test.mjs`
Expected: FAIL, "tokens/spacing.css must declare --control-height in rem".

- [ ] **Step 4: Add the token**

In `libraries/design-system/tokens/spacing.css`, after `--reading-width` (line 15), add:

```css
	/* One floor for every control: buttons, fields, tabs, picker rows. A min-block-size,
	   so a control grows with zoomed text but never drops under 44 px (WCAG 2.5.5, the
	   house standard; 2.5.8 AA only asks for 24 px). */
	--control-height: 2.75rem;
```

- [ ] **Step 5: Use it in the four component files**

- `components/button.css:8` in `.btn`: `min-height: 2.75rem;` becomes `min-block-size: var(--control-height);`
- `components/button.css:74-77`: `.icon-btn { width: 2.75rem; padding: 0; }` becomes `.icon-btn { inline-size: var(--control-height); padding: 0; }`
- `components/input.css:5`: `min-height: 2.75rem;` becomes `min-block-size: var(--control-height);`. In the comment on lines 6 to 8, change "min-height alone sizes" to "min-block-size alone sizes".
- `components/input.css:22` (`.textarea`): `min-height: 8rem;` becomes `min-block-size: 8rem;` so the textarea overrides the shared rule with the same property.
- `components/tabs.css:12` and `components/picker.css:60`: `min-height: 2.75rem;` becomes `min-block-size: var(--control-height);`

Leave `components/skeleton.css:17` alone: `.skeleton-circle` is an avatar placeholder, not a control.

- [ ] **Step 6: Point the two existing floor tests at the token**

In `tools/design-system.test.mjs`, replace the body of the test at line 102 (keep its name and its history comment) with:

```js
	const FLOOR_REM = 2.75;
	const token = Number(read("tokens/spacing.css").match(/--control-height:\s*([\d.]+)rem;/)?.[1]);
	assert.ok(token >= FLOOR_REM, `--control-height is ${token}rem, under the ${FLOOR_REM}rem floor`);
	for (const file of ["components/button.css", "components/input.css", "components/tabs.css"]) {
		assert.match(read(file), /min-block-size: var\(--control-height\);/, `${file}: the control lost its floor`);
	}
	assert.match(read("components/button.css"), /\.icon-btn \{\s*inline-size: var\(--control-height\);/, ".icon-btn lost its floor");
```

In the picker test, replace lines 596 and 597 with:

```js
	assert.match(row, /min-block-size: var\(--control-height\);/, ".picker-row must take the 44px floor from --control-height");
```

and delete the now unused `const FLOOR_REM = 2.75;` at the top of that test.

- [ ] **Step 7: Run the tests**

Run: `node --test tools/design-system-layout.test.mjs tools/design-system.test.mjs`
Expected: PASS, every test.
Then the root suite with the skip pattern from Global Constraints. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add libraries/design-system tools/design-system-layout.test.mjs tools/design-system.test.mjs
git commit -m "Give every control its floor from one --control-height token"
```

### Task 2: `.control-row` and `.switcher`

About 25 minutes.

**Files:**
- Create: `libraries/design-system/primitives/control-row.css`, `primitives/switcher.css`
- Modify: `libraries/design-system/primitives/index.css`
- Test: `tools/design-system-layout.test.mjs`

**Interfaces:**
- Consumes: `read` from Task 1's test file.
- Produces: classes `.control-row` and `.switcher`; custom property `--switcher-threshold` (default `30rem`). The audit (Task 6) reads `.control-row` as contract `control-row` and `.switcher` as `switcher`.

- [ ] **Step 1: Write the failing tests**

Append to `tools/design-system-layout.test.mjs` (above the `export` line):

```js
test(".control-row stretches every item on a line to one height", () => {
	const css = read("primitives/control-row.css");
	const row = css.match(/\.control-row \{([^}]*)\}/)?.[1];
	assert.ok(row, "control-row.css must define .control-row");
	for (const decl of ["display: flex;", "flex-wrap: wrap;", "align-items: stretch;"]) assert.ok(row.includes(decl), `.control-row needs ${decl}`);
	assert.match(css, /\.control-row > \* \{[^}]*min-inline-size: 0;[^}]*overflow-wrap: anywhere;/s);
	assert.match(css, /\.control-row > :is\(\.input, \.select\) \{[^}]*flex: 1 1 12rem;[^}]*inline-size: auto;/s);
});

test(".switcher puts all items side by side or all stacked, flipping at --switcher-threshold", () => {
	const css = read("primitives/switcher.css");
	assert.match(css, /\.switcher \{[^}]*--switcher-threshold: [\d.]+rem;[^}]*display: flex;[^}]*flex-wrap: wrap;/s);
	assert.match(css, /\.switcher > \* \{[^}]*flex-grow: 1;[^}]*flex-basis: calc\(\(var\(--switcher-threshold\) - 100%\) \* 999\);/s);
	assert.match(css, /\.switcher > \* \{[^}]*min-inline-size: 0;[^}]*overflow-wrap: anywhere;/s);
});

test("primitives/index.css imports control-row and switcher", () => {
	const index = read("primitives/index.css");
	for (const name of ["control-row", "switcher"]) assert.match(index, new RegExp(`@import "\\./${name}\\.css";`));
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test tools/design-system-layout.test.mjs`
Expected: FAIL with ENOENT for `primitives/control-row.css`.

- [ ] **Step 3: Write `primitives/control-row.css`**

```css
/* .control-row: controls side by side that decide their height as a group.
   align-items: stretch makes every item on a line as tall as the tallest, so when
   one label wraps its neighbours grow with it and the bottoms stay on one edge.
   Contract (layout-audit "control-row"): per visual row, one height and one
   bottom edge; every control at least --control-height. */
.control-row {
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	gap: var(--space-2);
}
.control-row > * {
	min-inline-size: 0;
	overflow-wrap: anywhere;
}
/* Fields are width: 100% on their own; in a row they share the line instead. */
.control-row > :is(.input, .select) {
	flex: 1 1 12rem;
	inline-size: auto;
}
```

- [ ] **Step 4: Write `primitives/switcher.css`**

```css
/* .switcher: items sit side by side until the container is narrower than
   --switcher-threshold, then all of them stack at once. The flex-basis is hugely
   positive under the threshold (each item takes a whole line) and negative above
   it (clamped to 0, so all share one line). No item ever decides alone.
   The idea comes from Every Layout (every-layout.dev), written here for this system.
   Contract (layout-audit "switcher"): all items in one row, or all in one column. */
.switcher {
	--switcher-threshold: 30rem;
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-3);
}
.switcher > * {
	flex-grow: 1;
	flex-basis: calc((var(--switcher-threshold) - 100%) * 999);
	min-inline-size: 0;
	overflow-wrap: anywhere;
}
```

- [ ] **Step 5: Import them**

Append to `primitives/index.css`:

```css
@import "./control-row.css";
@import "./switcher.css";
```

- [ ] **Step 6: Run the tests**

Run: `node --test tools/design-system-layout.test.mjs tools/design-system.test.mjs`
Expected: PASS. Root suite with the skip pattern: PASS.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/primitives tools/design-system-layout.test.mjs
git commit -m "Add .control-row and .switcher primitives"
```

### Task 3: `.row-list` and `.card-grid` with subgrid slots

About 30 minutes.

**Files:**
- Create: `libraries/design-system/primitives/row-list.css`, `primitives/card-grid.css`
- Modify: `libraries/design-system/primitives/index.css`
- Test: `tools/design-system-layout.test.mjs`

**Interfaces:**
- Consumes: `read` from Task 1.
- Produces: `.row-list` (each child is a row: first child the content, last child the actions); `.card-grid` with `.card` children; custom properties `--card-min` (default `18rem`, on `.card-grid`) and `--card-slots` (default `4`, on `.card`). The audit reads `.row-list` as `row-list` and `.card-grid` as `card-grid`.

- [ ] **Step 1: Write the failing tests**

Append to `tools/design-system-layout.test.mjs`:

```js
test(".row-list: one shared grid, one container query decides beside or below for every row", () => {
	const css = read("primitives/row-list.css");
	assert.match(css, /\.row-list \{[^}]*container-type: inline-size;[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/s);
	assert.match(css, /\.row-list > \* \{[^}]*grid-column: 1 \/ -1;[^}]*display: grid;/s);
	assert.match(css, /@container \(min-width: [\d.]+rem\) \{\s*\.row-list > \* \{[^}]*grid-template-columns: subgrid;/s);
	assert.match(css, /\.row-list > \* > \* \{[^}]*min-inline-size: 0;[^}]*overflow-wrap: anywhere;/s);
});

test(".card-grid: auto-fit columns that never overflow, cards take --card-slots rows as a subgrid", () => {
	const css = read("primitives/card-grid.css");
	assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, var\(--card-min\)\), 1fr\)\);/);
	assert.match(css, /\.card-grid > \.card \{[^}]*--card-slots: 4;[^}]*display: grid;[^}]*grid-row: span var\(--card-slots\);[^}]*grid-template-rows: subgrid;/s);
	assert.match(css, /\.card-grid > \.card > \* \{[^}]*min-inline-size: 0;[^}]*overflow-wrap: anywhere;/s);
	assert.doesNotMatch(read("components/card.css"), /subgrid/, "a standalone .card keeps its own layout; only .card-grid > .card is a subgrid");
});

test("primitives/index.css imports row-list and card-grid", () => {
	const index = read("primitives/index.css");
	for (const name of ["row-list", "card-grid"]) assert.match(index, new RegExp(`@import "\\./${name}\\.css";`));
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test tools/design-system-layout.test.mjs`
Expected: FAIL with ENOENT for `primitives/row-list.css`.

- [ ] **Step 3: Write `primitives/row-list.css`**

```css
/* .row-list: a list whose rows share one grid, so every row's actions sit in one
   column with one left edge. The list is the container: one container query
   decides beside or below for every row together, never row by row.
   Markup: each child is a row with two children, the content first and the
   actions last (wrap several actions in one element). The list must be block-level: container-type sizes it from its parent,
   so as a flex item that sizes to content it collapses to zero width.
   Contract (layout-audit "row-list"): one arrangement for all rows, one action edge. */
.row-list {
	container-type: inline-size;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: var(--space-3) var(--space-4);
	margin: 0;
	padding: 0;
	list-style: none;
}
.row-list > * {
	grid-column: 1 / -1;
	display: grid;
	gap: var(--space-2);
}
.row-list > * > * {
	min-inline-size: 0;
	overflow-wrap: anywhere;
}
@container (min-width: 32rem) {
	.row-list > * {
		grid-template-columns: subgrid;
		align-items: center;
	}
}
```

- [ ] **Step 4: Write `primitives/card-grid.css`**

```css
/* .card-grid + .card: cards in a responsive grid whose parts line up across a row.
   Each card spans --card-slots rows of the grid and takes them as its own
   (subgrid), so title, badges, body and actions are fixed slots, and slot k of
   every card on one visual row shares one top edge. A card that lacks a part keeps
   an empty element in its place, so later slots stay in their track.
   A .card outside .card-grid is unchanged.
   Contract (layout-audit "card-grid"): slot k on one row of cards, one top edge. */
.card-grid {
	--card-min: 18rem;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr));
	gap: var(--space-5);
}
.card-grid > .card {
	--card-slots: 4;
	display: grid;
	grid-row: span var(--card-slots);
	grid-template-rows: subgrid;
	gap: var(--space-3);
	align-content: start;
}
.card-grid > .card > * {
	min-inline-size: 0;
	overflow-wrap: anywhere;
}
```

- [ ] **Step 5: Import them**

Append to `primitives/index.css`:

```css
@import "./row-list.css";
@import "./card-grid.css";
```

- [ ] **Step 6: Run the tests**

Run: `node --test tools/design-system-layout.test.mjs tools/design-system.test.mjs`
Expected: PASS. Root suite with the skip pattern: PASS.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/primitives tools/design-system-layout.test.mjs
git commit -m "Add .row-list and .card-grid primitives with subgrid alignment"
```

### Task 4: Collapse fixes, and no `max-width`, `order` or reverse

About 30 minutes. These change where existing layouts collapse; adoption previews (Part 4 of the spec) show the move per project before anything syncs.

**Files:**
- Modify: `libraries/design-system/primitives/grid.css`, `primitives/split.css`, `primitives/sidebar.css`, `compositions/dashboard.css:1` and `:6`
- Test: `tools/design-system-layout.test.mjs`

**Interfaces:**
- Consumes: `shippedCss` from Task 1.
- Produces: `.grid` gains custom property `--grid-gap` (default `var(--space-5)`). `.grid-2`, `.grid-3`, `.grid-auto`, `.split` and `.sidebar-layout` keep their class names and DOM contracts (`.sidebar-layout`: sidebar first, content last; `.split`: main first, aside last).

New collapse points at 100 % text, for the PR description: `.grid-2` goes to one column under about 600 px of container (was a 768 px viewport); `.grid-3` steps 3, 2, 1 at about 720 and 472 px (was 3 to 1 at 768); `.split` stacks under about 736 px (was 896); `.sidebar-layout` stacks under about 720 px (was 992). All of them are now measured on the container, so they also hold inside a sidebar and at 200 % text.

- [ ] **Step 1: Write the failing tests**

Append to `tools/design-system-layout.test.mjs`:

```js
test("no max-width media query in shipped CSS: layouts collapse by their own size", () => {
	const offenders = [];
	for (const [file, css] of shippedCss()) for (const m of css.matchAll(/@media[^{]*max-width[^{]*/g)) offenders.push(`${file}: ${m[0].trim()}`);
	assert.deepEqual(offenders, []);
});

test("no grid column has a bare rem minimum: 16rem is 512 px at 200 % text, wider than a 320 px screen", () => {
	const offenders = [];
	for (const [file, css] of shippedCss()) for (const m of css.matchAll(/minmax\(\s*([\d.]+rem)/g)) offenders.push(`${file}: minmax(${m[1]}, ...)`);
	assert.deepEqual(offenders, []);
});

test("no order, row-reverse or column-reverse: visual order is DOM and focus order (WCAG 1.3.2, 2.4.3)", () => {
	const offenders = [];
	for (const [file, css] of shippedCss()) {
		if (/(?<![\w-])order\s*:/.test(css)) offenders.push(`${file}: order`);
		if (/(row|column)-reverse/.test(css)) offenders.push(`${file}: reverse`);
	}
	assert.deepEqual(offenders, []);
});

test("grid-2 and grid-3 cap their column count with max(), sidebar and split wrap by content", () => {
	const grid = read("primitives/grid.css");
	assert.match(grid, /\.grid-2 \{\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, max\(18rem, \(100% - var\(--grid-gap, var\(--space-5\)\)\) \/ 2\)\), 1fr\)\);/);
	assert.match(grid, /\.grid-3 \{\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, max\(14rem, \(100% - 2 \* var\(--grid-gap, var\(--space-5\)\)\) \/ 3\)\), 1fr\)\);/);
	assert.match(read("primitives/sidebar.css"), /\.sidebar-layout > :last-child \{[^}]*flex: 999 1 0;[^}]*min-inline-size: 60%;/s);
	assert.match(read("primitives/split.css"), /\.split > :first-child \{[^}]*flex: 1\.2 1 0;[^}]*min-inline-size: min\(100%, 26rem\);/s);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test tools/design-system-layout.test.mjs`
Expected: FAIL. The max-width test lists `primitives/grid.css`, `primitives/sidebar.css` and `primitives/split.css`. The minmax test lists `grid.css` (16rem), `split.css` (18rem), `dashboard.css` (14rem, 12rem).

- [ ] **Step 3: Rewrite `primitives/grid.css`**

```css
/* Intrinsic columns: a column never gets narrower than its minimum, and the grid
   drops a column when the container cannot fit one more. No viewport media query,
   so the same grid works in a sidebar and at 200 % text.
   .grid-2 and .grid-3 cap the count with max(): the minimum column is at least a
   half (a third) of the row, so auto-fit never makes more columns than the name. */
.grid {
	--grid-gap: var(--space-5);
	display: grid;
	gap: var(--grid-gap);
}
.grid-2 {
	grid-template-columns: repeat(auto-fit, minmax(min(100%, max(18rem, (100% - var(--grid-gap, var(--space-5))) / 2)), 1fr));
}
.grid-3 {
	grid-template-columns: repeat(auto-fit, minmax(min(100%, max(14rem, (100% - 2 * var(--grid-gap, var(--space-5))) / 3)), 1fr));
}
.grid-auto {
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
}
```

- [ ] **Step 4: Rewrite `primitives/split.css`**

```css
/* .split: main content first, a narrower aside last. Both are flex items with a
   minimum; when the two minimums no longer fit side by side the aside wraps below,
   decided by the content box, not the viewport. Side by side they keep the old
   1.2 : 0.8 share. */
.split {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--space-6);
}
.split > :first-child {
	flex: 1.2 1 0;
	min-inline-size: min(100%, 26rem);
}
.split > :last-child {
	flex: 0.8 1 0;
	min-inline-size: min(100%, 18rem);
}
```

- [ ] **Step 5: Rewrite `primitives/sidebar.css`**

```css
/* .sidebar-layout: a 16rem sidebar first, content last. The content keeps at least
   60 % of the row; when it cannot, the sidebar wraps above it, in DOM order.
   The idea comes from Every Layout (every-layout.dev), written here for this system. */
.sidebar-layout {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--space-6);
}
.sidebar-layout > :first-child {
	flex: 1 1 16rem;
}
.sidebar-layout > :last-child {
	flex: 999 1 0;
	min-inline-size: 60%;
}
```

- [ ] **Step 6: Fix the two dashboard minimums**

In `compositions/dashboard.css`, `minmax(14rem, 1fr)` becomes `minmax(min(100%, 14rem), 1fr)` (line 1, `.dashboard-grid`) and `minmax(12rem, 1fr)` becomes `minmax(min(100%, 12rem), 1fr)` (line 6, `.kpi-row`). If the minmax test lists any other file, fix it the same way.

- [ ] **Step 7: Run the tests**

Run: `node --test tools/design-system-layout.test.mjs tools/design-system.test.mjs`
Expected: PASS. Root suite with the skip pattern: PASS.

- [ ] **Step 8: Commit**

```bash
git add libraries/design-system tools/design-system-layout.test.mjs
git commit -m "Collapse grids, split and sidebar by their own size, not the viewport"
```

### Task 5: Text rules and the label contract

About 25 minutes.

**Files:**
- Modify: `libraries/design-system/base/base.css:13-21` and `:35-38`, `tokens/typography.css:114` and `:123-125`, `tokens/spacing.css:12-13`, `compositions/hero.css:2`
- Test: `tools/design-system-layout.test.mjs`

**Interfaces:**
- Consumes: `read`, `shippedCss` from Task 1.
- Produces: token `--weight-label` (`600`); base styles for `dt`, `dd` and `[data-align="label"]`. The audit's `label` contract (Task 6) compares a label's computed weight, size and colour with its value's.

- [ ] **Step 1: Write the failing tests**

Append to `tools/design-system-layout.test.mjs`:

```js
test("every fluid clamp() has a rem term in its middle value, so it grows with text zoom (WCAG 1.4.4)", () => {
	const offenders = [];
	for (const [file, css] of shippedCss()) {
		for (const m of css.matchAll(/clamp\(([^,]+),([^,]+),/g)) {
			const middle = m[2].trim();
			if (/\d(vw|vh|vi|vb|vmin|vmax)\b/.test(middle) && !/\drem\b/.test(middle)) offenders.push(`${file}: clamp(${m[1].trim()}, ${middle}, ...)`);
		}
	}
	assert.deepEqual(offenders, []);
});

test("headings balance and break long words; body text wraps pretty", () => {
	const base = read("base/base.css");
	assert.match(base, /h1,\nh2,\nh3,\nh4 \{[^}]*text-wrap: balance;[^}]*overflow-wrap: break-word;/s);
	assert.match(base, /p,\nli,\ndd,\nblockquote,\nfigcaption \{[^}]*text-wrap: pretty;/s);
});

test("a label beside its value differs in weight and colour: dt over dd, [data-align=label]", () => {
	assert.match(read("tokens/typography.css"), /--weight-label: 600;/);
	const base = read("base/base.css");
	assert.match(base, /dt,\n\[data-align="label"\] \{[^}]*color: var\(--text\);[^}]*font-weight: var\(--weight-label\);/s);
	assert.match(base, /dd \{[^}]*color: var\(--text-muted\);/s);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test tools/design-system-layout.test.mjs`
Expected: FAIL. The clamp test lists the six clamps from `tokens/typography.css:123-125`, `tokens/spacing.css:12-13` and `compositions/hero.css:2` (and any palette that defines its own; fix those the same way).

- [ ] **Step 3: Give every clamp a rem term**

| File | Before | After |
|---|---|---|
| `tokens/typography.css:123` | `clamp(1.5rem, 2vw, 1.75rem)` | `clamp(1.5rem, 1.25rem + 1vw, 1.75rem)` |
| `tokens/typography.css:124` | `clamp(2rem, 4vw, 2.75rem)` | `clamp(2rem, 1.5rem + 2vw, 2.75rem)` |
| `tokens/typography.css:125` | `clamp(2.5rem, 5vw, 3.75rem)` | `clamp(2.5rem, 1.75rem + 3vw, 3.75rem)` |
| `tokens/spacing.css:12` | `clamp(3rem, 6vw, 5rem)` | `clamp(3rem, 2rem + 4vw, 5rem)` |
| `tokens/spacing.css:13` | `clamp(1rem, 2vw, 1.5rem)` | `clamp(1rem, 0.75rem + 1vw, 1.5rem)` |
| `compositions/hero.css:2` | `clamp(4rem, 8vw, 7rem)` | `clamp(4rem, 3rem + 4vw, 7rem)` |

- [ ] **Step 4: Add the label weight token**

In `tokens/typography.css`, after `--weight-display: 600;` (line 114):

```css
	--weight-label: 600;
```

- [ ] **Step 5: Add the text and label rules to `base/base.css`**

In the existing `h1, h2, h3, h4 {` rule (lines 13 to 21), add two declarations at the end:

```css
	text-wrap: balance;
	/* A long word in a big heading breaks instead of pushing the page sideways. */
	overflow-wrap: break-word;
```

Replace the `p, li {` rule (lines 35 to 38) with:

```css
p,
li,
dd,
blockquote,
figcaption {
	color: var(--text-muted);
	text-wrap: pretty;
}
/* A term beside its value reads as a label: stronger ink and weight than the
   value. Contract (layout-audit "label"): weight, size or colour differs. */
dt,
[data-align="label"] {
	color: var(--text);
	font-weight: var(--weight-label);
}
dd {
	color: var(--text-muted);
}
```

(`dd` was not muted before; it now matches `p` and `li`. `blockquote` and `figcaption` join the muted body set.)

- [ ] **Step 6: Run the tests**

Run: `node --test tools/design-system-layout.test.mjs tools/design-system.test.mjs`
Expected: PASS. Root suite with the skip pattern: PASS.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system tools/design-system-layout.test.mjs
git commit -m "Add text-wrap, zoom-aware clamps and the dt/dd label contract"
```

### Task 6: `audit.js` and its fixtures

About 60 minutes. The heart of the checker. A browser test runs it over known-good and known-bad fixtures.

**Files:**
- Create: `libraries/layout-audit/audit.js`
- Create: `libraries/layout-audit/fixtures/good.html`, `fixtures/bad.html`, `fixtures/empty.html`
- Create: `libraries/layout-audit/package.json`, `playwright.config.js`, `.gitignore`, `selftest/serve.mjs`, `selftest/audit.spec.js`
- Generated: `libraries/layout-audit/package-lock.json`

**Interfaces:**
- Consumes: the primitives from Tasks 2 to 5 (the fixtures load the real design system CSS).
- Produces, as globals once the script runs in a page:
  - `auditLayout(doc = document, { known = [], mark = false } = {})` returns `{ primitives: number, violations: Array<{ contract, selector, message, known: boolean }>, stale: KnownEntry[] }`.
  - `contract` is one of `"control-row" | "switcher" | "row-list" | "card-grid" | "label" | "control-floor" | "clipped-text" | "no-sideways-scroll" | "data-align"`.
  - `message` starts with `"<contract>: "`, then the element and the measured numbers.
  - `selector` is `#id` when the element has an id, otherwise a `tag:nth-child(n)` path up to the nearest ancestor with an id.
  - `KnownEntry` is `{ contract, selector, reason, paths?, widths?, textSizes?, locales?, spacing? }`. A violation is known when its contract matches and its element is inside `selector` (`closest()`). Entries that match nothing come back in `stale`. An invalid selector throws `known entry has an invalid selector: <selector>`.
  - `mark: true` sets `data-layout-violation="<contract>"` on each unknown violator and injects a red outline style (id `layout-audit-outline`). Outlines never change layout.
- Self-test server: `node selftest/serve.mjs` serves the workbench root on `http://127.0.0.1:4400`, so fixtures load `/libraries/design-system/...`.

- [ ] **Step 1: Install the self-test dependency**

```bash
mkdir -p libraries/layout-audit/fixtures libraries/layout-audit/selftest
cd libraries/layout-audit
```

Create `package.json`:

```json
{
	"name": "layout-audit-selftest",
	"private": true,
	"type": "module",
	"description": "Self-test for libraries/layout-audit. Not shipped: extract copies only the files in extract.json.",
	"scripts": {
		"test": "playwright test"
	},
	"devDependencies": {
		"@playwright/test": "^1.63.0"
	}
}
```

Create `.gitignore`:

```
node_modules/
test-results/
playwright-report/
```

Then:

```bash
npm install
npx playwright install --only-shell chromium
cd ../..
```

- [ ] **Step 2: Write the static server**

Create `libraries/layout-audit/selftest/serve.mjs`:

```js
/* Serves the workbench root read-only on 127.0.0.1:4400 so the fixtures load the
   real design system over HTTP (Chromium refuses fonts from file://). Test-only. */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".woff2": "font/woff2",
	".svg": "image/svg+xml",
};

createServer((request, response) => {
	let path;
	try {
		path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
	} catch {
		response.writeHead(400).end();
		return;
	}
	const file = normalize(join(ROOT, path));
	if (!file.startsWith(ROOT + sep)) {
		response.writeHead(403).end();
		return;
	}
	let isFile = false;
	try {
		isFile = statSync(file).isFile();
	} catch {}
	if (!isFile) {
		response.writeHead(404).end();
		return;
	}
	response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
	createReadStream(file).pipe(response);
}).listen(4400, "127.0.0.1");
```

- [ ] **Step 3: Write the Playwright config**

Create `libraries/layout-audit/playwright.config.js`:

```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "selftest",
	use: { baseURL: "http://127.0.0.1:4400", reducedMotion: "reduce", bypassCSP: true },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "node selftest/serve.mjs",
		url: "http://127.0.0.1:4400/libraries/layout-audit/fixtures/good.html",
		reuseExistingServer: !process.env.CI,
	},
});
```

- [ ] **Step 4: Write the fixtures**

All three pages share this `<head>` (change the `<title>` per page):

```html
<!doctype html>
<html lang="en" data-theme="dark">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>layout-audit fixtures: every contract kept</title>
		<link rel="stylesheet" href="/libraries/design-system/tokens/index.css" />
		<link rel="stylesheet" href="/libraries/design-system/base/reset.css" />
		<link rel="stylesheet" href="/libraries/design-system/base/base.css" />
		<link rel="stylesheet" href="/libraries/design-system/primitives/index.css" />
		<link rel="stylesheet" href="/libraries/design-system/components/index.css" />
	</head>
```

`fixtures/good.html` body (every contract kept, plus the size extremes: zero items, one item, long unbroken strings, Norwegian labels longer than English, hidden content, an empty card slot, nested primitives):

```html
	<body>
		<main class="container stack stack-lg section">
			<h1>Every contract kept</h1>

			<section class="stack" aria-labelledby="row-title">
				<h2 id="row-title">Control row</h2>
				<div class="control-row" id="row-good">
					<button class="btn" type="button">Ring 113</button>
					<button class="btn" type="button">Legevakt: ring 116 117 når det haster om natten</button>
					<a class="btn" href="#kart">Kart</a>
					<input class="input" type="search" aria-label="Søk" />
				</div>
				<div class="control-row" id="row-empty"></div>
				<div class="control-row" id="row-one"><button class="btn" type="button">Alene</button></div>
				<div class="control-row" id="row-file">
					<input class="file-input-hidden" type="file" id="upload" />
					<label class="btn file-input-label" for="upload">Last opp vedlegg</label>
					<button class="btn" type="button" hidden>Skjult</button>
				</div>
				<div class="control-row" id="row-picker">
					<details class="picker" data-picker="lang">
						<summary class="btn icon-btn">Aa<span class="sr-only">Språk</span></summary>
						<ul class="picker-list"><li><button class="picker-row" type="button">Norsk bokmål</button></li></ul>
					</details>
					<button class="btn" type="button">Lagre</button>
				</div>
				<div data-align="row" id="custom-row" style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 0.5rem">
					<button class="btn" type="button">Avbryt</button>
					<button class="btn btn-primary" type="button">Send inn skjemaet nå</button>
				</div>
			</section>

			<section class="stack" aria-labelledby="switch-title">
				<h2 id="switch-title">Switcher</h2>
				<div class="switcher" id="switch-good">
					<a class="btn" href="#a">Ring 113</a>
					<a class="btn" href="#b">Ring 112</a>
					<a class="btn" href="#c">Ring 110 brann</a>
				</div>
				<div class="switcher" id="switch-one"><a class="btn" href="#d">Ring 113</a></div>
			</section>

			<section class="stack" aria-labelledby="rows-title">
				<h2 id="rows-title">Row list</h2>
				<ul class="row-list" id="rows-good">
					<li><span>Mental helse hjelpetelefon</span><a class="btn" href="#e">Ring 116 123</a></li>
					<li><span>Kirkens SOS, døgnåpen samtaletjeneste for alle som trenger noen å snakke med</span><a class="btn" href="#f">Ring 22 40 00 40</a></li>
					<li><span>https://www.eksempel.no/en/veldig/lang/adresse/uten/mellomrom/som/må/brytes/i/stedet/for/å/flyte/over</span><a class="btn" href="#g">Åpne</a></li>
				</ul>
				<ul class="row-list" id="rows-empty"></ul>
			</section>

			<section class="stack" aria-labelledby="cards-title">
				<h2 id="cards-title">Card grid</h2>
				<div class="card-grid" id="cards-good">
					<article class="card">
						<h3>Legevakt</h3>
						<p class="cluster cluster-sm"><span class="badge">Døgnåpen</span></p>
						<p>Akutt hjelp når fastlegen er stengt.</p>
						<div class="control-row"><a class="btn" href="#h">Ring 116 117</a></div>
					</article>
					<article class="card">
						<h3>Barnevernsvakten i Oslo og omegn, akuttjeneste</h3>
						<div></div>
						<p>Sykehusapotekenesinformasjonstjenestekontaktpunkt svarer hele døgnet.</p>
						<div class="control-row"><a class="btn" href="#i">Ring 116 111</a><a class="btn" href="#j">Kart</a></div>
					</article>
					<article class="card">
						<h3>Fastlege</h3>
						<p class="cluster cluster-sm"><span class="badge">Hverdager</span><span class="badge">Timebestilling</span></p>
						<p>Ring kontoret ditt.</p>
						<div class="control-row"><a class="btn" href="#k">Ring</a></div>
					</article>
				</div>
				<div class="card-grid" id="cards-one">
					<article class="card"><h3>Ett kort</h3><div></div><p>Bare ett kort i rutenettet.</p><div></div></article>
				</div>
			</section>

			<section class="stack" aria-labelledby="labels-title">
				<h2 id="labels-title">Labels</h2>
				<dl class="stack stack-sm" id="labels-good">
					<div><dt>Åpent</dt><dd>Hele døgnet</dd></div>
					<div><dt>Telefon</dt><dd>116 117</dd></div>
				</dl>
				<p><span data-align="label">Sist oppdatert</span> <time datetime="2026-10-15">15. oktober 2026</time></p>
			</section>
		</main>
	</body>
</html>
```

`fixtures/bad.html` body (one broken example per contract; each carries the id the test asserts):

```html
	<body>
		<main class="container stack stack-lg section">
			<h1>Every contract broken once</h1>
			<div class="control-row" id="bad-row" style="align-items: flex-start">
				<button class="btn" type="button" style="max-inline-size: 8rem">Legevakt: ring 116 117 om natten</button>
				<button class="btn" type="button">Ring</button>
			</div>
			<div class="switcher" id="bad-switch">
				<a class="btn" href="#a" style="flex: 0 0 45%">En</a>
				<a class="btn" href="#b" style="flex: 0 0 45%">To</a>
				<a class="btn" href="#c" style="flex: 0 0 45%">Tre</a>
			</div>
			<ul data-align="rows" id="bad-rows" style="display: grid; gap: 0.75rem; list-style: none; padding: 0">
				<li style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center"><span>Kort</span><a class="btn" href="#d">Ring</a></li>
				<li style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center"><span style="inline-size: 100%">Et navn som tar hele raden</span><a class="btn" href="#e">Ring</a></li>
			</ul>
			<ul data-align="rows" id="bad-rows-left" style="display: grid; gap: 0.75rem; list-style: none; padding: 0">
				<li style="display: flex; gap: 0.5rem; align-items: center"><span>Kort</span><a class="btn" href="#f">Ring</a></li>
				<li style="display: flex; gap: 0.5rem; align-items: center"><span>Et lengre navn</span><a class="btn" href="#g">Ring</a></li>
			</ul>
			<div style="display: flex">
				<ul class="row-list" id="bad-collapsed"><li><span>Ingen bredde</span><a class="btn" href="#h">Ring</a></li></ul>
			</div>
			<div data-align="slots" id="bad-slots" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem">
				<article class="card stack"><h3>Barnevernsvakten i Oslo og omegn, akuttjeneste hele døgnet og alle helger</h3><p>Brødtekst.</p></article>
				<article class="card stack"><h3>Kort</h3><p>Brødtekst.</p></article>
			</div>
			<dl id="bad-label"><dt style="font: inherit; color: var(--text-muted)">Åpent</dt><dd>Hele døgnet</dd></dl>
			<p><span data-align="label" id="bad-label-orphan">Telefon</span></p>
			<div class="control-row" id="bad-floor">
				<button type="button" style="block-size: 2rem; min-block-size: 0">Liten</button>
				<button type="button" style="block-size: 2rem; min-block-size: 0">Også liten</button>
			</div>
			<div class="control-row" id="bad-clip">
				<span class="btn" style="inline-size: 6rem; overflow: hidden; white-space: nowrap">Et altfor langt navn på en knapp</span>
			</div>
			<div data-align="rwo" id="bad-typo"><button class="btn" type="button">Skrivefeil</button></div>
			<div class="card-grid" id="bad-slot-count">
				<article class="card" id="bad-slot-card"><h3>Fem deler</h3><p>To</p><p>Tre</p><p>Fire</p><p>Fem</p></article>
			</div>
			<div class="card-grid" id="bad-nested">
				<article class="card"><h3>Kort</h3><div></div><p>Tekst.</p><div class="control-row"><button id="bad-nested-button" type="button" style="block-size: 2rem; min-block-size: 0">Liten</button></div></article>
			</div>
			<div id="bad-wide" style="inline-size: 150vw">Bredere enn skjermen</div>
		</main>
	</body>
</html>
```

`fixtures/empty.html` body:

```html
	<body>
		<main class="container stack">
			<h1>Nothing to audit</h1>
			<p>This page has no primitives on purpose.</p>
		</main>
	</body>
</html>
```

- [ ] **Step 5: Write the failing browser test**

Create `libraries/layout-audit/selftest/audit.spec.js`:

```js
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const AUDIT = fileURLToPath(new URL("../audit.js", import.meta.url));
const FIXTURES = "/libraries/layout-audit/fixtures";

async function audit(page, path, width) {
	await page.setViewportSize({ width, height: 800 });
	await page.goto(`${FIXTURES}/${path}`);
	await page.evaluate(() => document.fonts.ready);
	await page.addScriptTag({ path: AUDIT });
	return page.evaluate(() => globalThis.auditLayout(document));
}

// [contract, exact selector of the reported element]
const BROKEN = [
	["control-row", "#bad-row"],
	["switcher", "#bad-switch"],
	["row-list", "#bad-rows"],
	["row-list", "#bad-rows-left"],
	["row-list", "#bad-collapsed"],
	["card-grid", "#bad-slots"],
	["card-grid", "#bad-slot-card"],
	["label", "#bad-label > dt:nth-child(1)"],
	["label", "#bad-label-orphan"],
	["control-floor", "#bad-floor > button:nth-child(1)"],
	["clipped-text", "#bad-clip > span:nth-child(1)"],
	["data-align", "#bad-typo"],
	["no-sideways-scroll", "#bad-wide"],
];

for (const width of [320, 1280]) {
	test(`bad fixtures: each broken contract is caught at ${width} px`, async ({ page }) => {
		const { violations } = await audit(page, "bad.html", width);
		for (const [contract, selector] of BROKEN) {
			const hit = violations.some((v) => v.contract === contract && v.selector === selector);
			expect(hit, `${contract} at ${selector}\nfound:\n${violations.map((v) => `${v.message} (${v.selector})`).join("\n")}`).toBe(true);
		}
	});

	test(`bad fixtures: a short control inside nested primitives is reported once at ${width} px`, async ({ page }) => {
		const { violations } = await audit(page, "bad.html", width);
		expect(violations.filter((v) => v.selector === "#bad-nested-button")).toHaveLength(1);
	});

	test(`good fixtures: no violations and every primitive counted at ${width} px`, async ({ page }) => {
		const { primitives, violations } = await audit(page, "good.html", width);
		expect(violations.map((v) => `${v.message} (${v.selector})`)).toEqual([]);
		expect(primitives).toBeGreaterThanOrEqual(15);
	});
}

test("a control-row message names the element and the measured numbers", async ({ page }) => {
	const { violations } = await audit(page, "bad.html", 320);
	const row = violations.find((v) => v.selector === "#bad-row");
	expect(row?.message).toMatch(/^control-row: ".+" [\d.]+ px vs [\d.]+ px, bottoms [\d.]+ px apart$/);
});

test("mark: true outlines each violator without moving anything", async ({ page }) => {
	await audit(page, "bad.html", 320);
	const before = await page.evaluate(() => document.querySelector("#bad-row").getBoundingClientRect().toJSON());
	await page.evaluate(() => globalThis.auditLayout(document, { mark: true }));
	const after = await page.evaluate(() => document.querySelector("#bad-row").getBoundingClientRect().toJSON());
	expect(after).toEqual(before);
	await expect(page.locator("#bad-row")).toHaveAttribute("data-layout-violation", "control-row");
	await expect(page.locator("#layout-audit-outline")).toHaveCount(1);
});
```

(`primitives` on the good page: 5 control rows (one of them `data-align`) plus 3 nested in cards, 2 switchers, 1 row list, 2 card grids and 3 labels, so 16. Empty containers are skipped and not counted; the test asserts at least 15 so one hidden fixture change does not need a recount.)

- [ ] **Step 6: Run it and watch it fail**

Run: `cd libraries/layout-audit && npx playwright test selftest/audit.spec.js`
Expected: FAIL, `page.addScriptTag` cannot read `audit.js` (ENOENT).

- [ ] **Step 7: Write `libraries/layout-audit/audit.js`**

```js
/* ======================================================================
   layout-audit: auditLayout(document, options)
   Checks the layout contracts of the design system primitives in a live page
   and returns what broke, with the measured numbers. A classic script on
   purpose: Playwright, Puppeteer and the browser pane all inject it as a
   <script>, so it assigns globals instead of exporting.
   Test-only. Each scaffold's bundle test fails if "auditLayout" reaches a
   production build.
   ====================================================================== */
(() => {
	const TOLERANCE = 1;
	const CONTROL_FLOOR = 44;
	const VISIBLE = { visibilityProperty: true, checkVisibilityCSS: true };
	const CLIPPING = new Set(["hidden", "clip"]);
	const CLASS_CONTRACTS = {
		"control-row": ".control-row",
		switcher: ".switcher",
		"row-list": ".row-list",
		"card-grid": ".card-grid",
	};
	const ALIGN_CONTRACTS = { row: "control-row", switch: "switcher", rows: "row-list", slots: "card-grid" };
	const GROUPS = ".control-row, .switcher, .row-list, .card-grid, [data-align]:not([data-align='label'])";
	const CONTROLS = [
		"button",
		"select",
		"textarea",
		"summary",
		"[role='button']",
		"input:not([type='checkbox'], [type='radio'], [type='hidden'], [type='range'])",
		".btn",
		".input",
		".select",
		".tab",
		".picker-row",
	].join(", ");

	const px = (n) => `${Math.round(n * 10) / 10} px`;
	const spread = (values) => Math.max(...values) - Math.min(...values);

	// Rendered and bigger than the 1 px box of the visually hidden pattern.
	function shown(el) {
		if (!el.checkVisibility(VISIBLE)) return false;
		const box = el.getBoundingClientRect();
		return box.width > TOLERANCE && box.height > TOLERANCE;
	}

	function labelOf(el) {
		const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
		if (text) return `"${text.length > 40 ? `${text.slice(0, 39)}…` : text}"`;
		return `<${el.localName}>`;
	}

	function selectorOf(el) {
		const parts = [];
		for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
			if (node.id) {
				parts.unshift(`#${CSS.escape(node.id)}`);
				break;
			}
			if (!node.parentElement) {
				parts.unshift(node.localName);
				break;
			}
			parts.unshift(`${node.localName}:nth-child(${[...node.parentElement.children].indexOf(node) + 1})`);
		}
		return parts.join(" > ");
	}

	function boxes(container) {
		return [...container.children].filter(shown).map((el) => ({ el, rect: el.getBoundingClientRect() }));
	}

	// Items whose vertical extents overlap share a visual line.
	function lines(items) {
		const result = [];
		for (const item of [...items].sort((a, b) => a.rect.top - b.rect.top)) {
			const line = result.find((l) => item.rect.top < l.bottom - TOLERANCE && item.rect.bottom > l.top + TOLERANCE);
			if (line) {
				line.items.push(item);
				line.bottom = Math.max(line.bottom, item.rect.bottom);
			} else {
				result.push({ top: item.rect.top, bottom: item.rect.bottom, items: [item] });
			}
		}
		return result;
	}

	function checkRow(container, add) {
		for (const line of lines(boxes(container))) {
			if (line.items.length < 2) continue;
			const heights = line.items.map((i) => i.rect.height);
			const bottoms = line.items.map((i) => i.rect.bottom);
			if (spread(heights) > TOLERANCE || spread(bottoms) > TOLERANCE) {
				const tallest = line.items.reduce((a, b) => (b.rect.height > a.rect.height ? b : a));
				add("control-row", container, `${labelOf(tallest.el)} ${px(Math.max(...heights))} vs ${px(Math.min(...heights))}, bottoms ${px(spread(bottoms))} apart`);
			}
		}
	}

	function checkSwitch(container, add) {
		const items = boxes(container);
		if (items.length < 2) return;
		const rows = lines(items);
		if (rows.length !== 1 && rows.length !== items.length) {
			add("switcher", container, `${items.length} items in ${rows.length} rows (${rows.map((r) => r.items.length).join(" + ")}); all side by side or all stacked`);
		}
	}

	function checkRows(container, add) {
		const pairs = [];
		for (const row of boxes(container)) {
			const parts = [...row.el.children].filter(shown);
			if (parts.length < 2) continue;
			const content = parts[0].getBoundingClientRect();
			const actions = parts[parts.length - 1].getBoundingClientRect();
			pairs.push({ beside: actions.top < content.bottom - TOLERANCE, left: actions.left });
		}
		const beside = pairs.filter((p) => p.beside).length;
		if (beside > 0 && beside < pairs.length) {
			add("row-list", container, `${beside} rows with actions beside, ${pairs.length - beside} below; one arrangement for all rows`);
		} else if (pairs.length > 1 && spread(pairs.map((p) => p.left)) > TOLERANCE) {
			add("row-list", container, `action column left edges ${px(spread(pairs.map((p) => p.left)))} apart`);
		}
	}

	function checkSlots(container, add) {
		// A subgrid has no implicit rows: parts beyond --card-slots pile into the last slot.
		for (const card of boxes(container)) {
			const slots = Number.parseInt(getComputedStyle(card.el).getPropertyValue("--card-slots"), 10);
			const parts = [...card.el.children].filter((s) => s.checkVisibility(VISIBLE)).length;
			if (slots > 0 && parts > slots) {
				add("card-grid", card.el, `${labelOf(card.el)} has ${parts} parts but --card-slots is ${slots}; the extra parts overlap the last slot`);
			}
		}
		for (const line of lines(boxes(container))) {
			if (line.items.length < 2) continue;
			// An empty slot element still takes its grid track, so count by rendering, not by size.
			const slots = line.items.map((card) => [...card.el.children].filter((s) => s.checkVisibility(VISIBLE)).map((s) => s.getBoundingClientRect().top));
			const count = Math.max(...slots.map((s) => s.length));
			for (let k = 0; k < count; k++) {
				const tops = slots.filter((s) => s.length > k).map((s) => s[k]);
				if (tops.length > 1 && spread(tops) > TOLERANCE) {
					add("card-grid", container, `slot ${k + 1} tops ${px(spread(tops))} apart across ${tops.length} cards in one row`);
				}
			}
		}
	}

	const CHECKS = { "control-row": checkRow, switcher: checkSwitch, "row-list": checkRows, "card-grid": checkSlots };

	function checkLabel(label, value, add) {
		if (!value) {
			add("label", label, `${labelOf(label)} has no value element after it`);
			return;
		}
		const a = getComputedStyle(label);
		const b = getComputedStyle(value);
		if (a.fontWeight === b.fontWeight && a.fontSize === b.fontSize && a.color === b.color) {
			add("label", label, `${labelOf(label)} looks like its value (weight ${a.fontWeight}, size ${a.fontSize}, colour ${a.color})`);
		}
	}

	function checkFloor(container, add, checked) {
		for (const control of container.querySelectorAll(CONTROLS)) {
			if (checked.has(control) || !shown(control)) continue;
			checked.add(control);
			const height = control.getBoundingClientRect().height;
			if (height < CONTROL_FLOOR - TOLERANCE) add("control-floor", control, `${labelOf(control)} ${px(height)} tall, under ${CONTROL_FLOOR} px`);
		}
	}

	function checkClipped(container, add) {
		for (const el of [container, ...container.querySelectorAll("*")]) {
			if (!shown(el) || !el.textContent.trim()) continue;
			const style = getComputedStyle(el);
			const clipsX = CLIPPING.has(style.overflowX) && el.scrollWidth > el.clientWidth + TOLERANCE;
			const clipsY = CLIPPING.has(style.overflowY) && el.scrollHeight > el.clientHeight + TOLERANCE;
			if (clipsX || clipsY) {
				add("clipped-text", el, `${labelOf(el)} needs ${px(el.scrollWidth)} x ${px(el.scrollHeight)} but its box is ${px(el.clientWidth)} x ${px(el.clientHeight)}`);
			}
		}
	}

	function checkPage(doc, add) {
		const root = doc.documentElement;
		if (!doc.body || root.scrollWidth <= root.clientWidth) return;
		const wide = [...doc.body.querySelectorAll("*")].filter((el) => shown(el) && el.getBoundingClientRect().right > root.clientWidth + TOLERANCE);
		const leaves = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
		add("no-sideways-scroll", leaves[0] ?? doc.body, `page is ${px(root.scrollWidth)} wide in a ${px(root.clientWidth)} viewport (${leaves.length} elements stick out)`);
	}

	function contractsOf(el, add) {
		const found = new Set();
		for (const [name, selector] of Object.entries(CLASS_CONTRACTS)) if (el.matches(selector)) found.add(name);
		const align = el.getAttribute("data-align");
		if (align !== null && align !== "label") {
			if (ALIGN_CONTRACTS[align]) found.add(ALIGN_CONTRACTS[align]);
			else add("data-align", el, `unknown contract "${align}"; use row, switch, rows, slots or label`);
		}
		return found;
	}

	// A known entry names one component. One that matches the root, body or main
	// would silence the whole page, so it is refused.
	function matchKnown(doc, found, known) {
		const page = [doc.documentElement, doc.body, doc.querySelector("main")].filter(Boolean);
		return known.filter((entry) => {
			let whole;
			try {
				whole = page.some((el) => el.matches(entry.selector));
			} catch {
				throw new Error(`known entry has an invalid selector: ${entry.selector}`);
			}
			if (whole) throw new Error(`known entry selector covers the whole page: ${entry.selector}; name the component instead`);
			let hits = 0;
			for (const v of found) {
				if (v.contract !== entry.contract) continue;
				let inside;
				try {
					inside = v.el.closest(entry.selector) !== null;
				} catch {
					throw new Error(`known entry has an invalid selector: ${entry.selector}`);
				}
				if (inside) {
					v.known = true;
					hits += 1;
				}
			}
			return hits === 0;
		});
	}

	function outline(doc, violations) {
		if (!doc.getElementById("layout-audit-outline")) {
			const style = doc.createElement("style");
			style.id = "layout-audit-outline";
			style.textContent = "[data-layout-violation] { outline: 3px solid #e5484d !important; outline-offset: 2px !important; }";
			doc.head.append(style);
		}
		for (const v of violations) v.el.setAttribute("data-layout-violation", v.contract);
	}

	globalThis.auditLayout = (doc = document, { known = [], mark = false } = {}) => {
		const found = [];
		const keys = new Set();
		const add = (contract, el, detail) => {
			const selector = selectorOf(el);
			const key = `${contract} ${selector} ${detail}`;
			if (keys.has(key)) return;
			keys.add(key);
			found.push({ contract, selector, message: `${contract}: ${detail}`, el, known: false });
		};

		let primitives = 0;
		const floorChecked = new Set();
		for (const container of doc.querySelectorAll(GROUPS)) {
			if (!container.checkVisibility(VISIBLE)) continue;
			const contracts = contractsOf(container, add);
			if (contracts.size === 0) continue;
			const box = container.getBoundingClientRect();
			const items = [...container.children].filter((c) => c.checkVisibility(VISIBLE));
			if (box.width <= TOLERANCE || box.height <= TOLERANCE) {
				// An empty primitive is fine; one that holds items in a zero box is a bug.
				for (const contract of contracts) {
					if (items.length > 0) add(contract, container, `${items.length} items in a collapsed ${px(box.width)} x ${px(box.height)} box`);
				}
				if (items.length > 0) primitives += contracts.size;
				continue;
			}
			primitives += contracts.size;
			for (const contract of contracts) CHECKS[contract](container, add);
			checkFloor(container, add, floorChecked);
			checkClipped(container, add);
		}

		for (const label of doc.querySelectorAll("dt, [data-align='label']")) {
			if (!shown(label)) continue;
			const next = label.nextElementSibling;
			if (label.localName === "dt" && next?.localName === "dt") continue;
			primitives += 1;
			const value = label.localName === "dt" ? (next?.localName === "dd" ? next : null) : next;
			checkLabel(label, value, add);
		}

		checkPage(doc, add);
		const stale = matchKnown(doc, found, known);
		if (mark) outline(doc, found.filter((v) => !v.known));
		return {
			primitives,
			violations: found.map((v) => ({ contract: v.contract, selector: v.selector, message: v.message, known: v.known })),
			stale,
		};
	};
})();
```

- [ ] **Step 8: Run the browser test**

Run: `cd libraries/layout-audit && npx playwright test selftest/audit.spec.js`
Expected: PASS, 7 tests. If a good-fixture case fails, the failure prints the message and selector. Decide whether the primitive (Tasks 2 to 5) or the check is wrong, fix that one, and note the case in the commit message. Never loosen `TOLERANCE` or edit a fixture to make it pass.

- [ ] **Step 9: Commit**

```bash
git add libraries/layout-audit
git commit -m "Add the layout audit: in-page contract checks with good and bad fixtures"
```

### Task 7: Shared matrix and the Playwright adapter

About 45 minutes.

**Files:**
- Create: `libraries/layout-audit/shared.js`, `playwright.js`, `playwright.d.ts`
- Create: `libraries/layout-audit/selftest/adapter.spec.js`, `selftest/good.spec.js`

**Interfaces:**
- Consumes: `auditLayout` global from Task 6 (injected from `audit.js`).
- Produces (`shared.js`): `WIDTHS`, `TEXT_SIZES`, `SPACING_WIDTHS`, `VIEWPORT_HEIGHT` (800), `TEXT_SPACING_CSS`, `textSizeCss(percent)`, `cells(paths)` (returns `Cell[]`), `cellName(cell)`, `knownFor(known, cell, locale)`, `validateKnown(known)` (throws without a reason), `verdict(report, { cell, locale, lang, status })` (returns `string[]`).
  - `Cell` is `{ path, expectPrimitives, width, textSize, spacing }`. `paths` takes strings or `{ path, expectPrimitives: 0 }`.
- Produces (`playwright.js`): `settle(page, path)` (returns HTTP status), `checkLayout(page, cell, { locale, known, checkLang })` (returns `{ report, errors }`), `layoutSuite({ paths, locales = ["en-US"], known = [], checkLang = true })`.

- [ ] **Step 1: Write the failing adapter tests**

Create `libraries/layout-audit/selftest/adapter.spec.js`:

```js
import { expect, test } from "@playwright/test";
import { checkLayout } from "../playwright.js";
import { cells, knownFor, validateKnown } from "../shared.js";

const GOOD = "/libraries/layout-audit/fixtures/good.html";
const BAD = "/libraries/layout-audit/fixtures/bad.html";
const EMPTY = "/libraries/layout-audit/fixtures/empty.html";
const cell = (path, extra = {}) => ({ path, width: 320, textSize: 100, spacing: false, ...extra });

test("a page with no primitives fails: the audit checked nothing", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(EMPTY), { locale: "en-US" });
	expect(errors.join("\n")).toMatch(/no primitives found/);
});

test("a page that opts out with expectPrimitives: 0 passes", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(EMPTY, { expectPrimitives: 0 }), { locale: "en-US" });
	expect(errors).toEqual([]);
});

test("an error page fails on its status", async ({ page }) => {
	const { errors } = await checkLayout(page, cell("/libraries/layout-audit/fixtures/missing.html"), { locale: "en-US" });
	expect(errors.join("\n")).toMatch(/answered HTTP 404/);
});

test("a locale cell that renders another language fails", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(GOOD), { locale: "nb-NO" });
	expect(errors.join("\n")).toMatch(/rendered <html lang="en">/);
});

test("a known entry covers its violation and nothing else", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#bad-row", reason: "fixture" }];
	const { errors } = await checkLayout(page, cell(BAD), { locale: "en-US", known });
	expect(errors.some((e) => e.endsWith("(#bad-row)"))).toBe(false);
	expect(errors.join("\n")).toMatch(/^switcher: /m);
});

test("a known entry that no longer reproduces fails, so the list only shrinks", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#row-good", reason: "fixed long ago" }];
	const { errors } = await checkLayout(page, cell(GOOD), { locale: "en-US", known });
	expect(errors.join("\n")).toMatch(/no longer reproduces, remove it: control-row #row-good \(fixed long ago\)/);
});

test("a known entry with an invalid selector fails loudly", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#row-good[", reason: "typo" }];
	await expect(checkLayout(page, cell(BAD), { locale: "en-US", known })).rejects.toThrow(/invalid selector/);
});

test("a known entry that covers the whole page is refused", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "main", reason: "silence everything" }];
	await expect(checkLayout(page, cell(BAD), { locale: "en-US", known })).rejects.toThrow(/covers the whole page/);
});

test("known entries apply only to the cells they name", () => {
	const known = [{ contract: "control-row", selector: "#x", reason: "narrow only", widths: [320] }];
	expect(knownFor(known, cell(GOOD), "en-US")).toHaveLength(1);
	expect(knownFor(known, cell(GOOD, { width: 1280 }), "en-US")).toHaveLength(0);
});

test("a known entry without a reason is refused", () => {
	expect(() => validateKnown([{ contract: "control-row", selector: "#x" }])).toThrow(/reason/);
});

test("the matrix has six widths at two text sizes plus two spacing cells per path", () => {
	const all = cells(["/a", { path: "/b", expectPrimitives: 0 }]);
	expect(all).toHaveLength(28);
	expect(all.filter((c) => c.spacing).map((c) => c.width)).toEqual([320, 1280, 320, 1280]);
	expect(all.filter((c) => c.path === "/b").every((c) => c.expectPrimitives === 0)).toBe(true);
});
```

Create `libraries/layout-audit/selftest/good.spec.js`:

```js
import { layoutSuite } from "../playwright.js";

// The full matrix over the good fixtures: every contract kept at every width,
// both text sizes and the WCAG 1.4.12 spacing cells.
layoutSuite({ paths: ["/libraries/layout-audit/fixtures/good.html"] });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd libraries/layout-audit && npx playwright test`
Expected: FAIL, cannot find module `../playwright.js`.

- [ ] **Step 3: Write `libraries/layout-audit/shared.js`**

```js
/* The matrix and the verdict, shared by the Playwright and Puppeteer adapters.
   Values from the spec: six widths, text at 100 and 200 %, WCAG 1.4.12 text
   spacing at 320 and 1280 only. */
export const WIDTHS = [320, 375, 768, 1024, 1280, 1920];
export const TEXT_SIZES = [100, 200];
export const SPACING_WIDTHS = [320, 1280];
export const VIEWPORT_HEIGHT = 800;
export const TEXT_SPACING_CSS =
	"*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }";
export const textSizeCss = (percent) => `html { font-size: ${percent}% !important; }`;

export function cells(paths) {
	const out = [];
	for (const entry of paths) {
		const { path, expectPrimitives } = typeof entry === "string" ? { path: entry } : entry;
		for (const width of WIDTHS) {
			for (const textSize of TEXT_SIZES) out.push({ path, expectPrimitives, width, textSize, spacing: false });
		}
		for (const width of SPACING_WIDTHS) out.push({ path, expectPrimitives, width, textSize: 100, spacing: true });
	}
	return out;
}

export const cellName = (cell) => `${cell.path} at ${cell.width} px, text ${cell.textSize} %${cell.spacing ? ", WCAG 1.4.12 spacing" : ""}`;

export function validateKnown(known) {
	for (const entry of known) {
		if (!entry.contract || !entry.selector || !entry.reason?.trim()) {
			throw new Error(`a known violation needs contract, selector and a one-line reason: ${JSON.stringify(entry)}`);
		}
	}
}

// A known entry applies to the cells it names; an unscoped entry applies everywhere.
export function knownFor(known, cell, locale) {
	return known.filter(
		(k) =>
			(!k.paths || k.paths.includes(cell.path)) &&
			(!k.widths || k.widths.includes(cell.width)) &&
			(!k.textSizes || k.textSizes.includes(cell.textSize)) &&
			(!k.locales || k.locales.includes(locale)) &&
			(k.spacing === undefined || k.spacing === cell.spacing),
	);
}

// Everything that should fail a cell, as one line each. lang is undefined when the check is off.
export function verdict(report, { cell, locale, lang, status }) {
	const errors = [];
	if (status >= 400) errors.push(`${cell.path} answered HTTP ${status}; an error page is not a layout`);
	if (locale && lang !== undefined && lang.split("-")[0].toLowerCase() !== locale.split("-")[0].toLowerCase()) {
		errors.push(`locale ${locale} rendered <html lang="${lang}">; this cell would test the wrong language`);
	}
	if (report.primitives === 0 && cell.expectPrimitives !== 0) {
		errors.push(`no primitives found on ${cell.path}: the audit checked nothing. Pass { path, expectPrimitives: 0 } if that is deliberate`);
	}
	for (const v of report.violations) if (!v.known) errors.push(`${v.message} (${v.selector})`);
	for (const k of report.stale) errors.push(`known entry no longer reproduces, remove it: ${k.contract} ${k.selector} (${k.reason})`);
	return errors;
}
```

- [ ] **Step 4: Write `libraries/layout-audit/playwright.js`**

```js
/* Playwright adapter: layoutSuite() makes one test per path, locale, width and
   text size, plus the WCAG 1.4.12 spacing cells. A failing test lists every
   violation and attaches a screenshot with each violator outlined in red. */
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { cellName, cells, knownFor, TEXT_SPACING_CSS, textSizeCss, VIEWPORT_HEIGHT, validateKnown, verdict } from "./shared.js";

const AUDIT = fileURLToPath(new URL("./audit.js", import.meta.url));

// Load a path the way a returning visitor sees it: fonts loaded, then a reload with
// them cached (a font-display: optional face may skip the first paint).
export async function settle(page, path) {
	await page.goto(path);
	await page.evaluate(() => document.fonts.ready);
	const response = await page.reload();
	await page.evaluate(() => document.fonts.ready);
	return response?.status() ?? 0;
}

export async function checkLayout(page, cell, { locale, known = [], checkLang = true } = {}) {
	await page.setViewportSize({ width: cell.width, height: VIEWPORT_HEIGHT });
	const status = await settle(page, cell.path);
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ path: AUDIT });
	const { report, lang } = await page.evaluate(async (entries) => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return { report: globalThis.auditLayout(document, { known: entries, mark: true }), lang: document.documentElement.lang };
	}, knownFor(known, cell, locale));
	return { report, errors: verdict(report, { cell, locale, lang: checkLang ? lang : undefined, status }) };
}

export function layoutSuite({ paths, locales = ["en-US"], known = [], checkLang = true }) {
	validateKnown(known);
	for (const locale of locales) {
		test.describe(`layout, ${locale}`, () => {
			test.use({ locale, reducedMotion: "reduce", bypassCSP: true });
			for (const cell of cells(paths)) {
				test(cellName(cell), async ({ page }, testInfo) => {
					const { errors } = await checkLayout(page, cell, { locale, known, checkLang });
					if (errors.length > 0) {
						await testInfo.attach("violations outlined", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
					}
					expect(errors, errors.join("\n")).toEqual([]);
				});
			}
		});
	}
}
```

- [ ] **Step 5: Write `libraries/layout-audit/playwright.d.ts`**

```ts
import type { Page } from "@playwright/test"

export type Contract =
	| "control-row"
	| "switcher"
	| "row-list"
	| "card-grid"
	| "label"
	| "control-floor"
	| "clipped-text"
	| "no-sideways-scroll"
	| "data-align"

export interface KnownViolation {
	contract: Contract
	selector: string
	reason: string
	paths?: string[]
	widths?: number[]
	textSizes?: number[]
	locales?: string[]
	spacing?: boolean
}

export type LayoutPath = string | { path: string; expectPrimitives: 0 }

export interface Cell {
	path: string
	expectPrimitives?: 0
	width: number
	textSize: number
	spacing: boolean
}

export interface Violation {
	contract: Contract
	selector: string
	message: string
	known: boolean
}

export interface Report {
	primitives: number
	violations: Violation[]
	stale: KnownViolation[]
}

export function settle(page: Page, path: string): Promise<number>

export function checkLayout(
	page: Page,
	cell: Cell,
	options?: { locale?: string; known?: KnownViolation[]; checkLang?: boolean },
): Promise<{ report: Report; errors: string[] }>

export function layoutSuite(options: {
	paths: LayoutPath[]
	locales?: string[]
	known?: KnownViolation[]
	checkLang?: boolean
}): void
```

- [ ] **Step 6: Run the self-test**

Run: `cd libraries/layout-audit && npx playwright test`
Expected: PASS. 7 audit tests, 11 adapter tests and 14 good-fixture matrix cells (6 widths x 2 text sizes + 2 spacing cells). A matrix failure on `good.html` is a real finding: fix the primitive or the check as in Task 6 Step 8.

- [ ] **Step 7: Commit**

```bash
git add libraries/layout-audit
git commit -m "Add the layout matrix and the Playwright adapter with its self-test"
```

### Task 8: Puppeteer adapter, packaging, guards and CI

About 40 minutes.

**Files:**
- Create: `libraries/layout-audit/puppeteer.js`, `extract.json`, `VERSION`, `README.md`
- Create: `tools/layout-audit.test.mjs`
- Modify: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md` (root)

**Interfaces:**
- Consumes: `shared.js` from Task 7; `audit.js` from Task 6.
- Produces (`puppeteer.js`): `checkLayout(page, url, cell, { locale, known, checkLang })` returning `{ report, errors }`, and re-exports `cells`, `cellName`, `knownFor`, `validateKnown`. Extract manifest: `include` is exactly `audit.js, shared.js, playwright.js, playwright.d.ts, puppeteer.js`, anchor `audit.js`.

- [ ] **Step 1: Write the failing guard test**

Create `tools/layout-audit.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LIB = join(ROOT, "libraries", "layout-audit");
const read = (p) => readFileSync(join(LIB, p), "utf8").replaceAll("\r\n", "\n");

test("audit.js is a dependency-free classic script", () => {
	const audit = read("audit.js");
	assert.doesNotMatch(audit, /^\s*(import|export)\s/m, "audit.js is injected as a classic <script>; no import or export");
	assert.doesNotMatch(audit, /\brequire\(/);
	assert.match(audit, /globalThis\.auditLayout = /);
});

test("extract ships only the runtime files, anchored on audit.js", () => {
	const manifest = JSON.parse(read("extract.json"));
	assert.deepEqual(manifest.include, ["audit.js", "shared.js", "playwright.js", "playwright.d.ts", "puppeteer.js"]);
	assert.equal(manifest.anchor, "audit.js");
	for (const file of manifest.include) assert.ok(existsSync(join(LIB, file)), `${file} is listed but missing`);
});

test("no app source references the audit: it lives in test folders only", () => {
	const offenders = [];
	const walk = (dir) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === "node_modules") continue;
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (/\.(js|ts|tsx|css|html)$/.test(entry.name) && readFileSync(path, "utf8").includes("auditLayout")) offenders.push(path);
		}
	};
	walk(join(ROOT, "libraries", "design-system"));
	for (const scaffold of ["web-react-ts", "web-vite"]) walk(join(ROOT, "scaffolds", scaffold, "src"));
	assert.deepEqual(offenders, []);
});

test("VERSION is 1.0.0 and the README documents contracts, matrix, known list and the pre-show check", () => {
	assert.equal(read("VERSION").trim(), "1.0.0");
	const readme = read("README.md");
	for (const needle of ["control-row", "switcher", "row-list", "card-grid", "label", "control-floor", "clipped-text", "no-sideways-scroll", "data-align", "expectPrimitives", "known", "1.4.12", "javascript_tool", "auditLayout"]) {
		assert.ok(readme.includes(needle), `README should mention ${needle}`);
	}
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/layout-audit.test.mjs`
Expected: FAIL, ENOENT for `extract.json`.

- [ ] **Step 3: Write `libraries/layout-audit/puppeteer.js`**

```js
/* Puppeteer adapter for scaffolds that run node:test with Puppeteer (web-vite).
   Same steps as the Playwright adapter: settle, apply the cell, inject, audit, judge. */
import { readFileSync } from "node:fs";
import { knownFor, TEXT_SPACING_CSS, textSizeCss, VIEWPORT_HEIGHT, verdict } from "./shared.js";

export { cellName, cells, knownFor, validateKnown } from "./shared.js";

const AUDIT = readFileSync(new URL("./audit.js", import.meta.url), "utf8");

export async function checkLayout(page, url, cell, { locale, known = [], checkLang = true } = {}) {
	await page.setBypassCSP(true);
	await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
	await page.setViewport({ width: cell.width, height: VIEWPORT_HEIGHT });
	await page.goto(url, { waitUntil: "networkidle0" });
	await page.evaluate(() => document.fonts.ready);
	const response = await page.reload({ waitUntil: "networkidle0" });
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ content: AUDIT });
	const { report, lang } = await page.evaluate(async (entries) => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return { report: globalThis.auditLayout(document, { known: entries, mark: true }), lang: document.documentElement.lang };
	}, knownFor(known, cell, locale));
	return { report, errors: verdict(report, { cell, locale, lang: checkLang ? lang : undefined, status: response?.status() ?? 0 }) };
}
```

(It is exercised for real by web-vite's `tests/e2e/layout.test.js` in Task 11; the self-test package has no Puppeteer.)

- [ ] **Step 4: Write `extract.json` and `VERSION`**

`libraries/layout-audit/extract.json`:

```json
{
  "versionFile": "VERSION",
  "include": ["audit.js", "shared.js", "playwright.js", "playwright.d.ts", "puppeteer.js"],
  "anchor": "audit.js"
}
```

`libraries/layout-audit/VERSION`: `1.0.0`

- [ ] **Step 5: Write `libraries/layout-audit/README.md`**

```markdown
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

Hidden elements are skipped with `checkVisibility()`, and so are 1 px visually hidden boxes. A primitive that holds items in a zero-width box is reported.

## Use it

Copy it into a scaffold's test folder with the extract tool, never into `src/`:

    node tools/extract.mjs layout-audit ../my-app/e2e          # Playwright: ../my-app/e2e/layout-audit
    node tools/extract.mjs layout-audit ../my-app/tests/e2e    # Puppeteer:  ../my-app/tests/e2e/layout-audit

Playwright (`e2e/layout.spec.ts`):

    import { layoutSuite } from "./layout-audit/playwright.js"
    layoutSuite({ paths: ["/"], locales: ["en-US", "nb-NO"] })

Puppeteer: see `scaffolds/web-vite/tests/e2e/layout.test.js`.

## The matrix

Widths 320, 375, 768, 1024, 1280 and 1920 px; text at 100 % and 200 % (`html { font-size: 200% }`, the WCAG 1.4.4 case); every locale I pass. The WCAG 1.4.12 text-spacing override (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em) runs at 320 and 1280 only. Each cell waits for `document.fonts.ready`, reloads once with fonts cached, and runs with reduced motion.

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

`selector` matches the violator or any ancestor; a selector that matches `html`, `body` or `main` is refused, since it would silence the whole page. `reason` is required. `paths`, `widths`, `textSizes`, `locales` and `spacing` scope an entry to the cells it names.

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
```

- [ ] **Step 6: Add the CI job**

Append to `.github/workflows/ci.yml` under `jobs:` (same indentation as `test:`):

```yaml
  layout-audit:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: libraries/layout-audit
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps --only-shell chromium
      - name: Layout audit self-test (fixtures, adapter, matrix)
        run: npm test
      - if: failure()
        uses: actions/upload-artifact@<major>
        with:
          name: layout-audit-results
          path: libraries/layout-audit/test-results
          retention-days: 7
```

Replace `<major>` with the current major tag: run `gh api repos/actions/upload-artifact/releases/latest --jq .tag_name` and use its major (for example `v4.6.2` becomes `v4`).

- [ ] **Step 7: Let Dependabot see the new package**

Append to `.github/dependabot.yml` under `updates:` the npm block from `scaffolds/web-react-ts/.github/dependabot.yml`, copied as is, with `directory: /libraries/layout-audit`.

- [ ] **Step 8: Root README rows**

In the root `README.md`: in the Structure table, the `libraries/` row lists `design-system/`, `storyboard/`, `i18n/` and `layout-audit/`. In the "Reuse a library" code block, add:

```bash
node tools/extract.mjs layout-audit ../my-app/e2e         # layout checks → ../my-app/e2e/layout-audit (test folder only)
```

- [ ] **Step 9: Run everything**

Run: `node --test tools/layout-audit.test.mjs`. Expected: PASS, 4 tests.
Run: `cd libraries/layout-audit && npm test`. Expected: PASS.
Run the root suite with the skip pattern, then `node tools/check-links.mjs`. Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add libraries/layout-audit tools/layout-audit.test.mjs .github README.md
git commit -m "Package layout-audit 1.0.0 with a Puppeteer adapter and a CI self-test"
```

### Task 9: Design system 3.10.0: gallery, docs, version, scaffold sync

About 40 minutes. Closes PR A.

**Files:**
- Modify: `libraries/design-system/gallery/sections.js` (panel `primitives`, starts at line 249)
- Modify: `libraries/design-system/README.md:31` and a new section, `CHANGELOG.md`, `VERSION`
- Modify: `tools/design-system.test.mjs:687-694` (VERSION test)
- Re-extract: `scaffolds/web-vite/design-system/`, `scaffolds/web-react-ts/design-system/`

**Interfaces:**
- Consumes: everything from Tasks 1 to 5.
- Produces: design system `3.10.0` in both web scaffolds; `tools/scaffold-sync.test.mjs` green again.

- [ ] **Step 1: Update the VERSION test first (failing)**

In `tools/design-system.test.mjs:687`, rename the test to `"VERSION is 3.10.0 and README documents the identity, the icon set, the file picker, toggle buttons, the pickers, the Tailwind bridge and the layout primitives"`, change `"3.9.1"` to `"3.10.0"` in the `assert.equal` and in the CHANGELOG regex (change only the version digits; keep the separator character the regex already has), and add these needles to the array: `"control-row"`, `"switcher"`, `"row-list"`, `"card-grid"`, `"--control-height"`, `"data-align"`, `"layout-audit"`.

Run: `node --test tools/design-system.test.mjs`. Expected: FAIL on VERSION.

- [ ] **Step 2: Gallery specimens**

In `gallery/sections.js`, inside the `primitives` panel's `render()`, append after its last `specimen(...)`:

```js
          specimen({
            title: "Control row",
            note: "Controls decide their height as a group: when one label wraps, its neighbours grow with it.",
            classes: [".control-row"],
            demo: `
              <div class="control-row" style="max-inline-size: 22rem">
                <button class="btn" type="button">Ring 113</button>
                <button class="btn" type="button">Legevakt: ring 116 117 om natten</button>
                <button class="btn" type="button">Kart</button>
              </div>`,
          }) +
          specimen({
            title: "Switcher",
            note: "All side by side, or all stacked. Narrow the window past --switcher-threshold to see them flip together.",
            classes: [".switcher"],
            demo: `
              <div class="switcher">
                <a class="btn" href="#">Ring 113</a>
                <a class="btn" href="#">Ring 112</a>
                <a class="btn" href="#">Ring 110</a>
              </div>`,
          }) +
          specimen({
            title: "Row list",
            note: "Every row's actions share one column. One container query moves all of them below the text at once.",
            classes: [".row-list"],
            demo: `
              <ul class="row-list">
                <li><span>Mental helse hjelpetelefon</span><a class="btn" href="#">Ring 116 123</a></li>
                <li><span>Kirkens SOS, døgnåpen samtaletjeneste</span><a class="btn" href="#">Ring 22 40 00 40</a></li>
              </ul>`,
          }) +
          specimen({
            title: "Card grid",
            note: "Title, badges, body and actions are fixed slots, so they line up across a row. Keep an empty element for a missing part.",
            classes: [".card-grid", ".card", "--card-slots"],
            demo: `
              <div class="card-grid">
                <article class="card"><h3>Legevakt</h3><p class="cluster cluster-sm"><span class="badge">Døgnåpen</span></p><p>Akutt hjelp når fastlegen er stengt.</p><div class="control-row"><a class="btn" href="#">Ring 116 117</a></div></article>
                <article class="card"><h3>Barnevernsvakten i Oslo og omegn</h3><div></div><p>Svarer hele døgnet.</p><div class="control-row"><a class="btn" href="#">Ring 116 111</a></div></article>
              </div>`,
          }) +
          specimen({
            title: "Labels beside values",
            note: "dt over dd, or data-align=\"label\" before a value: stronger ink and weight than the value.",
            classes: ["dt", "dd", "[data-align=label]"],
            demo: `
              <dl class="stack stack-sm">
                <div><dt>Åpent</dt><dd>Hele døgnet</dd></div>
                <div><dt>Telefon</dt><dd>116 117</dd></div>
              </dl>`,
          })
```

(Each `specimen(...)` before it in that panel already ends with `+`; make sure the one before this block does too, and that the block closes the panel's return expression the way the last specimen did.)

- [ ] **Step 3: README**

In `libraries/design-system/README.md:31`, the primitives line becomes:

```markdown
- `primitives/`: layout helpers (`stack`, `cluster`, `grid`, `sidebar`, `split`, `center`, `container`) and the layout-contract primitives (`control-row`, `switcher`, `row-list`, `card-grid`)
```

Add a section before `## Versioning`:

```markdown
## Layout contracts

Layout is decided per group, never per item. Each of these primitives makes the decision once for the whole group, and its class is also a test contract that `libraries/layout-audit` checks in a browser.

| Primitive | Behaviour | Contract |
|---|---|---|
| `--control-height` | `2.75rem` (44 px), every control's `min-block-size` | Every control inside a primitive is at least 44 px tall |
| `.control-row` | Flex row with `align-items: stretch` | Per visual row: one height, one bottom edge |
| `.switcher` | Side by side until `--switcher-threshold` (30rem), then all stacked | All in one row, or all in one column |
| `.row-list` | Rows share one `minmax(0, 1fr) auto` grid (subgrid); a container query decides beside or below | One arrangement, one action edge |
| `.card-grid` + `.card` | Auto-fit columns of at least `--card-min`; each card spans `--card-slots` rows as a subgrid | Slot k on one row shares one top edge |
| `dt` / `dd`, `[data-align="label"]` | Label in `--text` at `--weight-label`, value muted | Label and value differ |

For custom markup, `data-align="row|switch|rows|slots|label"` applies the matching contract. No primitive uses `order` or a reverse direction, so visual order is DOM order. Grids, `.split` and `.sidebar-layout` collapse by their own size (auto-fit, flex wrap), never by a `max-width` media query, and every fluid `clamp()` has a rem term so it follows text zoom.

In React, use the scaffold's thin components (`<ControlRow>`, `<Switcher>`, `<RowList>`, `<CardGrid>`, `<Card>`). A row of controls hand-rolled with Tailwind utilities when a primitive fits is a review finding.

Syncing an existing project to 3.10.0 or later is an adoption and gets an adoption preview first: the collapse fixes move layouts.
```

- [ ] **Step 4: CHANGELOG and VERSION**

Set `VERSION` to `3.10.0`. Add at the top of `CHANGELOG.md`, under the header, using the same heading dash as the 3.9.1 entry:

```markdown
## 3.10.0 SEPARATOR 2026-MM-DD

Layout by construction (loadout spec `2026-10-15-layout-by-construction-design.md`). Additive classes, but the collapse fixes move existing layouts, so syncing a project to 3.10.0 is an adoption.

- **New `--control-height` token** (`2.75rem`). `.btn`, `.icon-btn`, `.input`/`.select`, `.tab` and `.picker-row` take it as `min-block-size` instead of a literal `min-height`, so a control grows with zoomed text but never drops under 44 px.
- **New primitives:** `.control-row`, `.switcher`, `.row-list` (subgrid plus a container query), `.card-grid` with subgrid `.card` slots. Each class is a contract that `libraries/layout-audit` checks.
- **Collapse fixes:** `.grid-2`, `.grid-3`, `.grid-auto`, `.split` and `.sidebar-layout` drop their `max-width` media queries for intrinsic sizing; `.dashboard-grid` and `.kpi-row` minimums can no longer overflow. Collapse points move (see the PR).
- **Text:** headings `text-wrap: balance` and break long words; body text `text-wrap: pretty`; every fluid `clamp()` has a rem term (WCAG 1.4.4).
- **Labels:** `dt` and `[data-align="label"]` use `--text` at the new `--weight-label` (600); `dd` is muted.
- Static tests in `tools/design-system-layout.test.mjs` pin the token, the primitives, no `max-width`, no `order` or reverse, no bare rem `minmax()` and rem terms in `clamp()`.
```

Replace `SEPARATOR` with the exact separator character the `## 3.9.1` heading uses (copy it from that line), and `2026-MM-DD` with the output of `date +"%Y-%m-%d"` run in the same step.

- [ ] **Step 5: Re-extract into both web scaffolds**

```bash
node tools/extract.mjs design-system scaffolds/web-vite
node tools/extract.mjs design-system scaffolds/web-react-ts
```

Expected: both report `synced` to 3.10.0.

- [ ] **Step 6: Full root suite, no skip pattern**

Run: `node --test "tools/*.test.mjs"` then `node tools/check-links.mjs`.
Expected: PASS, including `scaffold-sync.test.mjs`.
Run each scaffold's existing suites (`npm test` in `scaffolds/web-vite`; `npm test`, `npm run typecheck` and `npm run test:e2e` in `scaffolds/web-react-ts`). Expected: PASS. A scaffold failure here means a 3.10.0 change broke a scaffold screen: fix it in the design system, never in the scaffold copy.

- [ ] **Step 7: Look at it**

Open the gallery in the browser pane (`preview_start` with the workbench's launch config, or add one serving the repo root), `resize_window` to 320 and to 1280, and run the pre-show check from the layout-audit README on the primitives panel. Expected: zero violations. Screenshot both widths for the PR.

- [ ] **Step 8: Commit, push, open PR A**

```bash
git add libraries/design-system tools/design-system.test.mjs scaffolds/web-vite/design-system scaffolds/web-react-ts/design-system
git commit -m "Release design system 3.10.0 with layout primitives, synced into the web scaffolds"
git push -u origin feat/layout-by-construction
```

Open the PR with title `Layout by construction: design system 3.10.0 and layout-audit 1.0.0`. Body: what shipped (one line per task), the collapse-point table from Task 4, the two gallery screenshots, test counts read off the runs above, and the line "Merge is mine; tag and Release wait for PR B." No AI attribution.

- [ ] **Step 9: Ask about the required check**

A CI job that is not a required check can go red and still be merged. Once the `layout-audit` job has passed on PR A, ask me in chat whether to add it to the required checks on `main`. Change the branch protection or ruleset only on my yes.

---

## PR B: scaffolds

### Task 10: web-react-ts: layout components and `e2e/layout.spec.ts`

About 60 minutes.

**Files:**
- Extract: `scaffolds/web-react-ts/e2e/layout-audit/`
- Create: `scaffolds/web-react-ts/src/components/layout.tsx`, `e2e/layout.spec.ts`, `tests/components/layout.test.tsx`, `tests/bundle.test.ts`
- Modify: `scaffolds/web-react-ts/src/components/Counter.tsx:21`, `biome.json:10`, `README.md` (Testing section, line 135 onward)
- Modify: `tools/scaffold-sync.test.mjs:8-30`

**Interfaces:**
- Consumes: design system 3.10.0 classes; `layoutSuite` from `e2e/layout-audit/playwright.js` (Task 7).
- Produces: React components `ControlRow` (div), `Switcher` (div, prop `threshold?: string`), `RowList` (ul), `CardGrid` (div, prop `min?: string`), `Card` (article, prop `slots?: number`). Each takes its element's props and merges `className` with `cn` from the `cn` package.

- [ ] **Step 1: Branch**

```bash
git checkout feat/layout-by-construction
git checkout -b feat/layout-scaffolds
```

- [ ] **Step 2: Teach the drift guard about sub-folder targets (failing)**

In `tools/scaffold-sync.test.mjs`, replace `BUNDLES` and the loop (lines 8 to 30) with:

```js
// Every scaffold folder that bundles a library copy. A library bump without a
// re-sync of each of these must fail CI, not ship silently.
const BUNDLES = {
  "design-system": [["web-vite", "."], ["web-react-ts", "."]],
  i18n: [["web-vite", "."], ["web-react-ts", "."]],
  "layout-audit": [["web-react-ts", "e2e"]],
};

for (const [library, targets] of Object.entries(BUNDLES)) {
  for (const [scaffold, dir] of targets) {
    const target = join("scaffolds", scaffold, dir).replaceAll("\\", "/");
    test(`${target} bundles the current ${library}`, () => {
      const r = extract({
        libraryName: library,
        workbenchRoot: WORKBENCH,
        targetDir: join(WORKBENCH, target),
        check: true,
      });
      assert.equal(
        r.status,
        "current",
        `${target}/${library} is ${r.status}. Re-run: node tools/extract.mjs ${library} ${target}`,
      );
    });
  }
}
```

Keep whatever followed line 30 in that file. Run `node --test tools/scaffold-sync.test.mjs`. Expected: FAIL for `scaffolds/web-react-ts/e2e bundles the current layout-audit`.

- [ ] **Step 3: Extract the audit into the test folder**

```bash
node tools/extract.mjs layout-audit scaffolds/web-react-ts/e2e
```

Expected: `copied-fresh`. In `scaffolds/web-react-ts/biome.json:10`, add `"!e2e/layout-audit"` to `files.includes` after `"!i18n"`. Re-run the sync test. Expected: PASS.

- [ ] **Step 4: Write the failing component test**

Create `scaffolds/web-react-ts/tests/components/layout.test.tsx`:

```tsx
/* Layout primitives: each renders its design system class and passes axe, and a
   ControlRow really keeps a wrapped label's neighbours at its height. */
import { expect, test } from "vitest"
import { render } from "vitest-browser-react"
import { Card, CardGrid, ControlRow, RowList, Switcher } from "../../src/components/layout.tsx"
import { axeComponent } from "./axe.ts"

test("each layout primitive renders its design system class and passes axe", async () => {
	const screen = await render(
		<div>
			<ControlRow data-testid="row">
				<button type="button" className="btn">One</button>
				<button type="button" className="btn">Two</button>
			</ControlRow>
			<Switcher data-testid="switcher" threshold="20rem">
				<a className="btn" href="#a">A</a>
				<a className="btn" href="#b">B</a>
			</Switcher>
			<RowList data-testid="rows">
				<li>
					<span>Name</span>
					<button type="button" className="btn">Call</button>
				</li>
			</RowList>
			<CardGrid data-testid="cards" min="12rem">
				<Card data-testid="card" slots={3}>
					<h3>Title</h3>
					<p>Body</p>
					<button type="button" className="btn">Act</button>
				</Card>
			</CardGrid>
		</div>,
	)
	const byId = (id: string) => screen.container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
	expect(byId("row")?.className).toBe("control-row")
	expect(byId("switcher")?.className).toBe("switcher")
	expect(byId("switcher")?.style.getPropertyValue("--switcher-threshold")).toBe("20rem")
	expect(byId("rows")?.tagName).toBe("UL")
	expect(byId("cards")?.style.getPropertyValue("--card-min")).toBe("12rem")
	expect(byId("card")?.tagName).toBe("ARTICLE")
	expect(byId("card")?.style.getPropertyValue("--card-slots")).toBe("3")
	expect(await axeComponent(screen.container)).toEqual([])
})

test("ControlRow keeps a wrapped label's neighbours at its height", async () => {
	const screen = await render(
		<div style={{ inlineSize: "16rem" }}>
			<ControlRow>
				<button type="button" className="btn">Legevakt: ring 116 117 om natten</button>
				<button type="button" className="btn">Ring</button>
			</ControlRow>
		</div>,
	)
	const [a, b] = [...screen.container.querySelectorAll("button")].map((el) => el.getBoundingClientRect())
	expect(a && b).toBeTruthy()
	if (!a || !b) return
	expect(a.height).toBeGreaterThan(44)
	expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(1)
	expect(Math.abs(a.bottom - b.bottom)).toBeLessThanOrEqual(1)
})
```

Run: `npm run test:browser` in `scaffolds/web-react-ts`. Expected: FAIL, cannot resolve `../../src/components/layout.tsx`.

- [ ] **Step 5: Write `src/components/layout.tsx`**

```tsx
/* ======================================================================
   src/components/layout.tsx: DESIGN SYSTEM LAYOUT PRIMITIVES
   Thin wrappers that only render the design system class, so a row of
   controls, a switcher, a row list or a card grid decides its layout once
   for the whole group. e2e/layout.spec.ts audits all of them.
   A row of controls hand-rolled with Tailwind (flex gap-2) when one of
   these fits is a review finding.
   Card renders an <article>: use it for self-contained items (a service,
   a result). A panel that is not one stays <div className="card">.
   ====================================================================== */

import { cn } from "cn"
import type { ComponentProps, CSSProperties } from "react"

export function ControlRow({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("control-row", className)} {...props} />
}

export function Switcher({ className, style, threshold, ...props }: ComponentProps<"div"> & { threshold?: string }) {
	const vars = threshold ? ({ "--switcher-threshold": threshold } as CSSProperties) : undefined
	return <div className={cn("switcher", className)} style={{ ...vars, ...style }} {...props} />
}

export function RowList({ className, ...props }: ComponentProps<"ul">) {
	return <ul className={cn("row-list", className)} {...props} />
}

export function CardGrid({ className, style, min, ...props }: ComponentProps<"div"> & { min?: string }) {
	const vars = min ? ({ "--card-min": min } as CSSProperties) : undefined
	return <div className={cn("card-grid", className)} style={{ ...vars, ...style }} {...props} />
}

export function Card({ className, style, slots, ...props }: ComponentProps<"article"> & { slots?: number }) {
	const vars = slots ? ({ "--card-slots": String(slots) } as CSSProperties) : undefined
	return <article className={cn("card", className)} style={{ ...vars, ...style }} {...props} />
}
```

Run: `npm run test:browser`. Expected: PASS.

- [ ] **Step 6: Use `ControlRow` in Counter**

In `src/components/Counter.tsx`, import `ControlRow` from `./layout.tsx` (next to the `ResetDialog` import) and replace `<div className="cluster">` (line 21) and its closing `</div>` with `<ControlRow>` and `</ControlRow>`. That gives the home page a primitive to audit.

- [ ] **Step 7: Write the bundle test**

Create `scaffolds/web-react-ts/tests/bundle.test.ts`:

```ts
/* The layout audit is test-only: build the app and fail if it reached the bundle. */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build } from "vite"
import { afterAll, expect, test } from "vitest"

const outDir = mkdtempSync(join(tmpdir(), "bundle-"))
afterAll(() => rmSync(outDir, { recursive: true, force: true }))

test("the production bundle never ships the layout audit", { timeout: 120_000 }, async () => {
	await build({ root: join(import.meta.dirname, ".."), logLevel: "silent", build: { outDir, emptyOutDir: true } })
	const files = readdirSync(outDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
	expect(files.length).toBeGreaterThan(0)
	for (const file of files) {
		const text = readFileSync(join(file.parentPath, file.name), "utf8")
		expect(text.includes("auditLayout"), `${file.name} carries auditLayout`).toBe(false)
	}
})
```

Run: `npm test`. Expected: PASS. (To see it fail once, temporarily add `import "../../e2e/layout-audit/audit.js"` to `src/main.tsx`, run, watch it fail, and remove the line.)

- [ ] **Step 8: Write the layout spec**

Create `scaffolds/web-react-ts/e2e/layout.spec.ts`:

```ts
/* ======================================================================
   e2e/layout.spec.ts: the layout audit over the built app
   One test per path, locale, width (320 to 1920) and text size (100, 200 %),
   plus WCAG 1.4.12 text spacing at 320 and 1280. e2e/layout-audit is
   extracted from the workbench (libraries/layout-audit); never edit it here.
   Add every route here as you build it. Known violations need a reason and
   can only shrink.
   ====================================================================== */
import { layoutSuite } from "./layout-audit/playwright.js"

layoutSuite({ paths: ["/"], locales: ["en-US", "nb-NO"] })
```

Run: `npx playwright test e2e/layout.spec.ts`. Expected: PASS, 28 tests. A failure prints the violation and attaches an outlined screenshot (`npx playwright show-report`). Fix it in the scaffold's components, or in the design system if the primitive is wrong (then re-extract, which needs a design system patch bump on this branch).

- [ ] **Step 9: README**

In `scaffolds/web-react-ts/README.md`, in `## Testing`, add a layer after the axe scan:

```markdown
4. **Layout audit** (`e2e/layout.spec.ts`, part of `npm run test:e2e`). Every route at 320 to 1920 px, at 100 and 200 % text, in every locale, plus WCAG 1.4.12 text spacing. It fails with the element and the measured numbers when a primitive's contract breaks, and attaches a screenshot with the violators outlined. Build rows of controls, switchers, row lists and card grids from `src/components/layout.tsx`; a row hand-rolled with Tailwind utilities is a review finding. `e2e/layout-audit/` is extracted from the workbench and never ships: `tests/bundle.test.ts` fails if it reaches the build.
```

- [ ] **Step 10: Run the whole scaffold**

Run in `scaffolds/web-react-ts`: `npm run check`, `npm run typecheck`, `npm test`, `npm run test:e2e`. Expected: all PASS.
Run the root suite. Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add scaffolds/web-react-ts tools/scaffold-sync.test.mjs
git commit -m "Add layout components and the layout audit to web-react-ts"
```

### Task 11: web-vite: Puppeteer layout test

About 45 minutes.

**Files:**
- Extract: `scaffolds/web-vite/tests/e2e/layout-audit/`
- Create: `scaffolds/web-vite/tests/e2e/layout.test.js`, `tests/bundle.test.js`
- Modify: `scaffolds/web-vite/src/view/view.js:191`, `biome.json`, `.gitignore`, `README.md` (`## Accessibility`, line 59 onward)
- Modify: `tools/scaffold-sync.test.mjs` (`BUNDLES`)

**Interfaces:**
- Consumes: `checkLayout`, `cells`, `cellName` from `tests/e2e/layout-audit/puppeteer.js` (Task 8).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Drift guard entry (failing)**

In `tools/scaffold-sync.test.mjs`, the `"layout-audit"` entry becomes `[["web-react-ts", "e2e"], ["web-vite", "tests/e2e"]]`. Run `node --test tools/scaffold-sync.test.mjs`. Expected: FAIL for `scaffolds/web-vite/tests/e2e`.

- [ ] **Step 2: Extract, exclude from Biome, ignore test output**

```bash
node tools/extract.mjs layout-audit scaffolds/web-vite/tests/e2e
```

Add `"!tests/e2e/layout-audit"` to `files.includes` in `scaffolds/web-vite/biome.json`. Append to `scaffolds/web-vite/.gitignore`:

```
# Layout audit screenshots of failing cells
test-results/
```

Re-run the sync test. Expected: PASS.

- [ ] **Step 3: Write the failing layout test**

Create `scaffolds/web-vite/tests/e2e/layout.test.js`:

```js
/* ======================================================================
   tests/e2e/layout.test.js: the layout audit over the real page
   Every width (320 to 1920), text size (100, 200 %) and locale, plus WCAG
   1.4.12 text spacing at 320 and 1280. A failing cell saves a screenshot with
   the violators outlined to test-results/. tests/e2e/layout-audit is extracted
   from the workbench (libraries/layout-audit); never edit it here.
   ====================================================================== */
import assert from "node:assert/strict"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { after, before, test } from "node:test"
import puppeteer from "puppeteer"
import { createServer } from "vite"
import { cellName, cells, checkLayout } from "./layout-audit/puppeteer.js"

const ROOT = resolve(import.meta.dirname, "../..")
// [locale the cell is named for, the stored "lang" preference that selects it]
const LOCALES = [
	["en-US", "en"],
	["nb-NO", "nb"],
]

let server
let browser
let origin

before(async () => {
	server = await createServer({ root: ROOT, logLevel: "silent", server: { port: 4318 } })
	await server.listen()
	origin = server.resolvedUrls.local[0]
	browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] })
})

after(async () => {
	await browser?.close()
	await server?.close()
})

for (const [locale, lang] of LOCALES) {
	for (const cell of cells(["/"])) {
		test(`layout, ${locale}: ${cellName(cell)}`, async () => {
			const context = await browser.createBrowserContext()
			try {
				const page = await context.newPage()
				await page.evaluateOnNewDocument((value) => localStorage.setItem("lang", value), lang)
				const { errors } = await checkLayout(page, new URL(cell.path, origin).href, cell, { locale })
				if (errors.length > 0) {
					mkdirSync("test-results", { recursive: true })
					await page.screenshot({ path: `test-results/layout-${lang}-${cell.width}-${cell.textSize}${cell.spacing ? "-spacing" : ""}.png`, fullPage: true })
				}
				assert.deepEqual(errors, [])
			} finally {
				await context.close()
			}
		})
	}
}
```

Run: `npm run test:e2e` in `scaffolds/web-vite`. Expected: FAIL in every cell with `no primitives found on /`: the page has none yet.

- [ ] **Step 4: Put the header pickers in a control row**

In `src/view/view.js:191`, `<div class="cluster cluster-sm">${pickers.join("")}</div>` becomes `<div class="control-row">${pickers.join("")}</div>`. (Same gap, `--space-2`; the triggers now share one height and bottom edge by contract.)

Run: `npm run test:e2e`. Expected: PASS, 28 layout cells plus the existing preferences tests. If the 320 px header measurements in `preferences.test.js` change, read the numbers before touching them: the header must still fit 320 px with 44 px triggers.

- [ ] **Step 5: Write the bundle test**

Create `scaffolds/web-vite/tests/bundle.test.js`:

```js
/* The layout audit is test-only: build the app and fail if it reached the bundle. */
import assert from "node:assert/strict"
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { after, test } from "node:test"
import { build } from "vite"

const outDir = mkdtempSync(join(tmpdir(), "bundle-"))
after(() => rmSync(outDir, { recursive: true, force: true }))

test("the production bundle never ships the layout audit", { timeout: 120_000 }, async () => {
	await build({ root: resolve(import.meta.dirname, ".."), logLevel: "silent", build: { outDir, emptyOutDir: true } })
	const files = readdirSync(outDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
	assert.ok(files.length > 0)
	for (const file of files) {
		assert.ok(!readFileSync(join(file.parentPath, file.name), "utf8").includes("auditLayout"), `${file.name} carries auditLayout`)
	}
})
```

Run: `npm test`. Expected: PASS.

- [ ] **Step 6: README**

In `scaffolds/web-vite/README.md`, `## Accessibility`, after the Puppeteer paragraph:

```markdown
`tests/e2e/layout.test.js` runs the layout audit (extracted from the workbench into `tests/e2e/layout-audit/`) over the real page: every width from 320 to 1920 px, 100 and 200 % text, both locales, plus WCAG 1.4.12 text spacing. A failure names the element and the measured numbers and saves an outlined screenshot to `test-results/`. Build rows of controls, switchers, row lists and card grids from the design system's layout primitives. `tests/bundle.test.js` fails if the audit reaches the build.
```

- [ ] **Step 7: Run the whole scaffold and commit**

Run in `scaffolds/web-vite`: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run a11y:scan` (after `npm run build` and `npm run preview`, as its README says). Expected: PASS. Root suite: PASS.

```bash
git add scaffolds/web-vite tools/scaffold-sync.test.mjs
git commit -m "Add the Puppeteer layout audit to web-vite"
```

### Task 12: csharp-wpf: 44 DIP controls, `Align.Contract`, `LayoutAudit`

About 60 minutes. Needs Windows with the .NET 10 SDK; workbench CI runs no `dotnet`, so a node guard covers the files on every PR.

**The "identity 2.0.0" check (done while writing this plan):** `tokens.xaml:9` and `:69-70` cite identity 2.0.0 for "42px control height". That was a deliberate 2.0.0 value (`docs/specs/2026-07-13-design-system-identity.md:54` and `:95-96`, design system CHANGELOG 2.0.0). Design system 2.0.2 (2026-08-13) reverted the web to a 44 px floor ("Controls return to a 44px floor", CHANGELOG lines 19 to 24) because 44 is the house standard from WCAG 2.5.5. `tokens.xaml` was hand-synced to 2.0.0 in `feb8828` and never re-synced, so 42 is stale drift, not a WPF decision. The fix is 44, and the comments must stop citing 2.0.0 for the height.

**Files:**
- Create: `scaffolds/csharp-wpf/MyApp/Layout/Align.cs`
- Create: `scaffolds/csharp-wpf/MyApp.Tests/Layout/WpfThread.cs`, `Layout/WpfGroup.cs`, `Layout/LayoutHost.cs`, `Layout/LayoutAudit.cs`, `MyApp.Tests/MainWindowLayoutTests.cs`
- Modify: `scaffolds/csharp-wpf/MyApp/MainWindow.xaml:1-3` and `:36-48`, `MyApp/Resources/tokens.xaml:9` and `:69-70`, `README.md`
- Create: `tools/csharp-wpf.test.mjs`

**Interfaces:**
- Consumes: `MainWindow`, `MainViewModel(Localizer, LanguageViewModel)`, `LanguageViewModel(Localizer, IPreferencesService, string culture)`, `Localizer.FromEmbedded()`, `IPreferencesService { Preferences Load(); void Save(Preferences); }`.
- Produces: `MyApp.Layout.AlignContract { None, Row }`; attached property `Align.Contract` (`Align.GetContract(DependencyObject)`, `Align.SetContract(DependencyObject, AlignContract)`); test helpers `WpfThread.Invoke<T>(Func<T>)`, `LayoutHost.Lay(Window, Size)` returning the laid-out root, `LayoutAudit.Check(FrameworkElement)` returning `AuditReport(int Contracts, IReadOnlyList<string> Violations)`.

v1 knows one contract, `Row`, because that is what the spec's WPF checker asserts (one `ActualHeight`, one bottom edge). Other contracts get an enum member and a check together when a WPF project needs them, so a marker can never pass unchecked.

- [ ] **Step 1: Node guard (failing)**

Create `tools/csharp-wpf.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// CI runs no dotnet (see csharp-locales.test.mjs), so this is the guard that sees a
// WPF layout regression on every pull request. dotnet test runs the real audit.
const WPF = join(import.meta.dirname, "..", "scaffolds", "csharp-wpf");
const read = (p) => readFileSync(join(WPF, p), "utf8").replaceAll("\r\n", "\n");

test("ControlHeight is at least 44, the house touch-target floor", () => {
	const tokens = read("MyApp/Resources/tokens.xaml");
	const value = Number(tokens.match(/<sys:Double x:Key="ControlHeight">([\d.]+)<\/sys:Double>/)?.[1]);
	assert.ok(value >= 44, `ControlHeight is ${value}, under 44`);
	assert.doesNotMatch(tokens, /42px control height/, "the header comment still cites the stale 42px");
});

test("MainWindow marks its control row, and the layout audit test exists", () => {
	const xaml = read("MyApp/MainWindow.xaml");
	assert.match(xaml, /layout:Align\.Contract="Row"/);
	assert.doesNotMatch(xaml, /Orientation="Horizontal"/, "a horizontal StackPanel never stretches its children to one height");
	for (const file of [
		"MyApp/Layout/Align.cs",
		"MyApp.Tests/Layout/WpfThread.cs",
		"MyApp.Tests/Layout/WpfGroup.cs",
		"MyApp.Tests/Layout/LayoutHost.cs",
		"MyApp.Tests/Layout/LayoutAudit.cs",
		"MyApp.Tests/MainWindowLayoutTests.cs",
	]) {
		assert.ok(existsSync(join(WPF, file)), `${file} is missing`);
	}
});
```

Run: `node --test tools/csharp-wpf.test.mjs`. Expected: FAIL, ControlHeight is 42.

- [ ] **Step 2: The attached property**

Create `scaffolds/csharp-wpf/MyApp/Layout/Align.cs`:

```csharp
using System.Windows;

namespace MyApp.Layout;

/// <summary>
/// Layout contracts a test can check, the WPF twin of the web data-align marker.
/// Row: the panel's children on one visual line share one height and one bottom
/// edge. A Grid with Auto columns and stretched children keeps it by construction;
/// a horizontal StackPanel does not.
/// </summary>
public enum AlignContract
{
    None,
    Row,
}

public static class Align
{
    public static readonly DependencyProperty ContractProperty = DependencyProperty.RegisterAttached(
        "Contract", typeof(AlignContract), typeof(Align), new PropertyMetadata(AlignContract.None));

    public static AlignContract GetContract(DependencyObject element)
    {
        ArgumentNullException.ThrowIfNull(element);
        return (AlignContract)element.GetValue(ContractProperty);
    }

    public static void SetContract(DependencyObject element, AlignContract value)
    {
        ArgumentNullException.ThrowIfNull(element);
        element.SetValue(ContractProperty, value);
    }
}
```

- [ ] **Step 3: The STA thread and its xUnit collection**

Create `scaffolds/csharp-wpf/MyApp.Tests/Layout/WpfThread.cs`:

```csharp
using System.Windows.Threading;

namespace MyApp.Tests.Layout;

/// <summary>
/// One STA thread with a running dispatcher and the app's resources loaded, shared
/// by every layout test. WPF objects belong to the thread that made them, and an
/// Application can exist once per process, so tests post their work here instead
/// of building views on xUnit's pool threads.
/// </summary>
public sealed class WpfThread : IDisposable
{
    private readonly Thread _thread;
    private readonly TaskCompletionSource<Dispatcher> _started = new();

    public WpfThread()
    {
        _thread = new Thread(() =>
        {
            try
            {
                // App.xaml merges tokens.xaml. InitializeComponent loads it without
                // running OnStartup, so no window opens and no settings file is touched.
                new App().InitializeComponent();
                _started.SetResult(Dispatcher.CurrentDispatcher);
            }
            catch (Exception ex)
            {
                _started.SetException(ex);
                return;
            }
            Dispatcher.Run();
        });
        _thread.SetApartmentState(ApartmentState.STA);
        _thread.IsBackground = true;
        _thread.Start();
    }

    private Dispatcher UiDispatcher => _started.Task.GetAwaiter().GetResult();

    public T Invoke<T>(Func<T> work) => UiDispatcher.Invoke(work);

    public void Dispose()
    {
        UiDispatcher.InvokeShutdown();
        _thread.Join();
    }
}
```

(If an analyzer flags the general `catch`, keep the behaviour: it is how a XAML load error reaches the test instead of hanging it. Rewrite as `catch (Exception ex) when (_started.TrySetException(ex)) { return; }`, never a suppression.)

Create `scaffolds/csharp-wpf/MyApp.Tests/Layout/WpfGroup.cs`:

```csharp
namespace MyApp.Tests.Layout;

/// <summary>Every test that builds WPF views shares one WpfThread.</summary>
[CollectionDefinition(Name)]
public sealed class WpfGroup : ICollectionFixture<WpfThread>
{
    public const string Name = "WPF";
}
```

- [ ] **Step 4: Lay out a window without showing it**

Create `scaffolds/csharp-wpf/MyApp.Tests/Layout/LayoutHost.cs`:

```csharp
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;

namespace MyApp.Tests.Layout;

/// <summary>
/// Lays a window's content out at a given window size without showing it. A
/// window that was never shown does not arrange its content, so the content moves
/// into a host that carries what the window passed down (font, language, data
/// context, names) and is laid out at the client size: the window size minus the
/// frame Windows draws around it on this machine, as the real window would. No
/// screen and no shown window, so it runs the same in a CI session with no desktop.
/// </summary>
public static class LayoutHost
{
    public static FrameworkElement Lay(Window window, Size windowSize)
    {
        ArgumentNullException.ThrowIfNull(window);
        var frame = SystemParameters.WindowNonClientFrameThickness;
        var client = new Size(
            windowSize.Width - frame.Left - frame.Right,
            windowSize.Height - frame.Top - frame.Bottom);

        var content = (FrameworkElement)window.Content;
        window.Content = null;
        var host = new Border
        {
            Child = content,
            Background = window.Background,
            DataContext = window.DataContext,
            Language = window.Language,
        };
        NameScope.SetNameScope(host, NameScope.GetNameScope(window));
        TextElement.SetFontFamily(host, window.FontFamily);
        TextElement.SetFontSize(host, window.FontSize);
        TextElement.SetForeground(host, window.Foreground);

        host.Measure(client);
        host.Arrange(new Rect(client));
        host.UpdateLayout();
        return host;
    }
}
```

- [ ] **Step 5: The audit**

Create `scaffolds/csharp-wpf/MyApp.Tests/Layout/LayoutAudit.cs`:

```csharp
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using MyApp.Layout;

namespace MyApp.Tests.Layout;

public sealed record AuditReport(int Contracts, IReadOnlyList<string> Violations);

/// <summary>
/// The WPF half of workbench libraries/layout-audit. Walks the visual tree for
/// Align.Contract elements and checks each with a 1 DIP tolerance. Row: per
/// visual line of a panel's children, one ActualHeight and one bottom edge
/// (via TranslatePoint), and every control at least 44 DIP tall.
/// </summary>
public static class LayoutAudit
{
    public const double Tolerance = 1.0;
    public const double ControlFloor = 44.0;

    public static AuditReport Check(FrameworkElement root)
    {
        ArgumentNullException.ThrowIfNull(root);
        var violations = new List<string>();
        var contracts = 0;
        foreach (var element in Descendants(root))
        {
            if (Align.GetContract(element) != AlignContract.Row || !IsShown(element, root))
            {
                continue;
            }
            contracts++;
            if (element is Panel panel)
            {
                CheckRow(panel, violations);
            }
            else
            {
                violations.Add(Say($"Row: {NameOf(element)} is not a Panel; the contract measures a panel's children"));
            }
        }
        return new AuditReport(contracts, violations);
    }

    private static void CheckRow(Panel panel, List<string> violations)
    {
        var boxes = panel.Children.OfType<FrameworkElement>()
            .Where(child => child.Visibility == Visibility.Visible && child.ActualHeight > 0)
            .Select(child => (Element: child, Top: child.TranslatePoint(new Point(0, 0), panel).Y))
            .OrderBy(box => box.Top)
            .ToList();

        foreach (var line in Lines(boxes))
        {
            foreach (var (element, _) in line.Where(box => IsControl(box.Element) && box.Element.ActualHeight < ControlFloor - Tolerance))
            {
                violations.Add(Say($"Row {NameOf(panel)}: {NameOf(element)} is {element.ActualHeight:0.#} DIP tall, under {ControlFloor} DIP"));
            }
            if (line.Count < 2)
            {
                continue;
            }
            var heights = line.Select(box => box.Element.ActualHeight).ToList();
            var bottoms = line.Select(box => box.Top + box.Element.ActualHeight).ToList();
            if (heights.Max() - heights.Min() > Tolerance || bottoms.Max() - bottoms.Min() > Tolerance)
            {
                violations.Add(Say($"Row {NameOf(panel)}: {heights.Max():0.#} vs {heights.Min():0.#} DIP tall, bottoms {bottoms.Max() - bottoms.Min():0.#} DIP apart"));
            }
        }
    }

    // Children whose vertical extents overlap share a visual line. Input is sorted by Top.
    private static List<List<(FrameworkElement Element, double Top)>> Lines(List<(FrameworkElement Element, double Top)> boxes)
    {
        var lines = new List<List<(FrameworkElement Element, double Top)>>();
        var lineBottom = double.NegativeInfinity;
        foreach (var box in boxes)
        {
            if (lines.Count == 0 || box.Top >= lineBottom - Tolerance)
            {
                lines.Add([]);
                lineBottom = double.NegativeInfinity;
            }
            lines[^1].Add(box);
            lineBottom = Math.Max(lineBottom, box.Top + box.Element.ActualHeight);
        }
        return lines;
    }

    private static bool IsControl(FrameworkElement element) =>
        element is ButtonBase or TextBoxBase or ComboBox or PasswordBox;

    private static bool IsShown(FrameworkElement element, FrameworkElement root)
    {
        for (DependencyObject? node = element; node is not null && node != root; node = VisualTreeHelper.GetParent(node))
        {
            if (node is UIElement { Visibility: not Visibility.Visible })
            {
                return false;
            }
        }
        return root.Visibility == Visibility.Visible;
    }

    private static IEnumerable<FrameworkElement> Descendants(DependencyObject parent)
    {
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(parent); i++)
        {
            var child = VisualTreeHelper.GetChild(parent, i);
            if (child is FrameworkElement element)
            {
                yield return element;
            }
            foreach (var nested in Descendants(child))
            {
                yield return nested;
            }
        }
    }

    private static string NameOf(FrameworkElement element) =>
        string.IsNullOrEmpty(element.Name) ? element.GetType().Name : $"{element.GetType().Name} \"{element.Name}\"";

    private static string Say(FormattableString message) => message.ToString(CultureInfo.InvariantCulture);
}
```

- [ ] **Step 6: The test**

Create `scaffolds/csharp-wpf/MyApp.Tests/MainWindowLayoutTests.cs`:

```csharp
using System.Globalization;
using System.Windows;
using MyApp.Models;
using MyApp.Services;
using MyApp.Tests.Layout;
using MyApp.ViewModels;

namespace MyApp.Tests;

/// <summary>
/// Lays MainWindow out in both locales at its own minimum and default sizes,
/// at 960 x 540 DIP (a 1080p screen at 200 % display scale) and at 1920 x 1080,
/// then checks every Align.Contract element. The only test that touches a View.
/// </summary>
[Collection(WpfGroup.Name)]
public class MainWindowLayoutTests(WpfThread wpf)
{
    public static TheoryData<string, string> Cells()
    {
        var data = new TheoryData<string, string>();
        foreach (var locale in new[] { "en-US", "nb-NO" })
        {
            foreach (var size in new[] { "minimum", "default", "960x540", "1920x1080" })
            {
                data.Add(locale, size);
            }
        }
        return data;
    }

    [Theory]
    [MemberData(nameof(Cells))]
    public void MainWindow_keeps_its_layout_contracts(string locale, string size)
    {
        var report = wpf.Invoke(() =>
        {
            var localizer = Localizer.FromEmbedded();
            var window = new MainWindow
            {
                DataContext = new MainViewModel(localizer, new LanguageViewModel(localizer, new MemoryPreferences(), locale)),
            };
            return LayoutAudit.Check(LayoutHost.Lay(window, SizeOf(window, size)));
        });

        Assert.True(report.Contracts > 0, "no Align.Contract element found: the audit checked nothing");
        Assert.Empty(report.Violations);
    }

    private static Size SizeOf(Window window, string size)
    {
        if (size == "minimum")
        {
            return new Size(window.MinWidth, window.MinHeight);
        }
        if (size == "default")
        {
            return new Size(window.Width, window.Height);
        }
        var parts = size.Split('x');
        return new Size(double.Parse(parts[0], CultureInfo.InvariantCulture), double.Parse(parts[1], CultureInfo.InvariantCulture));
    }

    private sealed class MemoryPreferences : IPreferencesService
    {
        public Preferences Load() => new();

        public void Save(Preferences preferences)
        {
        }
    }
}
```

- [ ] **Step 7: Mark the row as it is today and watch it fail**

In `MyApp/MainWindow.xaml`, add `xmlns:layout="clr-namespace:MyApp.Layout"` to the `<Window>` element, and add `layout:Align.Contract="Row"` to the existing `<StackPanel Grid.Column="1" Orientation="Horizontal">` (line 36). Nothing else yet.

Run from `scaffolds/csharp-wpf`: `dotnet test`
Expected: FAIL in all 8 cells. Each lists a Row violation for the label next to the picker (a centred `TextBlock` about 19 DIP tall beside a 42 DIP `ComboBox`), and, unless the ComboBox template renders taller, a floor violation at 42 DIP. Read the numbers; they are the "before" for the PR.

- [ ] **Step 8: Fix the row and the token**

Replace the `StackPanel` block (lines 36 to 48) with:

```xml
      <!-- A Grid, not a horizontal StackPanel: children stretch to the row's height,
           so the label and the picker share one height and one bottom edge.
           Align.Contract="Row" is what MainWindowLayoutTests checks. -->
      <Grid Grid.Column="1" layout:Align.Contract="Row">
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="Auto"/>
          <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        <Label x:Name="LanguageLabel"
               Grid.Column="0"
               Content="{Binding Language.Title}"
               Target="{Binding ElementName=LanguagePicker}"
               FontSize="{StaticResource TextSm}"
               Foreground="{StaticResource TextMuted}"
               Padding="0,0,8,0"
               VerticalContentAlignment="Center"/>
        <ComboBox x:Name="LanguagePicker"
                  Grid.Column="1"
                  ItemsSource="{Binding Language.Options}"
                  SelectedItem="{Binding Language.Selected}"
                  DisplayMemberPath="Label"
                  AutomationProperties.LabeledBy="{Binding ElementName=LanguageLabel}"
                  MinWidth="180"/>
      </Grid>
```

(A `Label` stretches with the row and centres its text; a `TextBlock` either stretches with its text at the top or centres at its own height. `Label` treats `_` as an access-key marker; the language titles have none.)

In `MyApp/Resources/tokens.xaml`:
- line 9: `identity 2.0.0: crisp shape (6px controls, 42px control height),` becomes `identity 2.0.0 shape (6px controls), 44px control floor (design system 2.0.2),`
- lines 69 and 70 become:

```xml
  <!-- Control height: the 44px floor of design system 2.0.2+ (identity 2.0.0 had 42).
       Used as MinHeight, so a control grows with its content but never drops below it. -->
  <sys:Double x:Key="ControlHeight">44</sys:Double>
```

Run: `dotnet test`. Expected: PASS, the 23 existing tests plus 8 layout cells.
Run: `node --test tools/csharp-wpf.test.mjs` from the workbench root. Expected: PASS.

- [ ] **Step 9: Look at it**

Run the app (`dotnet run --project MyApp`), switch to Norsk, and check the header row at the minimum window size. Screenshot it for the PR. Also check that Narrator reads the picker with its label, since the label element changed.

- [ ] **Step 10: README**

In `scaffolds/csharp-wpf/README.md`, under `## Working rules`, add:

```markdown
- **Layout contracts.** Controls side by side go in a `Grid` with `Auto` columns, never a horizontal `StackPanel`, and the Grid gets `layout:Align.Contract="Row"`. `MainWindowLayoutTests` lays each window out at its minimum and default sizes, at 960 x 540 DIP (1080p at 200 % scale) and at 1920 x 1080, in every locale, and fails if a marked row's children differ in height or bottom edge, or a control is under 44 DIP (`ControlHeight` in `tokens.xaml`). Equal-width button bars use `UniformGrid Rows="1"`; lists and label columns use `Grid.IsSharedSizeScope` with `SharedSizeGroup`. Add every new window to the test's cells.
```

- [ ] **Step 11: Commit, push, open PR B**

```bash
git add scaffolds/csharp-wpf tools/csharp-wpf.test.mjs
git commit -m "Fix WPF controls to 44 DIP and audit MainWindow's control row"
git push -u origin feat/layout-scaffolds
```

Open the PR against `feat/layout-by-construction` with title `Layout by construction: scaffolds adopt the primitives and the audit`. Body: what each scaffold gained, test counts read off the runs, the WPF before and after numbers from Step 7 and Step 8 plus the screenshot, and "Stacked on PR A. Merge is mine." No AI attribution.

---

## PR C: loadout standard

### Task 13: `standards/layout.md` and pointers

About 30 minutes. Loadout is my live config (junctioned into `~/.claude`), so this happens in a separate git worktree. Never switch branches in the live clone at `C:\Users\Nugget\Documents\Development\GitHub\repos\loadout`.

**Files (in the loadout worktree):**
- Create: `standards/layout.md`
- Modify: `CLAUDE.md:1` and the `### Visual correctness` section, `lib/Loadout.psm1:7`, `tests/Manifest.Tests.ps1:16`, `skills/write-code/SKILL.md`, `skills/review-code/SKILL.md`, `skills/mobile-first-css/SKILL.md`, `skills/mobile-first-css/references/breakpoints.md`, `skills/design-system-sync/references/ds-map.md`

**Interfaces:**
- Consumes: the primitive names, the contract table and the pre-show steps from PR A (`libraries/layout-audit/README.md`).
- Produces: nothing code-facing.

- [ ] **Step 1: Worktree**

```bash
git -C "C:/Users/Nugget/Documents/Development/GitHub/repos/loadout" fetch origin
git -C "C:/Users/Nugget/Documents/Development/GitHub/repos/loadout" worktree add "C:/Users/Nugget/Documents/Development/GitHub/repos/loadout-layout-standard" -b docs/layout-standard origin/main
cd "C:/Users/Nugget/Documents/Development/GitHub/repos/loadout-layout-standard"
```

- [ ] **Step 2: Manifest test first (failing)**

In `tests/Manifest.Tests.ps1:16`, add `'standards/layout.md'` to the `$expected` array after `'standards/fable-mode.md'`.
Run: `pwsh -NoProfile -Command "Invoke-Pester tests/Manifest.Tests.ps1"`. Expected: FAIL, `standards/layout.md` is not tracked.

- [ ] **Step 3: Write `standards/layout.md`**

```markdown
# Layout: decided per group, never per item

Ragged UI comes from items that each decide for themselves: one label wraps, one row's name is longer. My design system has primitives that make the decision once for the whole group, and each primitive's class is also a test contract that `layout-audit` checks in a browser. Spec: `docs/superpowers/specs/2026-10-15-layout-by-construction-design.md`.

## Reach for a primitive first

| When I have | Use | Contract (1 px tolerance) |
|---|---|---|
| Controls side by side | `.control-row` (`<ControlRow>`) | Per visual row: one height, one bottom edge |
| A few equal choices that stack on narrow screens | `.switcher` (`<Switcher>`) | All in one row, or all stacked |
| A list of rows with actions | `.row-list` (`<RowList>`) | One arrangement, one left edge for actions |
| Cards whose parts should line up | `.card-grid` + `.card` (`<CardGrid>`, `<Card>`) | Slot k on one row shares one top edge |
| A label beside its value | `dt` / `dd`, or `data-align="label"` | Label differs in weight, size or colour |
| Custom markup that must hold a contract | `data-align="row|switch|rows|slots|label"` | Same as the primitive |

Every control inside a primitive is at least 44 px (`--control-height`; WPF `ControlHeight`). No `order`, `row-reverse` or `column-reverse`: visual order is DOM order. Collapse by intrinsic sizing first, then container queries, then `min-width` viewport breakpoints.

WPF: a `Grid` with `Auto` columns plus `layout:Align.Contract="Row"`, never a horizontal `StackPanel` of controls; `UniformGrid Rows="1"` for equal button bars; `Grid.IsSharedSizeScope` with `SharedSizeGroup` for lists and label columns.

## Review finding

A row of controls hand-rolled with Tailwind utilities (`flex gap-2`) or a horizontal `StackPanel` when a primitive fits is a finding. So is a new `max-width` media query in shared CSS.

## Before showing me UI

Run the audit on the live preview first, in the browser pane:

1. `resize_window` to 320 x 800 (the pane reports 0 x 0 until a size is set).
2. Read the project's `audit.js` (`e2e/layout-audit/` or `tests/e2e/layout-audit/`) and run its text with `javascript_tool`, then `auditLayout(document, { mark: true })`.
3. Repeat at 1280 px, and at 320 px with `document.documentElement.style.fontSize = "200%"`.
4. Fix every violation not on the project's known list before I see the screen. If a fix is a judgment call, screenshot the red outlines and ask me.

The project's own `test:e2e` (web) or `dotnet test` (WPF) runs the full matrix; this pre-show pass is the quick version, not a substitute.

Run it on seed or fixture data. Screenshots from the pane go to Anthropic, so never audit or screenshot a page that shows a real account, a real person's details or anything tier 1 under my local-only rule; switch the preview to seed data first, or stop and ask.

## Existing projects

Syncing a project to design system 3.10.0 or later is an adoption. Before any change: run the audit read-only on a branch, then show me before and after screenshots per violation, the files touched, which screens move and the risks. Nothing merges without my yes.
```

- [ ] **Step 4: One pointer line in `CLAUDE.md`, version bump**

In `CLAUDE.md`, under `### Visual correctness`, after the "Two rules I keep repeating" list, add one line:

```markdown
**Layout by construction:** reach for a design system layout primitive before hand-rolling a row, and run the layout audit on the preview before showing me UI. Detail: `standards/layout.md`.
```

Bump the heading from `(v0.6.2)` to `(v0.7.0)` in `CLAUDE.md:1` and `lib/Loadout.psm1:7` together (the heading is a smoke-test constant).

- [ ] **Step 5: Skill links**

- `skills/write-code/SKILL.md`: in its web/CSS guidance, add a line: `Layout: use the design system primitives (control-row, switcher, row-list, card-grid) and their React components; see standards/layout.md.`
- `skills/review-code/SKILL.md`: in its checklist, add: `Layout: a row of controls hand-rolled with Tailwind utilities or a horizontal StackPanel when a primitive fits is a finding (standards/layout.md).`
- `skills/mobile-first-css/SKILL.md` and `references/breakpoints.md`: add the order `intrinsic sizing first (auto-fit, flex wrap, min()), then container queries, then the 768/1024 min-width breakpoints`, and note that the design system's grids no longer use viewport breakpoints.
- `skills/design-system-sync/references/ds-map.md`: list `--control-height`, `--weight-label`, `.control-row`, `.switcher`, `.row-list`, `.card-grid` (+ `--card-min`, `--card-slots`), `data-align`, and `libraries/layout-audit` as the checker.

Match each file's existing format. No em dashes.

- [ ] **Step 6: Tests and health check**

Run: `pwsh -NoProfile -Command "Invoke-Pester tests"`. Expected: PASS, every test (the count goes up by one assertion target, not by a test).
Run `git diff origin/main | grep -n $'\u2014'` and confirm it prints nothing: no new em dash.

- [ ] **Step 7: Commit, push, open PR C**

```bash
git add standards/layout.md CLAUDE.md lib/Loadout.psm1 tests/Manifest.Tests.ps1 skills
git commit -m "Add the layout standard and point CLAUDE.md and four skills at it"
git log origin/main..HEAD --format="%h %ae %s"
git push -u origin docs/layout-standard
```

Before the push, the log must show only commits authored `malinfossum.dev@proton.me`. Respawn's 30-minute checkpoint has swept edits into a `respawn@localhost` commit before; if one appears, re-author it (`git reset --soft origin/main`, commit again) and only then push.

Open the PR in `malinfossum/loadout`, title `Layout by construction: the standard`. Body: the new file, the pointer line, the four skill edits, Pester count read off the run, and "After merge: git pull in the live clone, then install.ps1 and verify.ps1." After it merges: `git worktree remove` the worktree, then in the live clone `git pull`, `./install.ps1`, `./verify.ps1`.

---

### Task 14: Release (only on my go)

About 15 minutes, after PR A and PR B are merged.

- [ ] **Step 1:** On `main`, run the root suite, `cd libraries/layout-audit && npm ci && npm test`, and each scaffold's suites. Expected: PASS.
- [ ] **Step 2:** Tag `v2.22.0` with an annotation that lists design system 3.10.0, layout-audit 1.0.0, the scaffold changes and the WPF 44 DIP fix. Push the tag.
- [ ] **Step 3:** `gh release create v2.22.0 --verify-tag --latest` with notes written from the annotation. A pushed tag is not a Release; cut both in the same motion.
- [ ] **Step 4:** Update `~/.claude/memory/domain/workbench.md` with a SHIPPED entry and the next step: the Varde adoption preview (spec Part 4, step 4), only when I ask.

---

## Stress test findings (folded in above)

- 🟠 Privacy: the pre-show audit screenshots the live preview, and the pane sends screenshots to Anthropic. Fixed: `standards/layout.md` says seed or fixture data only, never a page with a real account or tier-1 data (Task 13).
- 🟠 Loopholes: a known entry like `main` would silence every violation on the page. Fixed: `matchKnown` refuses a selector that matches `html`, `body` or `main`. Proof: `adapter.spec.js`, "a known entry that covers the whole page is refused" (Task 7).
- 🟠 Loopholes: a card with more parts than `--card-slots` overlaps its last slot, because a subgrid has no implicit rows. Fixed: `checkSlots` reports it. Proof: `#bad-slot-card` in `fixtures/bad.html` (Task 6).
- 🟠 Loopholes (guard that can go red unseen): a new CI job that is not a required check can fail and still be merged. Fixed: Task 9 Step 9 asks me whether to make `layout-audit` required, after its first green run.
- 🟡 Privacy: CI failure artifacts kept the default 90 days. Fixed: `retention-days: 7`.
- 🟡 Privacy: `dotnet` sends telemetry unless opted out. Fixed: a Global Constraint to confirm `DOTNET_CLI_TELEMETRY_OPTOUT=1` before Task 12.
- 🟡 Loopholes: review fixes on PR A could leave the stacked PR B testing a stale design system. Fixed: a Global Constraint to merge them forward before the next scaffold task.
- 🟡 Loopholes: Respawn's checkpoint has swept loadout edits into a `respawn@localhost` commit before. Fixed: Task 13 Step 7 checks commit authors before the push.
- 🟡 Accessibility: `<Card>` renders `<article>`, which is wrong for a panel that is not self-contained. Fixed: the component comment says when to use a plain `div.card` instead.
- 🟡 Loopholes: the `LayoutHost` comment claimed identical numbers on every machine, but the window frame size comes from the machine. Fixed: the comment now says what is and is not machine-independent.
- 🟡 Loopholes: a row-list row with three children wraps the third under the second. Fixed: the CSS comment states two children per row, with several actions wrapped in one element.
- ✅ Security: one new devDependency (Apache-2.0, lockfile, Dependabot entry); the self-test server binds 127.0.0.1 and rejects paths outside the repo; the audit never writes HTML, only one constant attribute and one style element.
- ✅ Legal: Every Layout is credited by title for ideas only, with no code copied; fixtures use public helpline numbers and made-up service text; workbench already has a LICENSE.

**Considered and rejected**
- **`bypassCSP` in the layout tests.** It could hide a CSP regression, but the audit must inject a script and a style. CSP belongs to its own test, not to a layout check.
- **First-party actions pinned by tag, not SHA.** This matches the existing `ci.yml` and Ward's Dependabot policy for `actions/*`.
- **Symlinks in the self-test server.** `normalize` does not resolve links. The server serves the repo on loopback during a test run only, and the repo has no links that point outside it.
- **Lazy images below the fold changing layout after load.** A real page should set image dimensions; the audit reports the layout it sees and does not wait for images.
- **A broad tag selector such as `div` in the known list.** Only the page roots are refused. A broad tag still shows up in review, and the reason field makes it visible.
- **`checkLang` cannot tell that an app set `<html lang>` but still renders English.** Catching that needs per-project text, which is out of scope for a layout check.

> Stress-tested 2026-10-15 (skill 1b85fca): 11 applied, 0 adapted, 0 decided by me.
