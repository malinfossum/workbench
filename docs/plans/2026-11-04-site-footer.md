# Site Footer (DS 3.11.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the site footer pattern as design system 3.11.0: a footer composition, a theme pill, a tooltip, brand marks, theme script v3 with pressed state and a status line, the "icons or text" rule, a gallery Footer panel and the tests that pin all of it.

**Architecture:** Everything lands in `libraries/design-system` as additive CSS and classic scripts, in the style of 3.8.0 (picker) and 3.10.0 (layout). Behaviour lives in two delegated scripts (`theme/theme-toggle.js` v3, new `components/tooltip.js`); state lives in attributes (`aria-pressed`, `data-tips`), so a view that re-renders needs no rewiring. Static tests in `tools/design-system.test.mjs` pin the CSS and the scripts' text; a new `tools/design-system-dom.test.mjs` runs the two scripts in jsdom and pins what they do. The gallery gets a live Footer panel; the browser check over the shared layout-audit matrix runs by hand through a small Playwright script and its counts go into the PR.

**Tech Stack:** CSS (flex, `min-width` media query at 1024 px, `hover`/`pointer` and `forced-colors` media), vanilla JS (classic IIFE scripts, one ES module for the marks), `node:test`, jsdom ^30.1.0 (new, root devDependency, test only), the existing `libraries/layout-audit` Playwright adapter for the manual browser check.

