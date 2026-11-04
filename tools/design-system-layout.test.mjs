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

export { read, shippedCss };
