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
