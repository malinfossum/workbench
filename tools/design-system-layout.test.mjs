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

export { read, shippedCss };
