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
