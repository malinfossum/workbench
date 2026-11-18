import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCss, checkDirs } from "./check-tokens.mjs";

const rules = (css) => checkCss(css).map((f) => `${f.line}:${f.rule}`);

test("the design system's components, compositions and primitives are clean", () => {
	assert.deepEqual(checkDirs(), []);
});

test("raw colors are flagged, tokens and color-mix are not", () => {
	assert.deepEqual(rules(".a { color: #fff; }"), ["1:raw-color"]);
	assert.deepEqual(rules(".a {\n  background: rgb(0 0 0 / 40%);\n}"), ["2:raw-color"]);
	assert.deepEqual(rules(".a { color: oklch(70% 0.1 200); }"), ["1:raw-color"]);
	assert.deepEqual(rules(".a { color: var(--text); border-color: rgb(var(--info-rgb) / 35%); }"), []);
	assert.deepEqual(rules(".a { color: color-mix(in oklab, var(--accent) 20%, transparent); }"), []);
});

test("an id selector or a url fragment is not a hex color", () => {
	assert.deepEqual(rules("#fab { color: var(--text); }"), []);
	assert.deepEqual(rules(".a { mask: url(#fade); fill: url(icons.svg#abc); }"), []);
});

test("a corner radius gets the right logical name", () => {
	assert.match(checkCss(".a { border-top-left-radius: 0; }")[0].message, /use border-start-start-radius$/);
	assert.match(checkCss(".a { border-bottom-right-radius: 0; }")[0].message, /use border-end-end-radius$/);
});

test("physical properties and values are flagged, logical ones are not", () => {
	assert.deepEqual(rules(".a { margin-left: 0; border-bottom-color: red; left: 0; }"), [
		"1:physical",
		"1:physical",
		"1:physical",
	]);
	assert.deepEqual(rules(".a { text-align: left; float: right; }"), ["1:physical", "1:physical"]);
	assert.deepEqual(rules(".a { margin-inline-start: 0; border-block-end: 1px solid; text-align: start; }"), []);
});

test(":focus needs :focus-visible", () => {
	assert.deepEqual(rules(".a:focus { outline: 2px solid; }"), ["1:focus-visible"]);
	assert.deepEqual(rules(".a:focus-visible { outline: 2px solid; }"), []);
	assert.deepEqual(rules(".a:focus:not(:focus-visible) { outline: none; }"), []);
	assert.deepEqual(rules(".a:focus-within { gap: 0; }"), []);
});

test("comments are ignored and an allow comment exempts its line", () => {
	assert.deepEqual(rules("/* margin-left: #fff; */ .a { color: var(--text); }"), []);
	assert.deepEqual(rules(".a { box-shadow: 0 0 0 rgb(0 0 0); /* token-check: allow reason */ }"), []);
	const multiLine = ".a {\n\tbox-shadow:\n\t\t0 0 0 var(--x),\n\t\t0 1px 0 #000; /* token-check: allow reason */\n}";
	assert.deepEqual(rules(multiLine), []);
	assert.deepEqual(rules(multiLine.replace("token-check: allow reason", "note")), ["2:raw-color"]);
});

test("at-rules and custom properties do not trip the walker", () => {
	assert.deepEqual(rules("@media (min-width: 48rem) { .a { padding-inline: 0; } }"), []);
	assert.deepEqual(rules("@container (min-width: 20rem) { .a:focus-visible { outline: 0; } }"), []);
});
