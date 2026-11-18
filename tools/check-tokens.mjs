#!/usr/bin/env node
// Token hygiene for the design system's CSS. Three rules:
//   raw-color       a hex or color function outside tokens/ (use a token)
//   physical        margin-left, border-bottom, left, text-align: left... (use the logical form)
//   focus-visible   a :focus selector with no :focus-visible in it (keyboard-only rings)
// A declaration that must stay raw carries `/* token-check: allow <reason> */` on its line.
// Usage: node tools/check-tokens.mjs [dir...]   exit 1 when anything is flagged.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ds = join(root, "libraries", "design-system");
export const DEFAULT_DIRS = ["components", "compositions", "primitives"].map((d) => join(ds, d));

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
// color-mix() is fine: it mixes tokens. color() is a function, color-mix( is not matched.
const COLOR_FN = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
const PHYSICAL_PROP =
	/^(?:(?:margin|padding|scroll-margin|scroll-padding)-(?:left|right|top|bottom)|border-(?:left|right|top|bottom)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius|left|right|top|bottom)$/;
const PHYSICAL_VALUE = { "text-align": /^(left|right)\b/, float: /^(left|right)\b/, clear: /^(left|right)\b/ };
const LOGICAL = {
	"margin-left": "margin-inline-start", "margin-right": "margin-inline-end",
	"margin-top": "margin-block-start", "margin-bottom": "margin-block-end",
	"padding-left": "padding-inline-start", "padding-right": "padding-inline-end",
	"padding-top": "padding-block-start", "padding-bottom": "padding-block-end",
	left: "inset-inline-start", right: "inset-inline-end", top: "inset-block-start", bottom: "inset-block-end",
};

function logicalFor(prop) {
	if (LOGICAL[prop]) return LOGICAL[prop];
	return prop
		.replace("-left", "-inline-start").replace("-right", "-inline-end")
		.replace("-top", "-block-start").replace("-bottom", "-block-end");
}

// Blank out comments but keep their length, so offsets still map to lines.
function stripComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
}

export function checkCss(css, file = "<css>") {
	const findings = [];
	const lines = css.split(/\r?\n/);
	const allowed = (line) => /token-check:\s*allow\b/.test(lines[line - 1] ?? "");
	const code = stripComments(css);
	const lineAt = (offset) => code.slice(0, offset).split("\n").length;
	const add = (offset, rule, message) => {
		const line = lineAt(offset);
		if (!allowed(line)) findings.push({ file, line, rule, message });
	};

	// Walk the stylesheet: text before `{` is a selector or at-rule prelude,
	// text ending in `;` or `}` is a declaration.
	let start = 0;
	for (let i = 0; i < code.length; i++) {
		const ch = code[i];
		if (ch !== "{" && ch !== "}" && ch !== ";") continue;
		const raw = code.slice(start, i);
		const lead = raw.length - raw.trimStart().length;
		const text = raw.trim();
		const at = start + lead;
		start = i + 1;
		if (!text) continue;
		if (ch === "{") {
			if (text.startsWith("@")) continue;
			for (const sel of text.split(",")) {
				if (/:focus(?![\w-])/.test(sel) && !/:focus-visible/.test(sel)) {
					add(at, "focus-visible", `"${sel.trim()}" uses :focus; use :focus-visible so the ring shows for keyboard users only`);
				}
			}
			continue;
		}
		const colon = text.indexOf(":");
		if (colon < 0 || text.startsWith("@")) continue;
		const prop = text.slice(0, colon).trim().toLowerCase();
		const value = text.slice(colon + 1).trim();
		if (HEX.test(value)) add(at, "raw-color", `${prop}: ${value} has a raw hex color; use a token`);
		for (const m of value.matchAll(COLOR_FN)) {
			if (!m[2].includes("var(")) add(at, "raw-color", `${prop}: ${m[0]} is a raw color; use a token`);
		}
		if (PHYSICAL_PROP.test(prop)) add(at, "physical", `${prop} is physical; use ${logicalFor(prop)}`);
		const valueRule = PHYSICAL_VALUE[prop];
		if (valueRule?.test(value)) add(at, "physical", `${prop}: ${value} is physical; use start or end`);
	}
	return findings;
}

function cssFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return cssFiles(path);
		return name.endsWith(".css") ? [path] : [];
	});
}

export function checkDirs(dirs = DEFAULT_DIRS) {
	return dirs.flatMap(cssFiles).flatMap((f) => checkCss(readFileSync(f, "utf8"), relative(root, f).replaceAll("\\", "/")));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const args = process.argv.slice(2);
	const findings = checkDirs(args.length ? args : DEFAULT_DIRS);
	for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule}  ${f.message}`);
	console.log(findings.length ? `${findings.length} token hygiene finding(s)` : "Token hygiene: clean");
	process.exitCode = findings.length ? 1 : 0;
}