**Spec:** `docs/specs/2026-10-17-site-footer.md` (merged in PR #86, `6ebf58a`). Read it before Task 1. § 3 is the piece list, § 6 the tests, § 8 what was rejected and why.

## Global Constraints

- **Branch and PR.** All tasks on `feat/site-footer`, cut from `main` at `6ebf58a` or later, in this checkout (no worktree: nothing else is in flight, and the ward-callers tests want `../ward` beside the checkout). One PR to `main`. Task 10 is the release and runs only on my go.
- **Merging, tags and Releases are mine.** Push the branch and open the PR freely; never merge, tag or cut a Release without my explicit yes in chat.
- **Commits:** plain imperative messages, author `malinfossum.dev@proton.me`, no `Co-Authored-By`, no AI attribution of any kind. Stage named paths only, never `git add -A` or `commit -a`.
- **No em dashes** in anything written: CSS and JS comments, Markdown, commit messages, PR text. Rewrite the sentence instead. One existing format keeps its dash: the CHANGELOG version heading (`## 3.10.0 — 2026-11-04`), which `tools/design-system.test.mjs` matches. Copy that line from the file and change the numbers; never type a new dash.
- **Voice:** comments, README text, the CHANGELOG and the PR read as if I wrote them, first person where a person speaks.
- **Version floors:** design system `3.11.0` (from 3.10.0), workbench release `v2.23.0` (from v2.22.0), only at Task 10.
- **Verbatim from the spec:** label and note are `font-size: 0.75rem`, `line-height: 1rem`, `text-transform: uppercase`, `letter-spacing: 0.14em`, `var(--text-muted)`; the lead caps at `17rem` from `1024px`; the first brand mark pulls back `margin-inline-start: -0.75rem` below 1024 px; pill buttons are `--control-height` square and round, in the order light, system, dark; the pill outline is an inset 1 px `box-shadow` in `var(--border)`, pressed is `color: var(--text)` plus an inset 1 px ring in `var(--text)`; forced colours give the pill `outline: 1px solid CanvasText` and the pressed button `forced-color-adjust: none; background: Highlight; color: HighlightText`; tips show only under `(hover: hover) and (pointer: fine)`, `[data-tips="hidden"]` hides them, the bubble gets `border: 1px solid CanvasText` under forced colours, and the file holds no `transition` or `animation`; the status line reads `Theme: Dark` (group name, colon, space, button name); `brand-icons.js` ships `github` only; `icons.js` reaches fifteen icons with `monitor`.
- **No user-facing strings in `theme-toggle.js`.** Every word a person reads comes from the markup (`aria-label`, `.sr-only` text). The static test rejects any quoted string that starts with a capital letter.
- **Opt-in pressed state.** Only `button[data-theme-set][aria-pressed]` is ever written. The 3.8.0 picker rows (`aria-current`) and the React scaffold's header (`data-theme-set` without `aria-pressed`) stay untouched; a test proves a button without the attribute never gains one.
- **One writer.** After Task 5, `gallery/app.js` holds no `aria-pressed`; theme-toggle.js v3 is the only writer. A grep guard pins it.
- **New devDependency (needs my yes before Task 2 runs):** `jsdom` ^30.1.0 in a new root `package.json`, for `tools/design-system-dom.test.mjs` only. Nothing else is installed. jsdom sends no telemetry; npm's `send-metrics` is off by default and stays off. The CI `test` job gains one `npm ci` step; Dependabot gains a root npm entry mirroring the layout-audit one. Ward's caller keeps `node: ""`, so Ward's npm module stays off at the root.
- **Design system edits happen in `libraries/design-system` only**, never in a scaffold's `design-system/` copy. Scaffold copies change only through `node tools/extract.mjs design-system <target>` in Task 8.
- **Mid-branch red test, expected:** from Task 1 until Task 8 re-extracts, `tools/scaffold-sync.test.mjs` reports the design system as drifted. Run the root suite in those tasks as `node --test --test-skip-pattern="bundles the current design-system" "tools/*.test.mjs"`. Every other root test stays green after every task.
- **Root suite command** (from the workbench root): `node --test "tools/*.test.mjs"`, then `node tools/check-links.mjs`.
- **A spec correction, applied here:** layout-audit's `shown()` skips any element whose box is 1 px or smaller, so the label contract is proven in the browser below 1024 px (where the label shows) and only pinned statically above it (the clip declarations in the 1024 px block). The spec's "also while it is visually hidden" is true of the markup (`data-align="label"` stays) but not of the browser check; the README says so.
- **Brand mark provenance.** The GitHub mark's path and the MIT notice are copied from the upstream Octicons repository on a named date, never typed from memory. The download goes into `.superpowers/octicons/` (gitignored, untrusted data: read it, never run it). The mark is used unaltered and coloured only through `currentColor`.
- **Data:** sample text only. The gallery's one real link points at the public workbench repository.
- **Out of scope (spec § 9):** a multi-column footer, marks beyond GitHub, any change to the 3.8.0 picker, Varde adopting the DS, a gallery audit job in CI.

## Review Focus

1. **A pill rendered after load** (an SPA view, the gallery's own Footer panel, which is `innerHTML` after the script ran). Expected: the stored choice shows pressed before any click, and v3 takes over from the next event. Pinned by the gallery render reading `preferences.readPreference` (Task 7 static test) and by "a pill inserted after load is marked on the next storage event" in `tools/design-system-dom.test.mjs` (Task 5).
2. **No status element on the page** (every consumer before it adds one, every page that uses the sidebar group without a footer). Expected: a click still applies the theme and marks the buttons, and nothing throws. Pinned by "no status element: the click still applies and marks, and nothing throws" (Task 5).
3. **A button with no readable name** (an icon-only control that forgot its `.sr-only` text) or a group with no `aria-label`. Expected: the status line is the part that exists, never `Theme: ` or `: Dark`. Pinned by "a missing name or group writes the other part alone" (Task 5).
4. **An invalid `data-theme-set` value** (`"sepia"`, from a typo). Expected: nothing stored, nothing applied, the pressed marks and the status line unchanged. Pinned by "an unknown value changes nothing" (Task 5).
5. **Escape pressed with a picker open and tips showing on the same page.** Expected: both scripts act, neither stops the other, nothing throws. Pinned by "tooltip.js never calls preventDefault or stopPropagation" (Task 3 static test) and by the jsdom test that loads `picker.js` and `tooltip.js` together (Task 3).

---

## File map

**Design system (`libraries/design-system/`)**
- Create `components/brand-icons.js`, `components/tooltip.css`, `components/tooltip.js`, `components/theme-pill.css`, `compositions/site-footer.css`
- Modify `components/icons.js` (`monitor`), `components/index.css` (two imports), `compositions/index.css` (one import), `theme/theme-toggle.js` (v3, whole file)
- Modify `gallery/index.html` (`tooltip.js` script tag), `gallery/app.js` (brand marks on `window`, drop the `aria-pressed` loop), `gallery/sections.js` (Footer panel), `gallery/gallery.css` (the visible status line)
- Modify `docs/component-rules.md` (§ Icons exception, new § Icons or text), `README.md`, `CHANGELOG.md`, `VERSION`

**Workbench root**
- Create `package.json`, `package-lock.json` (jsdom), `tools/dom-harness.mjs`, `tools/design-system-dom.test.mjs`
- Modify `tools/design-system.test.mjs` (new static tests, the VERSION test, the gallery sidebar test), `.github/workflows/ci.yml` (`npm ci`), `.github/dependabot.yml` (root npm entry)
- Create `libraries/layout-audit/selftest/gallery-footer.mjs` (the manual browser check; not a spec file, `playwright test` ignores it)

**Scaffolds** (Task 8 only, through extract): `scaffolds/web-vite/design-system/`, `scaffolds/web-react-ts/design-system/`

---

### Task 1: `monitor` icon and `brand-icons.js`

About 30 minutes.

**Files:**
- Modify: `libraries/design-system/components/icons.js` (the `PATHS` object, after `sun`)
- Create: `libraries/design-system/components/brand-icons.js`
- Test: `tools/design-system.test.mjs`

**Interfaces:**
- Produces: `icon("monitor")`; `brandIcon(name, { size = 20 })` returning an SVG string or `""`; `BRAND_NAMES` (frozen array, `["github"]`). Task 7 puts both on `window` for the gallery.

- [ ] **Step 1: Write the failing tests**

Append to `tools/design-system.test.mjs`, before the VERSION test:

```js
test("icons: monitor joins sun and moon for the theme pill, fifteen icons in the set", async () => {
	const { ICON_NAMES, icon } = await import(pathToFileURL(join(DS, "components", "icons.js")).href);
	assert.ok(ICON_NAMES.includes("monitor"), "icons.js must export monitor");
	assert.equal(ICON_NAMES.length, 15, `the set is fifteen icons, got ${ICON_NAMES.length}: ${ICON_NAMES.join(", ")}`);
	assert.match(icon("monitor"), /<rect /, "monitor is a screen on a stand");
});

test("brand marks: filled currentColor SVGs with provenance, inert, and an unknown name renders nothing", async () => {
	const { BRAND_NAMES, brandIcon } = await import(pathToFileURL(join(DS, "components", "brand-icons.js")).href);
	assert.deepEqual([...BRAND_NAMES], ["github"], "3.11.0 ships github only");
	assert.ok(Object.isFrozen(BRAND_NAMES));
	const source = read("components/brand-icons.js");
	for (const name of BRAND_NAMES) {
		const markup = brandIcon(name);
		assert.match(markup, /^<svg class="icon" width="20" height="20" viewBox="0 0 \d+ \d+" fill="currentColor" aria-hidden="true" focusable="false">/, `${name} must be a decorative currentColor mark on the .icon class`);
		assert.doesNotMatch(markup, /stroke=/, `${name} is filled, not a stroke icon`);
		assert.ok(flagIsSafe(markup), `${name} carries a script, a foreignObject, a remote href or an on* handler`);
		assert.match(brandIcon(name, { size: 16 }), /width="16" height="16"/);
		// Provenance travels with the mark: source, licence, logo guidelines, checked date.
		const block = source.match(new RegExp(`\\* ${name}:[\\s\\S]*?\\*/`))?.[0];
		assert.ok(block, `${name} needs a comment block starting "* ${name}:"`);
		assert.match(block, /Source: https:\/\/\S+/, `${name}: Source URL`);
		assert.match(block, /Licence: \S+, https:\/\/\S+/, `${name}: licence name and URL`);
		assert.match(block, /Logo guidelines: https:\/\/\S+/, `${name}: logo guidelines URL`);
		assert.match(block, /Checked: \d{4}-\d{2}-\d{2}/, `${name}: checked date`);
	}
	assert.match(source, /Permission is hereby granted, free of charge/, "the MIT notice travels with the Octicons mark");
	assert.equal(brandIcon("nope"), "");
	assert.equal(brandIcon(""), "");
	assert.equal(brandIcon("constructor"), "", "a prototype name is not a mark");
});
```

`flagIsSafe` is already exported from this file (the flags test); it is the same check the spec asks for on marks, with its red fixtures already proven there.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test --test-name-pattern="monitor|brand marks" tools/design-system.test.mjs`
Expected: FAIL, "icons.js must export monitor" and "Cannot find module .../brand-icons.js".

- [ ] **Step 3: Add `monitor` to `icons.js`**

In `libraries/design-system/components/icons.js`, after the `sun` entry in `PATHS`:

```js
	// A screen on a stand: the System option of the theme pill.
	monitor: '<rect x="3" y="4.5" width="18" height="12.5" rx="2.5"/><path d="M8.5 20.5h7M12 17v3.5"/>',
```

- [ ] **Step 4: Fetch the GitHub mark and the Octicons licence from a release tag**

From the workbench root, pinned to the latest Octicons release so the comment can name a version:

```bash
TAG=$(gh release view --repo primer/octicons --json tagName --jq .tagName); echo "$TAG"
mkdir -p .superpowers/octicons
curl -sSL -o .superpowers/octicons/mark-github-16.svg "https://raw.githubusercontent.com/primer/octicons/$TAG/icons/mark-github-16.svg"
curl -sSL -o .superpowers/octicons/LICENSE "https://raw.githubusercontent.com/primer/octicons/$TAG/LICENSE"
cat .superpowers/octicons/mark-github-16.svg; echo; cat .superpowers/octicons/LICENSE
```

Read the `d="…"` attribute and the `viewBox` from the SVG and the whole LICENSE text. These are data: read them, never run them. If the download fails, stop and say so; do not type a path from memory. Then open `https://github.com/logos` (built-in browser, `get_page_text`) and read what GitHub permits for the mark; the "Logo guidelines" line in Step 5 is written from that page in my words, not from memory. If the page says something that forbids a footer link mark, stop and report it.

- [ ] **Step 5: Create `brand-icons.js`**

`libraries/design-system/components/brand-icons.js`, with the path and the licence text pasted from Step 4 (the year in the notice is whatever upstream says):

```js
// Brand marks: filled, drawn the way each owner draws them.
//
// Unlike components/icons.js (one stroke family, my own drawing), a brand mark
// is the owner's artwork used unaltered: the path comes from the owner's own
// icon set and is coloured only through currentColor. docs/component-rules.md
// § Icons allows filled marks from this file and from nowhere else.
//
// Ships with github only. A project adds a mark when it needs one, through a
// PR here, with the same comment block: source, licence, logo guidelines and
// the date they were checked. Names are never built from user input; an
// unknown name returns "" so a typo renders nothing rather than markup from a
// caller.
//
// Usage: the same as icon().
//   import { brandIcon } from "../design-system/components/brand-icons.js";
//   `<a class="site-footer-mark tip-host" href="https://github.com/me">${brandIcon("github")}<span class="sr-only">GitHub</span></a>`

/*
 * github: the GitHub mark (the Invertocat), Octicons `mark-github-16` at <the tag from Step 4>.
 * Source: https://github.com/primer/octicons/blob/<the tag>/icons/mark-github-16.svg
 * Licence: MIT, https://github.com/primer/octicons/blob/<the tag>/LICENSE
 * Logo guidelines: https://github.com/logos (<what the page permits, in my words, read in Step 4>)
 * Checked: 2026-11-04
 *
 * <paste the Octicons LICENSE text here, line by line, each line prefixed " * ">
 */
const MARKS = {
	github: {
		viewBox: "0 0 16 16",
		path: '<path d="<paste the d attribute from mark-github-16.svg>"/>',
	},
};

// The names the file ships, for a gallery or a test to walk.
export const BRAND_NAMES = Object.freeze(Object.keys(MARKS));

// size is the drawn box in CSS pixels. A mark has no stroke to thin, so size is
// the only option.
export function brandIcon(name, { size = 20 } = {}) {
	const mark = Object.hasOwn(MARKS, name) ? MARKS[name] : null;
	if (!mark) return "";
	return /*HTML*/ `<svg class="icon" width="${size}" height="${size}" viewBox="${mark.viewBox}" fill="currentColor" aria-hidden="true" focusable="false">${mark.path}</svg>`;
}
```

Replace every `<paste …>` and `<the tag>` placeholder with the real text before moving on; the file must contain none of them.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test --test-name-pattern="monitor|brand marks|icons:" tools/design-system.test.mjs`
Expected: PASS (the existing icon tests still pass with fifteen icons).

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/components/icons.js libraries/design-system/components/brand-icons.js tools/design-system.test.mjs
git commit -m "Add the monitor icon and brand-icons.js with the GitHub mark"
```

---

### Task 2: A DOM for the behaviour tests (jsdom at the root)

About 30 minutes. **Needs my yes for the jsdom install before it starts.**

**Files:**
- Create: `package.json`, `package-lock.json`, `tools/dom-harness.mjs`, `tools/design-system-dom.test.mjs`
- Modify: `.github/workflows/ci.yml` (the `test` job), `.github/dependabot.yml`

**Interfaces:**
- Produces: `loadPage(body, scripts)` returning a jsdom `window` with the named design-system classic scripts run in order; `frames(window)` resolving after two animation frames. Tasks 3 and 5 use both.

- [ ] **Step 1: Write the failing test**

`tools/design-system-dom.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { frames, loadPage } from "./dom-harness.mjs";

// Behaviour tests for the design system's classic scripts, in jsdom. The static
// tests in design-system.test.mjs pin the text; these pin what the scripts do.

test("theme-toggle: a click on [data-theme-set] applies and stores the theme, System removes the key", () => {
	const window = loadPage(
		`<button data-theme-set="light">Light</button><button data-theme-set="system">System</button>`,
		["theme/theme-toggle.js"],
	);
	const { document, localStorage } = window;
	document.querySelector('[data-theme-set="light"]').click();
	assert.equal(document.documentElement.dataset.theme, "light");
	assert.equal(localStorage.getItem("theme"), "light");
	document.querySelector('[data-theme-set="system"]').click();
	assert.equal(localStorage.getItem("theme"), null, "System removes the key");
	assert.equal(document.documentElement.dataset.theme, "dark", "no matchMedia in jsdom, so System resolves to dark, the DS default");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/design-system-dom.test.mjs`
Expected: FAIL, "Cannot find module .../tools/dom-harness.mjs".

- [ ] **Step 3: Create the root `package.json` and install jsdom**

`package.json` at the workbench root:

```json
{
	"name": "workbench",
	"private": true,
	"description": "Root test runner for tools/. Not a package: jsdom is here for the design system's behaviour tests only.",
	"scripts": {
		"test": "node --test \"tools/*.test.mjs\"",
		"links": "node tools/check-links.mjs"
	},
	"devDependencies": {
		"jsdom": "^30.1.0"
	}
}
```

Then, from the root:

```bash
npm install
git status --short
```

Expected: `package-lock.json` created, `node_modules/` present and ignored (the root `.gitignore` already lists it), nothing else changed. If `npm install` changes `package.json` (it must not), restore it. Then read the licence off the installed package, never from memory: `node -p "require('./node_modules/jsdom/package.json').license"`. Expected: `MIT`. Anything else: stop and report it before going on.

- [ ] **Step 4: Write the harness**

`tools/dom-harness.mjs`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DS = join(import.meta.dirname, "..", "libraries", "design-system");

// A page with the given body, running the design system's classic scripts in
// order, the way index.html loads them at the end of <body>. The http origin
// gives the window a working localStorage; pretendToBeVisual gives it
// requestAnimationFrame. jsdom has no matchMedia, so System resolves to dark.
export function loadPage(body, scripts = []) {
	const dom = new JSDOM(`<!doctype html><html lang="en"><head></head><body>${body}</body></html>`, {
		url: "http://localhost/",
		runScripts: "outside-only",
		pretendToBeVisual: true,
	});
	for (const rel of scripts) dom.window.eval(readFileSync(join(DS, rel), "utf8"));
	return dom.window;
}

// Two frames, so a line written on the next frame has landed.
export const frames = (window) => new Promise((done) => window.requestAnimationFrame(() => window.requestAnimationFrame(done)));
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tools/design-system-dom.test.mjs`
Expected: PASS.

- [ ] **Step 6: CI and Dependabot**

In `.github/workflows/ci.yml`, in the `test` job, add one step between `actions/setup-node@v7` and "Extract tool + dashboard tests":

```yaml
      - run: npm ci
```

In `.github/dependabot.yml`, append after the `/libraries/layout-audit` entry (same shape, root directory):

```yaml
  - package-ecosystem: npm # package.json: jsdom for the design system's behaviour tests
    directory: /
    schedule:
      interval: weekly
    groups:
      npm-minor-patch:
        patterns: ["*"]
        update-types: [minor, patch]
```

Then run the whole root suite: `node --test --test-skip-pattern="bundles the current design-system" "tools/*.test.mjs"`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tools/dom-harness.mjs tools/design-system-dom.test.mjs .github/workflows/ci.yml .github/dependabot.yml
git commit -m "Run the design system's classic scripts in jsdom for behaviour tests"
```

---

### Task 3: Tooltip (`tooltip.css` and `tooltip.js`)

About 45 minutes.

**Files:**
- Create: `libraries/design-system/components/tooltip.css`, `libraries/design-system/components/tooltip.js`
- Modify: `libraries/design-system/components/index.css`
- Test: `tools/design-system.test.mjs`, `tools/design-system-dom.test.mjs`

**Interfaces:**
- Consumes: `loadPage`, from Task 2.
- Produces: classes `.tip-host`, `.tip`, `.tip-above`, `.tip-start`, `.tip-end`, `.tip-bubble`; the `[data-tips]` container attribute, set to `"hidden"` by Escape. Tasks 6 and 7 use them.

- [ ] **Step 1: Write the failing static test**

Append to `tools/design-system.test.mjs`:

```js
test("tooltip: pointer devices only, hidden by data-tips after the show rule, bordered in forced colours, no motion, dismissal script is delegated", () => {
	const css = read("components/tooltip.css");
	assert.match(read("components/index.css"), /@import "\.\/tooltip\.css";/, "tooltip.css must be imported by components/index.css");
	assert.match(css, /\.tip-host \{[^}]*position: relative;/s);
	assert.match(css, /\.tip \{[^}]*display: none;[^}]*position: absolute;/s);
	// The gap is the tip's own padding, so the pointer can cross onto the bubble (WCAG 1.4.13 hoverable).
	assert.match(css, /\.tip \{[^}]*padding-block-start: var\(--space-2\);/s);
	assert.doesNotMatch(css, /pointer-events: none/, "the bubble must stay hoverable");
	for (const name of ["tip-above", "tip-start", "tip-end", "tip-bubble"]) assert.match(css, new RegExp(`\\.${name} \\{`), `tooltip.css must define .${name}`);
	// Hover is gated to pointer devices; focus is not, because a tap never yields :focus-visible on a button.
	const pointerAt = css.indexOf("@media (hover: hover) and (pointer: fine)");
	assert.ok(pointerAt > 0, "hover tips show only under (hover: hover) and (pointer: fine)");
	const pointer = css.slice(pointerAt, css.indexOf("}", css.indexOf("display: block;", pointerAt)) + 2);
	assert.match(pointer, /\.tip-host:hover > \.tip \{[^}]*display: block;/s);
	assert.doesNotMatch(pointer, /focus-visible/, "focus shows a tip on every device");
	const focusAt = css.indexOf(".tip-host:focus-visible > .tip {");
	assert.ok(focusAt > 0 && focusAt < pointerAt, "the focus rule sits outside the pointer media query");
	assert.match(css.slice(focusAt), /^\.tip-host:focus-visible > \.tip \{[^}]*display: block;/s);
	// The hide rule must match the show rules' specificity (0,3,0) and come after both, or Escape never wins.
	const hiddenAt = css.indexOf('[data-tips="hidden"] .tip-host > .tip {');
	assert.ok(hiddenAt > css.indexOf(".tip-host:hover > .tip {"), "the hide rule comes after the hover rule");
	assert.match(css.slice(hiddenAt), /^\[data-tips="hidden"\] \.tip-host > \.tip \{[^}]*display: none;/s);
	assert.doesNotMatch(css, /\[data-tips="hidden"\] \.tip \{/, "a (0,2,0) hide rule loses to the (0,3,0) show rules");
	assert.match(css, /forced-colors: active[^{]*\{\s*\.tip-bubble \{[^}]*border: 1px solid CanvasText;/s);
	assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /transition|animation/, "nothing for prefers-reduced-motion to switch off");
	const js = read("components/tooltip.js");
	assert.doesNotMatch(js, /^\s*(?:import|export)\s/m, "tooltip.js must stay a classic script");
	assert.match(js, /tipsWired/, "guarded against a double install");
	assert.doesNotMatch(js, /preventDefault|stopPropagation/, "Escape must still reach picker.js");
	assert.match(js, /"mouseover"/, "mouseover bubbles, mouseenter does not");
	assert.match(js, /"focusin"/);
});
```

- [ ] **Step 2: Write the failing jsdom test**

Append to `tools/design-system-dom.test.mjs`:

```js
test("tooltip.js: Escape hides every tip container; the pointer entering or focus landing on a host reveals that container", () => {
	const window = loadPage(
		`<div data-tips><button class="tip-host"><svg class="icon"></svg>A<span class="tip" aria-hidden="true"><span class="tip-bubble">A</span></span></button></div>
		 <div data-tips><button class="tip-host">B</button></div>`,
		["components/tooltip.js"],
	);
	const { document } = window;
	const containers = () => [...document.querySelectorAll("[data-tips]")].map((c) => c.dataset.tips);
	const [a, b] = document.querySelectorAll(".tip-host");
	assert.deepEqual(containers(), ["", ""], "nothing hidden before Escape");
	a.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	assert.deepEqual(containers(), ["hidden", "hidden"], "Escape hides every container, not only the one with focus");
	// The pointer moving within the host (icon to padding) is not an entry.
	a.querySelector(".icon").dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true, relatedTarget: a }));
	assert.deepEqual(containers(), ["hidden", "hidden"]);
	a.dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
	assert.deepEqual(containers(), ["", "hidden"], "entering host A reveals its container only");
	b.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
	assert.deepEqual(containers(), ["", ""], "focus landing on host B reveals its container");
	assert.equal(document.documentElement.dataset.tipsWired, "true");
});

test("tooltip.js and picker.js both act on Escape, neither stops the other", () => {
	const window = loadPage(
		`<div data-tips><details data-picker open><summary>Theme</summary><button class="picker-row tip-host">Light</button></details></div>`,
		["components/picker.js", "components/tooltip.js"],
	);
	const { document } = window;
	const details = document.querySelector("details");
	document.querySelector(".picker-row").dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
	assert.equal(details.open, false, "picker.js closed the picker");
	assert.equal(document.querySelector("[data-tips]").dataset.tips, "hidden", "tooltip.js hid the tips");
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `node --test --test-name-pattern="tooltip" tools/design-system.test.mjs tools/design-system-dom.test.mjs`
Expected: FAIL, "ENOENT … tooltip.css" and "ENOENT … tooltip.js".

- [ ] **Step 4: Write `tooltip.css`**

`libraries/design-system/components/tooltip.css`:

```css
/* Tooltip for icon-only controls (docs/specs/2026-10-17-site-footer.md § 3.4).
   The control's hidden text carries the name; the tip repeats it for mouse users
   and is aria-hidden, so a screen reader hears the name once. Markup, inside a
   control that carries class="tip-host":
     <span class="tip tip-above" aria-hidden="true"><span class="tip-bubble">Light</span></span>
   Position: below by default. .tip-above for controls near the bottom of the
   screen (a footer). .tip-start and .tip-end align to the control's start or end
   edge instead of its centre, for the first and last control at a page edge, so a
   bubble never leaves the viewport.
   Hover shows a tip on pointer devices only, so a tap on a phone never leaves one
   behind. Focus shows a tip on every device: a tap never gives a button
   :focus-visible, and a keyboard on a tablet deserves the name too. A tip appears
   at once, with no transition, so prefers-reduced-motion has nothing to switch
   off. Escape (tooltip.js) sets data-tips="hidden" on the container, which hides
   its tips until the pointer or focus returns to a host (WCAG 1.4.13). */
.tip-host {
	position: relative;
}
.tip {
	display: none;
	position: absolute;
	inset-block-start: 100%;
	inset-inline-start: 50%;
	translate: -50% 0;
	z-index: var(--z-dropdown);
	/* The gap is the tip's own transparent padding, so the pointer can move from
	   the control onto the bubble without the tip closing (WCAG 1.4.13, hoverable). */
	padding-block-start: var(--space-2);
}
.tip-above {
	inset-block-start: auto;
	inset-block-end: 100%;
	padding-block-start: 0;
	padding-block-end: var(--space-2);
}
.tip-start {
	inset-inline-start: 0;
	translate: none;
}
.tip-end {
	inset-inline-start: auto;
	inset-inline-end: 0;
	translate: none;
}
.tip-bubble {
	display: block;
	padding: var(--space-1) var(--space-2);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	background: var(--surface-3);
	color: var(--text);
	box-shadow: var(--shadow-md);
	font-size: var(--text-sm);
	font-weight: 400;
	line-height: 1.4;
	letter-spacing: normal;
	text-transform: none;
	white-space: nowrap;
}
.tip-host:focus-visible > .tip {
	display: block;
}
@media (hover: hover) and (pointer: fine) {
	.tip-host:hover > .tip {
		display: block;
	}
}
/* Escape. Same specificity as the two show rules (0,3,0) and after both, so it
   wins; a plain [data-tips="hidden"] .tip would lose to them. */
[data-tips="hidden"] .tip-host > .tip {
	display: none;
}
@media (forced-colors: active) {
	/* Background and shadow are dropped; a border keeps the bubble off the canvas. */
	.tip-bubble {
		border: 1px solid CanvasText;
	}
}
```

Add `@import "./tooltip.css";` as the last line of `libraries/design-system/components/index.css`.

- [ ] **Step 5: Write `tooltip.js`**

`libraries/design-system/components/tooltip.js`:

```js
/*
 * Tooltip dismissal for [data-tips] containers (components/tooltip.css).
 * Showing is CSS alone (:hover and :focus-visible). This script adds the way
 * out: Escape sets data-tips="hidden" on every container, which hides its tips
 * until the pointer enters or focus lands on a .tip-host inside it again
 * (WCAG 1.4.13, dismissible).
 *
 * One set of delegated listeners on document, like picker.js, so a page that
 * re-renders its footer needs no rewiring. Escape also closes an open picker
 * (picker.js); hiding tips while a picker closes is harmless, so the two
 * scripts do not coordinate and this one never stops the event.
 */
(function () {
	var root = document.documentElement;
	if (root.dataset.tipsWired === "true") return;
	root.dataset.tipsWired = "true";

	function hideAll() {
		document.querySelectorAll("[data-tips]").forEach(function (container) {
			container.dataset.tips = "hidden";
		});
	}

	// Entering a host from outside it (or focus landing on it) reveals its
	// container. relatedTarget is where the pointer came from: a move within the
	// host, icon to padding, is not an entry.
	function reveal(event) {
		var target = event.target;
		var host = target && target.closest ? target.closest(".tip-host") : null;
		if (!host) return;
		if (event.relatedTarget && host.contains(event.relatedTarget)) return;
		var container = host.closest("[data-tips]");
		if (container && container.dataset.tips === "hidden") container.dataset.tips = "";
	}

	document.addEventListener("keydown", function (event) {
		if (event.key === "Escape") hideAll();
	});
	// mouseover bubbles (mouseenter does not), so one listener covers every host.
	document.addEventListener("mouseover", reveal);
	document.addEventListener("focusin", reveal);
})();
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test --test-name-pattern="tooltip" tools/design-system.test.mjs tools/design-system-dom.test.mjs`
Expected: PASS. Then the full root suite with the skip pattern. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/components/tooltip.css libraries/design-system/components/tooltip.js libraries/design-system/components/index.css tools/design-system.test.mjs tools/design-system-dom.test.mjs
git commit -m "Add the tooltip: hover and focus on pointer devices, Escape dismisses"
```

---

### Task 4: Theme pill CSS

About 20 minutes.

**Files:**
- Create: `libraries/design-system/components/theme-pill.css`
- Modify: `libraries/design-system/components/index.css`
- Test: `tools/design-system.test.mjs`

**Interfaces:**
- Produces: `.theme-pill` (a `role="group"` wrapper) and `.theme-pill-btn` (a `button[data-theme-set][aria-pressed]`, also a `.tip-host`). Task 7 renders it; Task 5's script marks it.

- [ ] **Step 1: Write the failing test**

Append to `tools/design-system.test.mjs`:

```js
test("theme pill: inset outline, 44 px round buttons, pressed ring in --text, Highlight fill in forced colours", () => {
	const css = read("components/theme-pill.css");
	assert.match(read("components/index.css"), /@import "\.\/theme-pill\.css";/, "theme-pill.css must be imported by components/index.css");
	assert.match(css, /\.theme-pill \{[^}]*display: inline-flex;[^}]*border-radius: var\(--radius-pill\);[^}]*box-shadow: inset 0 0 0 1px var\(--border\);/s);
	const btn = css.match(/\.theme-pill-btn \{([^}]*)\}/s)?.[1];
	assert.ok(btn, "theme-pill.css must define .theme-pill-btn");
	for (const decl of ["inline-size: var(--control-height);", "min-block-size: var(--control-height);", "border-radius: var(--radius-pill);", "color: var(--text-muted);"]) assert.ok(btn.includes(decl), `.theme-pill-btn needs ${decl}`);
	assert.match(css, /\.theme-pill-btn\[aria-pressed="true"\] \{[^}]*color: var\(--text\);[^}]*box-shadow: inset 0 0 0 1px var\(--text\);/s);
	// The focus ring is also a box-shadow (base.css); a pressed button keeps its ring under it.
	assert.match(css, /\.theme-pill-btn\[aria-pressed="true"\]:focus-visible \{[^}]*inset 0 0 0 1px var\(--text\),\s*var\(--shadow-focus\);/s);
	const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
	assert.match(forced, /\.theme-pill \{[^}]*outline: 1px solid CanvasText;/s);
	assert.match(forced, /\.theme-pill-btn\[aria-pressed="true"\] \{[^}]*forced-color-adjust: none;[^}]*background: Highlight;[^}]*color: HighlightText;/s);
	assert.doesNotMatch(forced, /\.theme-pill-btn\[aria-pressed="true"\] \{[^}]*outline/s, "pressed is a fill, never an outline, so it cannot pass for the focus ring");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="theme pill" tools/design-system.test.mjs`
Expected: FAIL, "ENOENT … theme-pill.css".

- [ ] **Step 3: Write `theme-pill.css`**

`libraries/design-system/components/theme-pill.css`:

```css
/* Theme pill: light, system and dark as three icon buttons in one pill
   (docs/specs/2026-10-17-site-footer.md § 3.2). The pressed state lives in
   aria-pressed, written by theme/theme-toggle.js (v3); this file only draws it.
   A screen uses the pill or the 3.8.0 theme picker, never both: the pill suits a
   footer, the picker a header that already holds the language picker.
   Markup (order light, system, dark, so the pill reads as a scale):
     <div class="theme-pill" role="group" aria-label="Theme">
       <button class="theme-pill-btn tip-host" type="button" data-theme-set="light" aria-pressed="false">
         ${icon("sun")}<span class="sr-only">Light</span>
         <span class="tip tip-above" aria-hidden="true"><span class="tip-bubble">Light</span></span>
       </button>
       …system (monitor), dark (moon, with tip-end)…
     </div>
     <p class="sr-only" role="status" data-theme-status></p> */
.theme-pill {
	display: inline-flex;
	border-radius: var(--radius-pill);
	/* An inset shadow, not a border, so the pill adds no size to its row. */
	box-shadow: inset 0 0 0 1px var(--border);
}
.theme-pill-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: var(--control-height);
	min-block-size: var(--control-height);
	padding: 0;
	border: 0;
	border-radius: var(--radius-pill);
	background: transparent;
	color: var(--text-muted);
	cursor: pointer;
}
.theme-pill-btn:hover {
	color: var(--text);
}
.theme-pill-btn[aria-pressed="true"] {
	color: var(--text);
	box-shadow: inset 0 0 0 1px var(--text);
}
/* The focus ring (base.css) is also a box-shadow; keep the pressed ring under it. */
.theme-pill-btn[aria-pressed="true"]:focus-visible {
	box-shadow:
		inset 0 0 0 1px var(--text),
		var(--shadow-focus);
}
@media (forced-colors: active) {
	.theme-pill {
		outline: 1px solid CanvasText;
	}
	/* The same pressed look as .btn[aria-pressed="true"]: a fill, never an
	   outline, so it cannot be mistaken for the focus ring. */
	.theme-pill-btn[aria-pressed="true"] {
		forced-color-adjust: none;
		background: Highlight;
		color: HighlightText;
		box-shadow: none;
	}
}
```

Add `@import "./theme-pill.css";` to `libraries/design-system/components/index.css`, before the tooltip import.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test --test-name-pattern="theme pill|44px" tools/design-system.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libraries/design-system/components/theme-pill.css libraries/design-system/components/index.css tools/design-system.test.mjs
git commit -m "Add the theme pill: three round icon buttons with a pressed ring"
```

---

### Task 5: Theme script v3 (pressed state and the status line), one writer in the gallery

About 1 hour.

**Files:**
- Modify: `libraries/design-system/theme/theme-toggle.js` (whole file), `libraries/design-system/gallery/app.js` (`syncTheme`)
- Test: `tools/design-system.test.mjs` (the "theme:" test and the "gallery sidebar:" test), `tools/design-system-dom.test.mjs`

**Interfaces:**
- Consumes: `loadPage`, `frames` (Task 2).
- Produces: `button[data-theme-set][aria-pressed]` is marked on load, after every click and on `storage` and `prefers-color-scheme` changes; the first `[data-theme-status]` gets the status line after a click on such a button. Task 7's panel relies on both.

- [ ] **Step 1: Write the failing static tests**

In `tools/design-system.test.mjs`, extend the existing test `"theme: data-theme-set is the standard, …"` by adding, after the `assert.doesNotMatch(toggle, /^\s*(?:import|export)\s/m …)` line:

```js
	// v3: pressed state and the status line, with no words of its own.
	assert.match(toggle, /button\[data-theme-set\]\[aria-pressed\]/, "pressed state is opt-in by the attribute");
	assert.match(toggle, /setAttribute\("aria-pressed"/);
	assert.match(toggle, /querySelectorAll\("\[data-theme-status\]"\)/, "every status element gets the line: a page may hold a hidden live region and a visible echo");
	assert.match(toggle, /themeWired/, "guarded against a double install, like picker.js and tooltip.js");
	assert.match(toggle, /\.textContent = /, "the status line is written with textContent, never innerHTML");
	assert.doesNotMatch(toggle, /innerHTML/);
	assert.equal(userFacingStrings(toggle), null, `theme-toggle.js must hold no user-facing strings, found ${userFacingStrings(toggle)}`);
	// The red case: a line with a capitalised quoted word fails the check.
	assert.equal(userFacingStrings('status.textContent = "Theme: " + name;'), '"Theme: "');
	assert.equal(userFacingStrings("var label = 'Dark';"), "'Dark'");
	assert.equal(userFacingStrings('addEventListener("DOMContentLoaded", mark); var q = "(prefers-color-scheme: light)";'), null, "event names and media queries are not words a person reads");
```

and add this helper above the test (module level):

```js
// A quoted string that starts with a capital letter followed by lower case is a
// word a person reads. Comments are stripped first, so the docs can show the
// "Theme: Dark" format. Returns the first offender or null.
export function userFacingStrings(js) {
	const code = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
	return code.match(/["'][A-Z][a-z][^"']*["']/)?.[0] ?? null;
}
```

Replace the existing gallery sidebar test's last line (`assert.ok(read("gallery/app.js").includes('.gallery-themes [data-theme-set]'), …)`) with:

```js
	assert.doesNotMatch(read("gallery/app.js"), /aria-pressed/, "theme-toggle.js v3 is the only writer of aria-pressed");
	assert.doesNotMatch(read("gallery/app.js"), /\.gallery-themes/, "app.js no longer syncs the sidebar; v3 marks it");
```

- [ ] **Step 2: Write the failing jsdom tests**

Append to `tools/design-system-dom.test.mjs`:

```js
const PILL = (group = ' role="group" aria-label="Theme"') => `
	<div class="theme-pill"${group}>
		<button class="theme-pill-btn" type="button" data-theme-set="light" aria-pressed="false"><span class="sr-only">Light</span></button>
		<button class="theme-pill-btn" type="button" data-theme-set="system" aria-pressed="false"><span class="sr-only">System</span></button>
		<button class="theme-pill-btn" type="button" data-theme-set="dark" aria-pressed="false"><span class="sr-only">Dark</span></button>
	</div>`;
const STATUS = `<p class="sr-only" role="status" data-theme-status></p>`;
const pressed = (document) => [...document.querySelectorAll("[data-theme-set][aria-pressed]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.themeSet);

test("theme-toggle v3: on load System is pressed when nothing is stored, a click moves the mark and writes the group and the name", async () => {
	const window = loadPage(PILL() + STATUS, ["theme/theme-toggle.js"]);
	const { document } = window;
	const status = document.querySelector("[data-theme-status]");
	assert.deepEqual(pressed(document), ["system"], "nothing stored is System");
	document.querySelector('[data-theme-set="dark"]').click();
	assert.deepEqual(pressed(document), ["dark"]);
	assert.equal(status.textContent, "", "cleared first, so a repeated line is announced");
	await frames(window);
	assert.equal(status.textContent, "Theme: Dark");
});

test("theme-toggle v3: a click on the already pressed button writes the line again", async () => {
	const window = loadPage(PILL() + STATUS, ["theme/theme-toggle.js"]);
	const { document } = window;
	const status = document.querySelector("[data-theme-status]");
	const dark = document.querySelector('[data-theme-set="dark"]');
	dark.click();
	await frames(window);
	assert.equal(status.textContent, "Theme: Dark");
	dark.click();
	assert.equal(status.textContent, "", "cleared on the press");
	await frames(window);
	assert.equal(status.textContent, "Theme: Dark", "written again on the next frame");
	assert.deepEqual(pressed(document), ["dark"]);
});

test("theme-toggle v3: a pill with no group name writes the button's name alone, never ': Dark'", async () => {
	const window = loadPage(PILL("") + STATUS, ["theme/theme-toggle.js"]);
	const { document } = window;
	document.querySelector('[data-theme-set="dark"]').click();
	await frames(window);
	assert.equal(document.querySelector("[data-theme-status]").textContent, "Dark");
});

test("theme-toggle v3: a missing name or group writes the other part alone, never 'Theme: '", async () => {
	const window = loadPage(
		`<div role="group" aria-label="Theme"><button type="button" data-theme-set="dark" aria-pressed="false"></button></div>
		 <div role="group" aria-label=""><button type="button" data-theme-set="light" aria-pressed="false" aria-label="Light"></button></div>` + STATUS,
		["theme/theme-toggle.js"],
	);
	const { document } = window;
	const status = document.querySelector("[data-theme-status]");
	document.querySelector('[data-theme-set="dark"]').click();
	await frames(window);
	assert.equal(status.textContent, "Theme", "no name: the group alone");
	document.querySelector('[data-theme-set="light"]').click();
	await frames(window);
	assert.equal(status.textContent, "Light", "aria-label is the name when there is no .sr-only text; an empty group name is no group");
});

test("theme-toggle v3: a button without aria-pressed in its markup is never given one, and the picker rows stay untouched", () => {
	const window = loadPage(
		`<button type="button" class="picker-row" data-theme-set="light" aria-current="true">Light</button>
		 <button type="button" data-theme-set="dark">Dark</button>` + STATUS,
		["theme/theme-toggle.js"],
	);
	const { document } = window;
	document.querySelector('[data-theme-set="dark"]').click();
	assert.equal(document.documentElement.dataset.theme, "dark", "the theme still applies");
	for (const button of document.querySelectorAll("[data-theme-set]")) assert.equal(button.hasAttribute("aria-pressed"), false, `${button.dataset.themeSet} must not gain aria-pressed`);
	assert.equal(document.querySelector(".picker-row").getAttribute("aria-current"), "true");
});

test("theme-toggle v3: a storage event re-marks the pressed button and writes no status line", async () => {
	const window = loadPage(PILL() + STATUS, ["theme/theme-toggle.js"]);
	const { document, localStorage } = window;
	localStorage.setItem("theme", "light");
	window.dispatchEvent(new window.StorageEvent("storage", { key: "theme", newValue: "light" }));
	assert.deepEqual(pressed(document), ["light"]);
	assert.equal(document.documentElement.dataset.theme, "light");
	await frames(window);
	assert.equal(document.querySelector("[data-theme-status]").textContent, "", "nothing was pressed here, so there is no result to confirm");
});

test("theme-toggle v3: a pill inserted after load is marked on the next event", () => {
	const window = loadPage(STATUS, ["theme/theme-toggle.js"]);
	const { document, localStorage } = window;
	localStorage.setItem("theme", "dark");
	document.body.insertAdjacentHTML("beforeend", PILL());
	assert.deepEqual(pressed(document), [], "nothing marks a late pill until an event; the view renders aria-pressed itself from preferences.js");
	window.dispatchEvent(new window.StorageEvent("storage", { key: "theme", newValue: "dark" }));
	assert.deepEqual(pressed(document), ["dark"]);
});

test("theme-toggle v3: the status element is written with textContent, so a name holding markup arrives as text", async () => {
	const window = loadPage(PILL() + STATUS, ["theme/theme-toggle.js"]);
	const { document } = window;
	const dark = document.querySelector('[data-theme-set="dark"]');
	dark.querySelector(".sr-only").textContent = "Dark <b>mode</b>";
	dark.click();
	await frames(window);
	const status = document.querySelector("[data-theme-status]");
	assert.equal(status.textContent, "Theme: Dark <b>mode</b>");
	assert.equal(status.querySelector("b"), null, "no element was created from the name");
});

test("theme-toggle v3: every status element gets the line, so a hidden live region and a visible echo can coexist; a second load installs nothing", async () => {
	const window = loadPage(`<p class="sr-only" role="status" data-theme-status></p>` + PILL() + `<p data-theme-status></p>`, ["theme/theme-toggle.js", "theme/theme-toggle.js"]);
	const { document } = window;
	document.querySelector('[data-theme-set="light"]').click();
	await frames(window);
	assert.deepEqual([...document.querySelectorAll("[data-theme-status]")].map((el) => el.textContent), ["Theme: Light", "Theme: Light"]);
	assert.equal(document.documentElement.dataset.themeWired, "true");
});

test("theme-toggle v3: no status element: the click still applies and marks, and nothing throws", () => {
	const window = loadPage(PILL(), ["theme/theme-toggle.js"]);
	const { document } = window;
	assert.doesNotThrow(() => document.querySelector('[data-theme-set="light"]').click());
	assert.equal(document.documentElement.dataset.theme, "light");
	assert.deepEqual(pressed(document), ["light"]);
});

test("theme-toggle v3: an unknown value changes nothing", async () => {
	const window = loadPage(PILL() + `<button type="button" data-theme-set="sepia" aria-pressed="false"><span class="sr-only">Sepia</span></button>` + STATUS, ["theme/theme-toggle.js"]);
	const { document, localStorage } = window;
	document.querySelector('[data-theme-set="sepia"]').click();
	await frames(window);
	assert.equal(localStorage.getItem("theme"), null);
	assert.equal(document.documentElement.dataset.theme, "dark");
	assert.deepEqual(pressed(document), ["system"], "the sepia button is never pressed and System keeps its mark");
	assert.equal(document.querySelector("[data-theme-status]").textContent, "", "no result, no line");
});

test("theme-toggle v3: the script loaded before its buttons marks them on DOMContentLoaded", () => {
	const window = loadPage("", []);
	const { document, localStorage } = window;
	localStorage.setItem("theme", "light");
	// Simulate a <head> script: run it while the document is still loading.
	Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
	window.eval(readFileSync(join(import.meta.dirname, "..", "libraries", "design-system", "theme", "theme-toggle.js"), "utf8"));
	document.body.insertAdjacentHTML("beforeend", PILL());
	assert.deepEqual(pressed(document), []);
	document.dispatchEvent(new window.Event("DOMContentLoaded"));
	assert.deepEqual(pressed(document), ["light"]);
});
```

Add the imports the last test needs at the top of the file: `import { readFileSync } from "node:fs";` and `import { join } from "node:path";`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test --test-name-pattern="theme" tools/design-system.test.mjs tools/design-system-dom.test.mjs`
Expected: the v3 tests FAIL (no `aria-pressed` is written, the status stays empty); the gallery sidebar test FAILS on "only writer".

- [ ] **Step 4: Rewrite `theme-toggle.js` as v3**

Replace the whole of `libraries/design-system/theme/theme-toggle.js`:

```js
/*
 * Theme control: click handler plus the listeners that keep System live and
 * the pressed state marked. The initial theme is set by the inline <head>
 * snippet to avoid a flash (theme/theme-init-snippet.html).
 *
 * Markup: any element with data-theme-set="light" | "dark" | "system".
 * "system" removes the stored key and applies prefers-color-scheme; while no
 * key is stored the page keeps following the OS, and a change in another tab
 * is applied here too.
 *
 * Pressed state (v3, DS 3.11.0): a button[data-theme-set] that ships with an
 * aria-pressed attribute gets "true" when it is the current choice (System
 * when no key is stored) and "false" otherwise: on load, after every click and
 * on the storage and prefers-color-scheme events. Opt-in by the attribute: a
 * control without aria-pressed in its markup is never touched, which keeps the
 * 3.8.0 picker rows (aria-current) out. A view that renders such a button after
 * load sets aria-pressed itself from the stored preference
 * (theme/preferences.js readPreference); this script takes over from the next
 * event.
 *
 * Status line (v3): after every click on a button[data-theme-set][aria-pressed],
 * the pressed one included, every [data-theme-status] element gets the
 * group's name and the button's name ("Theme: Dark"), read from the closest
 * [role="group"]'s aria-label and the button's .sr-only text (else its
 * aria-label, else its text). Whichever part is missing is left out, never an
 * empty side of the colon. No strings live here, so it works in any language.
 * The element is cleared first and written on the next frame, so a repeated
 * line is announced and not swallowed as "no change": every press needs an
 * audible result. Put the live region in the page's first HTML, outside anything
 * a view re-renders, or a screen reader may miss the first change. One live
 * region per page; a second element with the attribute and no role is a visible
 * echo (the gallery shows one).
 *
 * This is a classic script (loaded via <script src>), so it cannot import
 * theme/preferences.js; the few lines of read, write and resolve logic are
 * repeated here on purpose and must stay in step with that module.
 *
 * [data-theme-toggle] (cycle light and dark) is kept for consumers that have
 * not migrated. Deprecated since 3.8.0, removed in DS 4.0.0; logs nothing.
 */
(function () {
	var root = document.documentElement;
	if (root.dataset.themeWired === "true") return;
	root.dataset.themeWired = "true";

	var THEMES = ["light", "dark"];
	var LIGHT_QUERY = "(prefers-color-scheme: light)";
	var PRESSABLE = "button[data-theme-set][aria-pressed]";

	function systemTheme() {
		return typeof matchMedia === "function" && matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
	}
	function stored() {
		try {
			var value = localStorage.getItem("theme");
			return THEMES.indexOf(value) === -1 ? null : value;
		} catch (e) {
			return null;
		}
	}
	function write(value) {
		try {
			if (value) localStorage.setItem("theme", value);
			else localStorage.removeItem("theme");
		} catch (e) {
			// Storage refused; the page still shows the choice.
		}
	}
	function apply(value) {
		document.documentElement.dataset.theme = value || systemTheme();
	}

	// Every opt-in button reflects the stored key; no key is System.
	function mark() {
		var current = stored() || "system";
		document.querySelectorAll(PRESSABLE).forEach(function (button) {
			var value = button.dataset.themeSet === "" ? "system" : button.dataset.themeSet;
			button.setAttribute("aria-pressed", String(value === current));
		});
	}

	function nameOf(button) {
		var hidden = button.querySelector(".sr-only");
		var text = hidden ? hidden.textContent : button.getAttribute("aria-label") || button.textContent;
		return (text || "").replace(/\s+/g, " ").trim();
	}
	function frame(fn) {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
		else setTimeout(fn, 0);
	}
	function announce(button) {
		var targets = document.querySelectorAll("[data-theme-status]");
		if (targets.length === 0) return;
		var group = button.closest('[role="group"]');
		var groupName = group ? (group.getAttribute("aria-label") || "").trim() : "";
		var name = nameOf(button);
		var line = groupName && name ? groupName + ": " + name : groupName || name;
		targets.forEach(function (status) {
			status.textContent = "";
		});
		frame(function () {
			targets.forEach(function (status) {
				status.textContent = line;
			});
		});
	}

	document.addEventListener("click", function (event) {
		var set = event.target.closest("[data-theme-set]");
		if (set) {
			var next = set.dataset.themeSet;
			if (next === "system" || next === "") {
				write(null);
				apply(null);
			} else if (THEMES.indexOf(next) !== -1) {
				write(next);
				apply(next);
			} else {
				return;
			}
			mark();
			if (set.matches(PRESSABLE)) announce(set);
			return;
		}

		// Deprecated path: [data-theme-toggle] cycles light and dark.
		var toggle = event.target.closest("[data-theme-toggle]");
		if (!toggle) return;
		var flipped = document.documentElement.dataset.theme === "light" ? "dark" : "light";
		write(flipped);
		apply(flipped);
		mark();
	});

	// Follow the OS while no key is stored.
	if (typeof matchMedia === "function") {
		var query = matchMedia(LIGHT_QUERY);
		if (typeof query.addEventListener === "function") {
			query.addEventListener("change", function () {
				if (stored() === null) apply(null);
				mark();
			});
		}
	}

	// Another tab changed or cleared the key (a null key is a storage.clear()).
	// Nothing was pressed here, so the status line stays as it is.
	addEventListener("storage", function (event) {
		if (event.key !== "theme" && event.key !== null) return;
		apply(stored());
		mark();
	});

	// On load. A script in <head> runs before its buttons exist, so wait for them.
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mark);
	else mark();
})();
```

- [ ] **Step 5: Drop the gallery's own loop**

In `libraries/design-system/gallery/app.js`, replace the comment block above `syncTheme` and the function with:

```js
// Theme: the sidebar group, the Footer panel's pill and the Pickers demo all
// carry data-theme-set. theme-toggle.js (v3) applies the choice and marks every
// aria-pressed button, so nothing here touches aria-pressed; this only keeps
// the demo header in step. The header is re-rendered whole when a preference
// changes, and focus lands on the trigger of the picker that was used (its new
// name is the audible result of the press). Language and currency live in
// PICKER_DEMO.
function syncTheme(focusPicker) {
  const header = document.getElementById("picker-header");
  if (!header) return;
  header.innerHTML = renderPickerHeader();
  if (focusPicker) header.querySelector(`[data-picker="${focusPicker}"] summary`)?.focus();
}
```

Keep the `syncTheme();` call, the click listener and the two `preferences.watch…` lines that follow as they are.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test --test-name-pattern="theme|gallery sidebar" tools/design-system.test.mjs tools/design-system-dom.test.mjs`
Expected: PASS. Then the full root suite with the skip pattern. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/theme/theme-toggle.js libraries/design-system/gallery/app.js tools/design-system.test.mjs tools/design-system-dom.test.mjs
git commit -m "Theme script v3: mark aria-pressed and write a status line, one writer"
```

---

### Task 6: Site footer composition

About 45 minutes.

**Files:**
- Create: `libraries/design-system/compositions/site-footer.css`
- Modify: `libraries/design-system/compositions/index.css`
- Test: `tools/design-system.test.mjs`

**Interfaces:**
- Consumes: `.control-row` (3.10.0), `.cluster`, `.theme-pill` (Task 4), `.tip-host` (Task 3), `[data-align="label"]` from `base.css`.
- Produces: `.site-footer`, `.site-footer-row`, `.site-footer-lead`, `.site-footer-nav`, `.site-footer-label`, `.site-footer-link`, `.site-footer-note`, `.site-footer-bar`, `.site-footer-mark`. Task 7 renders them.

- [ ] **Step 1: Write the failing test**

Append to `tools/design-system.test.mjs`:

```js
test("site footer: a stack below 1024 px, one spread row from min-width: 1024px, label and note in one small uppercase style, the bar is a control row", () => {
	const css = read("compositions/site-footer.css");
	assert.match(read("compositions/index.css"), /@import "\.\/site-footer\.css";/, "site-footer.css must be imported by compositions/index.css");
	assert.match(css, /\.site-footer-row \{[^}]*display: flex;[^}]*flex-direction: column;/s);
	assert.match(css, /\.site-footer-label,\n\.site-footer-note \{[^}]*font-size: 0\.75rem;[^}]*line-height: 1rem;[^}]*text-transform: uppercase;[^}]*letter-spacing: 0\.14em;[^}]*color: var\(--text-muted\);/s);
	assert.doesNotMatch(css, /\.site-footer-label,\n\.site-footer-note \{[^}]*font-weight/s, "the label keeps --weight-label from base.css, which is how it stands off from the links");
	assert.match(css, /\.site-footer-note > span \{[^}]*display: block;/s, "the note is two short lines");
	for (const control of ["site-footer-link", "site-footer-mark"]) assert.match(css, new RegExp(`\\.${control} \\{[^}]*min-block-size: var\\(--control-height\\);`, "s"), `.${control} is a 44 px target`);
	assert.match(css, /\.site-footer-bar > \.theme-pill \{[^}]*margin-inline-start: auto;/s, "the pill sits at the end of the bar, also on a wrapped line");
	assert.match(css, /\.site-footer-bar > \.site-footer-mark:first-child \{[^}]*margin-inline-start: -0\.75rem;/s, "the first mark's glyph lines up with the text above");
	const wideAt = css.indexOf("@media (min-width: 1024px)");
	assert.ok(wideAt > 0, "one min-width: 1024px block");
	const wide = css.slice(wideAt);
	assert.match(wide, /\.site-footer-row \{[^}]*flex-direction: row;[^}]*flex-wrap: wrap;[^}]*justify-content: space-between;/s);
	assert.match(wide, /\.site-footer-lead \{[^}]*flex: none;[^}]*max-inline-size: 17rem;/s);
	assert.match(wide, /\.site-footer-note,\n\t\.site-footer-bar \{[^}]*flex: none;/s, "every group except the nav wraps whole");
	assert.match(wide, /\.site-footer-label \{[^}]*clip: rect\(0, 0, 0, 0\);/s, "the label is visually hidden from 1024 px and still names the nav");
	assert.match(wide, /\.site-footer-bar > \.site-footer-mark:first-child \{[^}]*margin-inline-start: 0;/s);
	assert.doesNotMatch(css, /@media[^{]*max-width/);
	assert.doesNotMatch(css, /\.site-footer-row[^{]*\{[^}]*min-block-size|\.site-footer-row[^{]*\{[^}]*block-size:/s, "the outer row makes no height promise");
	assert.match(css, /markedsføringsloven § 7/, "the note rule travels with the markup");
	assert.match(css, /omits the nav/, "a project with no text links omits the nav, label included");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="site footer" tools/design-system.test.mjs`
Expected: FAIL, "ENOENT … site-footer.css".

- [ ] **Step 3: Write `site-footer.css`**

`libraries/design-system/compositions/site-footer.css`:

```css
/* Site footer (docs/specs/2026-10-17-site-footer.md): a lead that must be read,
   text links under a small label, a two-line note, and a bar of brand marks with
   the theme pill. The rule: an icon where the meaning is universal, short text
   where it is not; a safety, legal or trust link is always text
   (docs/component-rules.md § Icons or text).

   Markup, in reading order, the same at every width:
     <footer class="site-footer">
       <div class="site-footer-row" data-tips>
         <p class="site-footer-lead">One or two sentences that must be read, with any vital link.</p>
         <nav class="site-footer-nav" aria-labelledby="footer-label">
           <span id="footer-label" class="site-footer-label" data-align="label">About this site</span>
           <span class="cluster">
             <a class="site-footer-link" href="…">Report an error</a>
             …each a 44 px target…
           </span>
         </nav>
         <p class="site-footer-note"><span>© Name · No tracking.</span> <span>No cookies.</span></p>
         <div class="site-footer-bar control-row">
           <a class="site-footer-mark tip-host" href="https://github.com/…">
             ${brandIcon("github")}<span class="sr-only">GitHub</span>
             <span class="tip tip-above tip-start" aria-hidden="true"><span class="tip-bubble">GitHub</span></span>
           </a>
           …the theme pill (components/theme-pill.css), its last button with tip-end…
         </div>
       </div>
       <p class="sr-only" role="status" data-theme-status></p>
     </footer>

   The note is each project's own true statement. "No tracking. No cookies." is the
   gallery's sample and holds for the gallery; a site that stores a theme in
   localStorage still has no cookies, but a site with analytics may not copy it
   unchanged (markedsføringsloven § 7, a misleading claim). A project with no text
   links omits the nav, label included, never an empty landmark. The status element
   is the footer's last child, in the first HTML, outside anything a view re-renders.

   Below 1024 px: a stack. The label shows over the links, the note sits on its own
   line, the bar puts the marks at the start and the pill at the end. From 1024 px:
   one wrapping row with the groups spread apart. The label is visually hidden and
   still names the nav. The lead is capped at 17rem so it wraps to two lines in
   English; a longer language may take three, and the row grows with it, because
   this row is not a .control-row and makes no height promise. Every group except
   the nav is flex: none, so groups wrap whole, never in the middle. The bar is a
   .control-row, so its controls share one height and one bottom edge, and
   layout-audit checks it; at 320 px with three or more marks the pill drops to a
   second line at the end, and the contract holds per line. */
.site-footer {
	padding-block: var(--space-6);
	border-block-start: 1px solid var(--line);
}
.site-footer-row {
	display: flex;
	flex-direction: column;
	gap: var(--space-5);
}
.site-footer-lead {
	margin: 0;
	font-size: var(--text-sm);
	color: var(--text-muted);
}
.site-footer-nav {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
}
/* Label and note share one text style. The label keeps --weight-label from
   base.css ([data-align="label"]), which is how it stands off from the links. */
.site-footer-label,
.site-footer-note {
	margin: 0;
	font-size: 0.75rem;
	line-height: 1rem;
	text-transform: uppercase;
	letter-spacing: 0.14em;
	color: var(--text-muted);
}
.site-footer-note > span {
	display: block;
}
/* A text link: a 44 px target with no box, muted until hovered. */
.site-footer-link {
	display: inline-flex;
	align-items: center;
	min-block-size: var(--control-height);
	font-size: var(--text-sm);
	color: var(--text-muted);
}
.site-footer-link:hover {
	color: var(--text);
}
/* A brand mark: a 44 px round target around a 20 px glyph. */
.site-footer-mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: var(--control-height);
	min-block-size: var(--control-height);
	border-radius: var(--radius-pill);
	color: var(--text-muted);
}
.site-footer-mark:hover {
	color: var(--text);
}
/* The first mark pulls back by half of (44 minus 20) px, so its glyph lines up
   with the text above while the target stays whole. Its tip-start bubble starts
   at the same point, 0.75rem left of the text column, so the footer needs at
   least that much inline padding around it; .container gives 1rem or more. */
.site-footer-bar > .site-footer-mark:first-child {
	margin-inline-start: -0.75rem;
}
/* The pill takes the end of its line, also when it wraps to a second one. */
.site-footer-bar > .theme-pill {
	margin-inline-start: auto;
}
@media (min-width: 1024px) {
	.site-footer-row {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
	}
	.site-footer-lead {
		flex: none;
		max-inline-size: 17rem;
	}
	.site-footer-note,
	.site-footer-bar {
		flex: none;
	}
	/* Visually hidden, still the nav's name. The .sr-only declarations are
	   repeated here because the class is fixed by the markup below 1024 px. */
	.site-footer-label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.site-footer-bar > .site-footer-mark:first-child {
		margin-inline-start: 0;
	}
}
```

Add `@import "./site-footer.css";` as the last line of `libraries/design-system/compositions/index.css`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tools/design-system.test.mjs tools/design-system-layout.test.mjs`
Expected: PASS, including the layout file's "no max-width", "no order or reverse" and "clamp" guards over the new file.

- [ ] **Step 5: Commit**

```bash
git add libraries/design-system/compositions/site-footer.css libraries/design-system/compositions/index.css tools/design-system.test.mjs
git commit -m "Add the site footer composition"
```

---

### Task 7: Gallery Footer panel

About 45 minutes.

**Files:**
- Modify: `libraries/design-system/gallery/index.html`, `libraries/design-system/gallery/app.js`, `libraries/design-system/gallery/sections.js`, `libraries/design-system/gallery/gallery.css`
- Test: `tools/design-system.test.mjs`

**Interfaces:**
- Consumes: `brandIcon`, `BRAND_NAMES` (Task 1), `icon("monitor")` (Task 1), the pill and tooltip classes (Tasks 3, 4), the footer classes (Task 6), v3 marking (Task 5), `preferences.readPreference` (already on `window`).

- [ ] **Step 1: Write the failing test**

Append to `tools/design-system.test.mjs`:

```js
test("gallery: a Footer panel with a live pill that reads its pressed state from preferences, a visible status line, tooltip.js loaded, brand marks on window", () => {
	const sections = read("gallery/sections.js");
	const panel = sections.match(/id: "footer",[\s\S]*?\n  \},\n/)?.[0];
	assert.ok(panel, "sections.js needs a footer section");
	assert.match(panel, /preferences\.readPreference\("theme", preferences\.THEMES\)/, "a panel rendered after load marks the pill itself; v3 takes over from the next event");
	assert.match(panel, /aria-pressed="\$\{/, "aria-pressed is rendered from the stored preference");
	for (const needle of ['class="site-footer"', 'class="site-footer-row" data-tips', 'data-align="label"', 'class="site-footer-bar control-row"', 'brandIcon("github")', 'class="theme-pill" role="group" aria-label="Theme"', "tip-start", "tip-end", "No analytics.", "No cookies."]) {
		assert.ok(panel.includes(needle), `the Footer panel needs ${needle}`);
	}
	assert.match(panel, /\["light", "sun", "Light"\],\s*\["system", "monitor", "System"\],\s*\["dark", "moon", "Dark"\]/, "light, system, dark: the pill reads as a scale");
	// One live region per page, in the first HTML; the panel's line is a visible echo with no role.
	assert.match(panel, /<p class="gallery-theme-status" data-theme-status><\/p>/, "the visible echo carries the attribute and no role");
	assert.doesNotMatch(panel, /role="status"/, "the panel is innerHTML after load, so it holds no live region");
	const index = read("gallery/index.html");
	assert.match(index, /<p class="sr-only" role="status" data-theme-status><\/p>/, "the live region sits in the first HTML, in the sidebar");
	assert.ok(index.indexOf('data-theme-status') < index.indexOf('id="panel"'), "the live region comes before the panel");
	assert.match(index, /<script src="\.\.\/components\/tooltip\.js"><\/script>/);
	const app = read("gallery/app.js");
	assert.match(app, /import \{ BRAND_NAMES, brandIcon \} from "\.\.\/components\/brand-icons\.js";/);
	assert.match(app, /window\.brandIcon = brandIcon;/);
	assert.match(read("gallery/gallery.css"), /\.gallery-theme-status \{/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="gallery: a Footer" tools/design-system.test.mjs`
Expected: FAIL, "sections.js needs a footer section".

- [ ] **Step 3: Load the script and expose the marks**

In `libraries/design-system/gallery/index.html`, after `<script src="../components/picker.js"></script>` add:

```html
    <script src="../components/tooltip.js"></script>
```

and, right after the closing `</div>` of `.gallery-themes` (inside `.gallery-controls`, so it is in the first HTML and before `#panel`), the page's one live region:

```html
          <p class="sr-only" role="status" data-theme-status></p>
```

Every theme press on this page, sidebar or Footer panel, is announced through it. The Footer panel's own line (Step 4) is a visible echo of the same text with no role.

In `libraries/design-system/gallery/app.js`, after the `icons.js` import add `import { BRAND_NAMES, brandIcon } from "../components/brand-icons.js";` and after `window.ICON_NAMES = ICON_NAMES;` add:

```js
window.brandIcon = brandIcon;
window.BRAND_NAMES = BRAND_NAMES;
```

- [ ] **Step 4: Add the Footer panel**

In `libraries/design-system/gallery/sections.js`, insert a new section object after the `pickers` section (before `overlays`):

```js
  {
    id: "footer",
    label: "Footer",
    render() {
      // The panel renders after theme-toggle.js ran, so it marks the pill itself
      // from the stored preference; v3 takes over from the next click or event.
      const stored = preferences.readPreference("theme", preferences.THEMES);
      const current = stored === null ? "system" : stored;
      const pill = [
        ["light", "sun", "Light"],
        ["system", "monitor", "System"],
        ["dark", "moon", "Dark"],
      ]
        .map(([value, glyph, name], i, all) => {
          const edge = i === all.length - 1 ? " tip-end" : "";
          return `
            <button class="theme-pill-btn tip-host" type="button" data-theme-set="${value}" aria-pressed="${value === current}">
              ${icon(glyph)}<span class="sr-only">${name}</span>
              <span class="tip tip-above${edge}" aria-hidden="true"><span class="tip-bubble">${name}</span></span>
            </button>`;
        })
        .join("");
      return (
        panelHeader(
          "Composition",
          "Footer",
          "An icon where the meaning is universal, short text where it is not. A safety, legal or trust link is always text.",
        ) +
        specimen({
          title: "Site footer",
          note:
            "A stack below 1024 px, one row from 1024 px. The pill is live: it drives the gallery's theme through theme-toggle.js. The line under the footer echoes what a screen reader hears after a press, from the page's live region in the sidebar; a consumer ships that region as the footer's last child, visually hidden. Hover a mark for its tooltip; Escape hides the tooltips until the pointer returns. The note is this gallery's own true statement; a project writes what holds for it.",
          classes: [
            ".site-footer",
            ".site-footer-row",
            ".site-footer-lead",
            ".site-footer-nav",
            ".site-footer-label",
            ".site-footer-link",
            ".site-footer-note",
            ".site-footer-bar.control-row",
            ".site-footer-mark",
            ".theme-pill",
            ".tip",
            "[data-tips]",
            "[data-theme-status]",
          ],
          demo: `
            <footer class="site-footer">
              <div class="site-footer-row" data-tips>
                <p class="site-footer-lead">Sample text for one or two sentences that must be read, with <a href="#">a vital link</a>.</p>
                <nav class="site-footer-nav" aria-labelledby="footer-label">
                  <span id="footer-label" class="site-footer-label" data-align="label">About this site</span>
                  <span class="cluster">
                    <a class="site-footer-link" href="#">Report an error</a>
                    <a class="site-footer-link" href="#">About and liability</a>
                    <a class="site-footer-link" href="#">Privacy</a>
                  </span>
                </nav>
                <p class="site-footer-note"><span>© Design System · No analytics.</span> <span>No cookies.</span></p>
                <div class="site-footer-bar control-row">
                  <a class="site-footer-mark tip-host" href="https://github.com/malinfossum/workbench">
                    ${brandIcon("github")}<span class="sr-only">GitHub</span>
                    <span class="tip tip-above tip-start" aria-hidden="true"><span class="tip-bubble">GitHub</span></span>
                  </a>
                  <div class="theme-pill" role="group" aria-label="Theme">${pill}</div>
                </div>
              </div>
              <p class="gallery-theme-status" data-theme-status></p>
            </footer>`,
        })
      );
    },
  },
```

- [ ] **Step 5: Style the visible status line**

Append to `libraries/design-system/gallery/gallery.css`:

```css
/* The Footer panel's status line is a visible echo of the page's live region
   (index.html, in the sidebar), so the audible result of a press can be seen.
   It has no role: the panel is innerHTML after load, and a region inserted then
   may be silent on its first change. A consumer ships one .sr-only region. The
   min height keeps the footer from jumping while the line is cleared for a frame. */
.gallery-theme-status {
	min-block-size: 1.5rem;
	margin: 0;
	margin-block-start: var(--space-4);
	font-size: var(--text-sm);
	color: var(--text-muted);
}
```

- [ ] **Step 6: Run the tests, then look at it**

Run: `node --test --test-skip-pattern="bundles the current design-system" "tools/*.test.mjs"`. Expected: PASS.

Then serve the gallery and look at the Footer panel at 320 px and 1280 px, dark and light, with the built-in browser (the layout-audit self-test server serves the repo root):

```bash
cd libraries/layout-audit && node selftest/serve.mjs
```

Open `http://127.0.0.1:4400/libraries/design-system/gallery/index.html`, click Footer. Check: the pill marks the current theme on first render; a click on a pill button changes the theme, moves the ring and writes "Theme: Light" under the footer; a click on the sidebar's theme group also writes the line; a second click on the pressed button writes it again; hovering the GitHub mark shows its tooltip inside the viewport at 320 px; at 1280 px the four groups sit on one row and the label is hidden. Screenshot 320 and 1280 for the PR. Fix anything wrong before Step 7. Stop the server when done.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/gallery/index.html libraries/design-system/gallery/app.js libraries/design-system/gallery/sections.js libraries/design-system/gallery/gallery.css tools/design-system.test.mjs
git commit -m "Gallery: a Footer panel with the live theme pill and its status line"
```

---

### Task 8: Rules, README, CHANGELOG, VERSION 3.11.0 and the scaffold sync

About 45 minutes.

**Files:**
- Modify: `libraries/design-system/docs/component-rules.md`, `libraries/design-system/README.md`, `libraries/design-system/CHANGELOG.md`, `libraries/design-system/VERSION`
- Modify: `tools/design-system.test.mjs` (the VERSION test)
- Modify through extract: `scaffolds/web-vite/design-system/`, `scaffolds/web-react-ts/design-system/`

- [ ] **Step 1: Update the VERSION test (it fails first)**

In `tools/design-system.test.mjs`, change the VERSION test's name to `"VERSION is 3.11.0 and README documents …, the layout primitives and the site footer"`, its `assert.equal(read("VERSION").trim(), "3.11.0")`, and add to its needle list: `"site-footer", "theme-pill", "tooltip.js", "brand-icons.js", "data-theme-status", "data-tips", "Icons or text"`. Change the CHANGELOG line to match `3\.11\.0`. Also add, inside the same test:

```js
	const rules = read("docs/component-rules.md");
	assert.match(rules, /## Icons or text/);
	assert.match(rules, /A safety, legal or trust link is always text/);
	assert.match(rules, /except brand marks from `brand-icons\.js`/);
```

Run: `node --test --test-name-pattern="VERSION" tools/design-system.test.mjs`. Expected: FAIL on `3.11.0`.

- [ ] **Step 2: Component rules**

In `libraries/design-system/docs/component-rules.md`, change the last Icons bullet to:

```markdown
- one stroke family — no mixing in filled or outline icons from elsewhere, except brand marks from `brand-icons.js` (a mark is drawn the way its owner draws it)
```

(The existing bullet already carries a dash; keep it as it stands and only append the exception.) Then add, after § Icons:

```markdown
## Icons or text
- an icon where the meaning is universal, short text where it is not: a brand mark linking to that brand, sun, monitor and moon for the theme
- not universal: "Report an error", "About and liability", "Delete your history", a privacy promise; a wrong guess at an icon costs the reader more than the words take
- **A safety, legal or trust link is always text**
- every icon-only control has a hidden name (`.sr-only` text) in every language the app ships, and a tooltip (`.tip`) with the same name for mouse users
- this applies to headers and toolbars too, not only footers
```

- [ ] **Step 3: README**

In `libraries/design-system/README.md`:

In § Structure, change the `components/` line to end `… \`icon\`, \`picker\`, \`theme-pill\`, \`tooltip\` (CSS) + \`icons.js\` (the SVG set) + \`brand-icons.js\` (filled brand marks) + \`picker.js\` and \`tooltip.js\` (behaviour)`, and the `compositions/` line to list `site-footer` after `empty-state`.

After § Icons, add:

```markdown
## Brand marks

`components/brand-icons.js` is the one place a filled icon is allowed: `brandIcon(name, { size = 20 })`
returns a brand's own mark, unaltered, coloured through `currentColor`, decorative like every icon.
It ships `github` only; a project that needs another mark adds it here with the same comment block
(source, licence, logo guidelines, checked date). An unknown name returns `""`. `BRAND_NAMES` lists the set.

## Icons or text

An icon where the meaning is universal, short text where it is not. A safety, legal or trust link
is always text. Every icon-only control has a hidden name (`.sr-only`) in every language the app
ships and a tooltip with the same name for mouse users. The rule and its examples:
`docs/component-rules.md` § Icons or text.

## Tooltip

Inside any control that carries `tip-host`: `<span class="tip" aria-hidden="true"><span class="tip-bubble">Name</span></span>`.
Below by default; `tip-above` for controls near the bottom of the screen; `tip-start` and `tip-end`
align to the control's edge for the first and last control at a page edge, so a bubble never leaves
the viewport. Tips show on hover and `:focus-visible`, only on pointer devices (`(hover: hover) and
(pointer: fine)`), at once and with no motion. Wrap the controls in a `[data-tips]` container and load
`components/tooltip.js` (a classic script): Escape hides the container's tips until the pointer or
focus returns to a host (WCAG 1.4.13).

## Theme pill

`<div class="theme-pill" role="group" aria-label="Theme">` with three `button.theme-pill-btn.tip-host`
in the order light, system, dark, each `data-theme-set` plus `aria-pressed="false"`, an icon (`sun`,
`monitor`, `moon`), a `.sr-only` name and a tip. `theme-toggle.js` marks the pressed one. A screen
uses the pill or the 3.8.0 picker, never both. The Footer panel in the gallery shows the markup.

## Site footer

`compositions/site-footer.css`: a lead that must be read, text links under a small label, a two-line
note and a bar with brand marks and the theme pill. A stack below 1024 px, one spread row from 1024 px,
the same reading order at every width. The bar is a `.control-row`, so layout-audit checks it; the
label carries `data-align="label"`. The full markup and the rules for the note and the status element
sit in the comment at the top of the file. The note is each project's own true statement: "No tracking.
No cookies." holds for the gallery, and a site with analytics may not copy it unchanged.

Browser check: the layout-audit job in CI runs the library's own fixtures, not the gallery, so the
footer's check over the shared matrix runs by hand before a tag:
`node selftest/serve.mjs` and `node selftest/gallery-footer.mjs` from `libraries/layout-audit`, with
the counts pasted into the PR. The audit skips the visually hidden label from 1024 px (a 1 px box), so
the label contract is proven below 1024 px and pinned by a static test above it.
```

In § Theme behavior, after the sentence ending "goes in 4.0.0.", add:

```markdown
Since 3.11.0 the script also marks every `button[data-theme-set][aria-pressed]` (`"true"` on the
current choice, System when no key is stored) on load, after every click and on the `storage` and
`prefers-color-scheme` events; a button without `aria-pressed` in its markup is never touched. A view
that renders such a button after load sets `aria-pressed` itself from `readPreference`. After a click
on such a button, the pressed one included, every `[data-theme-status]` element gets "Theme: Dark"
(the group's `aria-label`, the button's `.sr-only` text), cleared first and written on the next frame
so a repeated press is announced. Put one live region in the page's first HTML, outside anything a view
re-renders, as `<p class="sr-only" role="status" data-theme-status></p>`; a second element with the
attribute and no role is a visible echo, which is how the gallery shows the line.
```

- [ ] **Step 4: CHANGELOG and VERSION**

Write `3.11.0` to `libraries/design-system/VERSION` (keep the file's existing line ending). At the top of `CHANGELOG.md`, under the intro paragraph, copy the `## 3.10.0 — 2026-11-04` heading line, change it to `3.11.0` and today's date (run `date +"%Y-%m-%d"` first), and write under it:

```markdown
The site footer pattern (`docs/specs/2026-10-17-site-footer.md`). Additive. One behaviour change to check: `theme-toggle.js` now writes `aria-pressed` on every `button[data-theme-set][aria-pressed]`, so a consumer with its own pressed logic on such buttons has two writers and should drop its own.

- **New `compositions/site-footer.css`:** lead, labelled text links, two-line note, a `.control-row` bar of brand marks and the theme pill. A stack below 1024 px, one spread row from 1024 px. The note is each project's own true statement.
- **New `components/theme-pill.css`:** light, system, dark as three 44 px round icon buttons in one pill; pressed state from `aria-pressed`, `Highlight` fill in forced colours.
- **New `components/tooltip.css` + `tooltip.js`:** hover and focus tooltips on pointer devices only, `tip-above`, `tip-start`, `tip-end`; Escape hides them per `[data-tips]` container until the pointer or focus returns (WCAG 1.4.13).
- **New `components/brand-icons.js`:** `brandIcon(name)`, filled marks with their provenance; ships `github` (Octicons, MIT).
- **`theme/theme-toggle.js` v3:** marks `aria-pressed` on opt-in buttons (load, click, `storage`, `prefers-color-scheme`); writes the group and button name into every `[data-theme-status]` after every click on such a button, the pressed one included. No strings in the script; guarded against a double install. The gallery's `app.js` dropped its own loop.
- **`icons.js`:** `monitor`. Fifteen icons.
- **Rules:** `docs/component-rules.md` § Icons or text (an icon where the meaning is universal, short text where it is not; a safety, legal or trust link is always text), and the brand-mark exception under § Icons.
- Static tests pin every file; `tools/design-system-dom.test.mjs` runs the two scripts in jsdom.
```

- [ ] **Step 5: Sync the scaffolds**

From the workbench root:

```bash
node tools/extract.mjs design-system web-vite
node tools/extract.mjs design-system web-react-ts
git status --short scaffolds
```

Expected: both report an update to 3.11.0; the diff touches only each scaffold's `design-system/` folder. Then the full root suite without the skip pattern: `node --test "tools/*.test.mjs"` and `node tools/check-links.mjs`. Expected: PASS, the scaffold-sync test included.

- [ ] **Step 6: Scaffold unit suites still pass**

```bash
cd scaffolds/web-vite && npm test
cd ../web-react-ts && npm test
```

Expected: PASS (the React header uses `data-theme-set` without `aria-pressed`, so v3 leaves it alone). If a scaffold test pins the old `theme-toggle.js` text, update that assertion to v3; report it.

- [ ] **Step 7: Commit**

```bash
git add libraries/design-system/docs/component-rules.md libraries/design-system/README.md libraries/design-system/CHANGELOG.md libraries/design-system/VERSION tools/design-system.test.mjs scaffolds/web-vite/design-system scaffolds/web-react-ts/design-system
git commit -m "Design system 3.11.0: rules, docs and the scaffold sync"
```

---

### Task 9: Browser check over the matrix, push, PR

About 45 minutes.

**Files:**
- Create: `libraries/layout-audit/selftest/gallery-footer.mjs`

- [ ] **Step 1: Write the check script**

`libraries/layout-audit/selftest/gallery-footer.mjs`:

```js
/* Manual browser check for the design system's Footer panel (spec § 6). Not a
   spec file, so `playwright test` ignores it; no CI job audits the gallery.
   Runs the layout audit over the Footer panel at every cell of the shared matrix
   (default theme), checks one row at 1280 px, and hovers the first and last
   tooltip host at 320 px with the bubble inside the viewport. Prints the counts
   to paste into the PR. Needs the self-test server: `node selftest/serve.mjs`
   from libraries/layout-audit, then `node selftest/gallery-footer.mjs`. */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { cellName, cells, TEXT_SPACING_CSS, textSizeCss, verdict, VIEWPORT_HEIGHT } from "../shared.js";

const ORIGIN = "http://127.0.0.1:4400";
const GALLERY = "/libraries/design-system/gallery/index.html";
const AUDIT = fileURLToPath(new URL("../audit.js", import.meta.url));

async function openFooter(page, width) {
	await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
	await page.goto(ORIGIN + GALLERY);
	await page.evaluate(() => document.fonts.ready);
	await page.click('[data-action="nav"][data-id="footer"]');
	await page.waitForSelector(".site-footer");
}

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "en-US", reducedMotion: "reduce" });
const page = await context.newPage();
let failures = 0;

for (const cell of cells([GALLERY])) {
	await openFooter(page, cell.width);
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ path: AUDIT });
	const report = await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return globalThis.auditLayout(document.querySelector(".site-footer").ownerDocument, { known: [], mark: false });
	});
	const errors = verdict(report, { cell, locale: "en-US", lang: undefined, status: 200 });
	failures += errors.length;
	console.log(`${errors.length === 0 ? "ok  " : "FAIL"} ${cellName(cell)}: ${errors.length} violations${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
}

await openFooter(page, 1280);
const oneRow = await page.evaluate(() => {
	const boxes = [...document.querySelector(".site-footer-row").children].map((el) => el.getBoundingClientRect());
	return Math.max(...boxes.map((b) => b.top)) < Math.min(...boxes.map((b) => b.bottom));
});
if (!oneRow) failures += 1;
console.log(`${oneRow ? "ok  " : "FAIL"} 1280 px: lead, nav, note and bar share one row`);

await openFooter(page, 320);
for (const which of ["first", "last"]) {
	const host = page.locator(".site-footer-bar .tip-host")[which]();
	await host.hover();
	const inside = await host.evaluate((el) => {
		const b = el.querySelector(".tip-bubble").getBoundingClientRect();
		return getComputedStyle(el.querySelector(".tip")).display !== "none" && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight;
	});
	if (!inside) failures += 1;
	console.log(`${inside ? "ok  " : "FAIL"} 320 px: the ${which} tooltip bubble shows inside the viewport`);
}

await browser.close();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
```

If `auditLayout`'s report shape makes `verdict` need a field this script does not set, read `shared.js` `verdict` and `audit.js`'s return value and adapt; do not loosen the check.

- [ ] **Step 2: Run it**

Two terminals, from `libraries/layout-audit`:

```bash
node selftest/serve.mjs
```

```bash
node selftest/gallery-footer.mjs
```

Expected: 16 matrix cells at 0 violations, the one-row line ok, both tooltip lines ok, "All checks passed." Fix any violation in the design system (never in the script) and re-run. Copy the output for the PR.

- [ ] **Step 3: Full verification**

From the root: `node --test "tools/*.test.mjs"` and `node tools/check-links.mjs`. Expected: PASS. Then `git status --short`: only `libraries/layout-audit/selftest/gallery-footer.mjs` is new.

- [ ] **Step 4: Commit, push, open the PR**

```bash
git add libraries/layout-audit/selftest/gallery-footer.mjs
git commit -m "Add the manual browser check for the gallery's Footer panel"
git push -u origin feat/site-footer
```

Open the PR with `gh pr create --base main --title "Site footer, theme pill and tooltip: design system 3.11.0"` and this body, with the check output and the Task 7 screenshots' paths filled in (images are attached by hand; `gh` cannot upload them):

```markdown
Design system 3.11.0 from `docs/specs/2026-10-17-site-footer.md`, planned in `docs/plans/2026-11-04-site-footer.md`.

**What ships**
- `compositions/site-footer.css`: the footer composition, a stack below 1024 px and one spread row from 1024 px.
- `components/theme-pill.css`: light, system, dark as three round icon buttons.
- `components/tooltip.css` + `tooltip.js`: hover and focus tips on pointer devices, Escape dismisses per container.
- `components/brand-icons.js`: filled brand marks with provenance; `github` from Octicons (MIT).
- `theme/theme-toggle.js` v3: marks `aria-pressed` on opt-in buttons and writes a status line; the gallery's own loop is gone, so there is one writer.
- `icons.js` gains `monitor`. `docs/component-rules.md` gains § Icons or text.
- Gallery: a Footer panel with the live pill and a visible status line.
- Tests: static checks in `tools/design-system.test.mjs`, and `tools/design-system-dom.test.mjs` runs the two scripts in jsdom. jsdom is a new root devDependency (test only); the CI test job runs `npm ci`.
- Both scaffolds re-extracted to 3.11.0.

**Consumer note**
`theme-toggle.js` now writes `aria-pressed` on every `button[data-theme-set][aria-pressed]`. A consumer with its own pressed logic on such buttons should drop it.

**Browser check (manual, spec § 6)**
`node selftest/gallery-footer.mjs` over the Footer panel, default theme:

<paste the output>

**Screenshots**
Footer panel at 320 px and 1280 px (attached by hand).

**Not in this PR**
A multi-column footer, marks beyond GitHub, any change to the 3.8.0 picker, Varde adoption, a gallery audit in CI (spec § 8 and § 9).
```

- [ ] **Step 5: Bind the PR and read CI**

Use the ccd_pr tools (`get_status`, `bind_pr` if needed) and report the checks. Required on `main`: ward, gate, the two test jobs and layout-audit. Do not merge.

---

### Task 10: Release (only on my go)

About 15 minutes, after the PR is merged.

- [ ] **Step 1:** On `main` after the merge: `git pull --ff-only`, then `node --test "tools/*.test.mjs"` and `node tools/check-links.mjs`. Expected: PASS.
- [ ] **Step 2:** Tag `v2.23.0` with an annotation that lists design system 3.11.0 (site footer, theme pill, tooltip, brand marks, theme script v3) and the scaffold re-sync. Push the tag.
- [ ] **Step 3:** `gh release create v2.23.0 --verify-tag --latest` with notes written from the annotation and the consumer note. A pushed tag is not a Release; cut both in the same motion.
- [ ] **Step 4:** Update `~/.claude/memory/domain/workbench.md` with a SHIPPED entry and the next step (Varde's own adoption, only when I ask), and the project MEMORY.md pointer line.

---

## Stress test findings (folded in above)

- 🟠 Loopholes: the tooltip hide rule `[data-tips="hidden"] .tip` was (0,2,0) against the (0,3,0) show rules, so Escape would never have won; the static test only checked source order. Fixed: the hide rule is `[data-tips="hidden"] .tip-host > .tip`, after both show rules, and the test asserts the selector and refuses the weak one (Task 3).
- 🟠 Accessibility: the gallery's live region was rendered with the panel (`innerHTML` after load), which the house rule says is often silent on the first change. Adapted: v3 writes every `[data-theme-status]` element, not only the first; the gallery's one live region is `sr-only` in the sidebar's first HTML, and the Footer panel's visible line is an echo with no role. Proof: Task 7 static test (region before `#panel`, echo without role) and the jsdom test "every status element gets the line" (Task 5). Beats mirroring in `app.js` because the consumer markup stays one element and the script stays the one writer.
- 🟡 Accessibility: tips on `:focus-visible` were gated behind `(hover: hover) and (pointer: fine)`, so a keyboard on a tablet got no visible name. Adapted: focus shows a tip on every device, hover only on pointer devices; a tap never yields `:focus-visible` on a button, so the "tap leaves a tooltip" concern does not apply (Task 3, pinned by the static test).
- 🟡 Legal: the gallery is published on GitHub Pages, where the host logs requests; "No tracking" is a claim the gallery cannot fully own, "No analytics. No cookies." is exactly true. Adapted: the gallery's sample note reads "No analytics." (Task 7). The composition comment keeps the spec's generic sample as an example of a project's own claim.
- 🟡 Legal (cite, don't recall): the logo-guideline line in `brand-icons.js` and jsdom's licence are read from their sources during the task (github.com/logos; the installed package's `package.json`), never typed from memory (Tasks 1 and 2).
- 🟡 Security (supply chain): the mark was fetched from Octicons `main`, which moves. Fixed: fetched from the latest release tag, and the comment names the tag (Task 1).
- 🟡 Loopholes: `theme-toggle.js` had no double-install guard, unlike `picker.js` and `tooltip.js`; a second load would have announced twice. Fixed: `data-theme-wired` guard, pinned statically and in jsdom (Task 5).
- 🟡 Loopholes: the first mark's `tip-start` bubble starts 0.75rem left of the text column. Fixed: the composition comment states the inline padding the footer needs; the 320 px hover check proves it in the gallery (Tasks 6 and 9).
- ✅ Security: no new runtime trust boundary; every name reaches the status line through `textContent`; mark names are constants; CI keeps read-only permissions and the existing action pins; the only new dependency is test-only, locked and under Dependabot.
- ✅ Privacy: nothing new is collected or sent; the theme key stays functional storage (ekomloven § 3-15 strictly necessary); fonts stay self-hosted; the browser check runs on loopback.

**Considered and rejected**
- **One-button setting toggle (house rule) instead of three pressed buttons.** The spec (§ 8) chose the pressed-button set to match the 3.8.0 picker rows and Varde's menu: one model across the system.
- **A `MutationObserver` so v3 marks a pill rendered after load.** The spec asks for one set of delegated listeners. A view that renders the pill reads the stored preference itself, which is what the gallery does; Review Focus 1 pins both halves.
- **`white-space: nowrap` on the bubble with long names.** Names are one word by the rule (a tooltip repeats the hidden name); a project with a long name wraps its own bubble.
- **Lowercase user-facing strings slipping past the capital-letter regex.** It is the heuristic the spec asked for; the jsdom tests pin that every word comes from the markup.
- **A status element removed between the clear and the next frame.** The write lands on a detached node and is lost with it; nothing else is affected.
- **A gallery audit job in CI.** Rejected in the spec (§ 8); the manual script in Task 9 is the honest version.

> Stress-tested 2026-11-04 (skill a217382): 4 applied, 4 adapted, 0 decided by me.
