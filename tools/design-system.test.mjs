import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DS = join(dirname(fileURLToPath(import.meta.url)), "..", "libraries", "design-system");
// Normalize CRLF so content assertions hold on Windows checkouts (core.autocrlf).
export const read = (p) => readFileSync(join(DS, p), "utf8").replaceAll("\r\n", "\n");

test("every @font-face src resolves to a bundled real woff2", () => {
	const css = read("tokens/typography.css");
	const srcs = [...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g)].map((m) => m[1]);
	assert.ok(srcs.length >= 15, `expected >=15 font srcs (7 existing + 8 new), got ${srcs.length}`);
	for (const rel of srcs) {
		const abs = join(DS, rel);
		assert.ok(existsSync(abs), `missing font file ${rel}`);
		const magic = readFileSync(abs).subarray(0, 4).toString("ascii");
		assert.equal(magic, "wOF2", `${rel} is not a woff2 file`);
	}
});

test("base identity (:root) is Sora display + Figtree body, Inter is gone", () => {
	// This is the FALLBACK identity, not what unpinned consumers render (see the next
	// test) — gold/wend/tidsro/kenaz never set their own --font-display, so they still
	// derive Sora from here. Changing these values would silently reskin all four.
	const css = read("tokens/typography.css");
	assert.match(css, /--font-sans:\s*"Figtree"/, "--font-sans must lead with Figtree");
	assert.match(css, /--font-display: "Sora", "Figtree", sans-serif;/);
	assert.ok(!css.includes("Inter"), "Inter must not appear in typography.css");
	for (const fam of ["Sora", "Figtree", "Instrument Serif", "Schibsted Grotesk", "Atkinson Hyperlegible Next", "Fraunces", "Space Grotesk"]) {
		assert.ok(css.includes(`font-family: "${fam}"`), `missing @font-face for ${fam}`);
	}
	assert.match(css, /--weight-display: 600;/);
	assert.match(css, /--tracking-display: -0\.03em;/);
	assert.match(css, /--tracking-heading: -0\.02em;/);
});

test("default identity (3.0.0) is a Kenaz/Gold blend: no-palette state renders warm-black Kenaz ground with a midpoint amber accent", () => {
	const colors = read("tokens/colors.css");
	assert.match(colors, /\[data-palette="default"\],\nhtml:not\(\[data-palette\]\) \{/, "the default block must exist in colors.css");
	const block = blockVars(colors, /\[data-palette="default"\],\nhtml:not\(\[data-palette\]\) \{/);
	assert.equal(block["--accent-rgb"], "222 166 72", "default accent must be the Kenaz/Gold midpoint");
	assert.equal(block["--surface-2"], "#0b0a09", "default surfaces must be Kenaz's");
	assert.equal(block["--on-accent"], "#241704", "default on-accent must be Kenaz's dark ink");

	const oled = read("tokens/palettes/_oled.css");
	assert.ok(!oled.includes('[data-palette="default"]'), "_oled.css selector list must no longer carry the default identity");
	assert.ok(!oled.includes("html:not([data-palette])"), "_oled.css selector list must no longer carry the no-palette-attribute state");

	const typo = read("tokens/typography.css");
	assert.ok(!typo.includes('[data-palette="default"]'), "typography.css must carry no default block — Sora inherits from :root");
});

test("base headings and stat numbers carry the display face", () => {
	const base = read("base/base.css");
	assert.match(base, /h1,\nh2,\nh3,\nh4 \{[^}]*font-family: var\(--font-display\);/s);
	assert.match(base, /h1,\nh2,\nh3,\nh4 \{[^}]*font-weight: var\(--weight-display\);/s);
	assert.match(base, /h1,\nh2,\nh3,\nh4 \{[^}]*letter-spacing: var\(--tracking-heading\);/s);
	assert.match(base, /h1,\nh2 \{\n\tletter-spacing: var\(--tracking-display\);\n\}/);
	assert.match(read("components/stat.css"), /\.stat-value \{[^}]*font-family: var\(--font-display\);/s);
});

test("[hidden] wins against component display rules, once, at the root", () => {
	// An author `display` beats the UA [hidden] rule regardless of specificity,
	// so the reset must carry an !important guard (#6).
	assert.match(read("base/reset.css"), /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
	// With the root guard in place, no component needs a local [hidden] patch.
	for (const file of ["tabs", "button", "badge", "input", "nav", "toast"]) {
		assert.ok(!read(`components/${file}.css`).includes("[hidden]"), `components/${file}.css should not carry a local [hidden] patch`);
	}
});

test("radius scale is the crisp remap", () => {
	const css = read("tokens/radius.css");
	for (const [token, value] of Object.entries({
		"--radius-xs": "0.25rem",
		"--radius-sm": "0.375rem",
		"--radius-md": "0.5rem",
		"--radius-lg": "0.75rem",
		"--radius-xl": "1rem",
		"--radius-pill": "999px",
	})) {
		assert.ok(css.includes(`${token}: ${value};`), `${token} should be ${value}`);
	}
});

test("components sit on the right radius size class", () => {
	for (const [file, token] of [
		["components/badge.css", "--radius-xs"],
		["components/button.css", "--radius-sm"],
		["components/input.css", "--radius-sm"],
		["components/card.css", "--radius-md"],
		["components/table.css", "--radius-md"],
		["components/alert.css", "--radius-md"],
		["components/modal.css", "--radius-lg"],
	]) {
		assert.ok(read(file).includes(`border-radius: var(${token})`), `${file} should use ${token}`);
	}
});

test("interactive controls are 44px, the touch-target floor", () => {
	// Was pinned to 2.625rem (42px) from 2.0.0's shape pass until 2.0.2. WCAG 2.5.8 (AA) only
	// asks for 24x24, so 42px was never a conformance failure — but 44x44 is the house standard
	// from 2.5.5 Enhanced, and it is the number consumers write their own a11y checks against.
	// Wend synced 1.2.0 -> 2.0.1, its 44px rule met a 42px bundle, and this assertion was
	// happily green the whole time. Asserting an inequality rather than an exact string is the
	// difference: a future shape pass may raise these, and only a DROP should fail.
	const FLOOR_REM = 2.75;
	for (const file of ["components/button.css", "components/input.css", "components/tabs.css"]) {
		const declared = [...read(file).matchAll(/min-height:\s*([\d.]+)rem/g)].map((m) => Number(m[1]));
		assert.ok(declared.length > 0, `${file}: no rem min-height found — did the control lose its floor?`);
		// .textarea's 8rem is legitimately taller; only the SHORTEST control is a floor question.
		const shortest = Math.min(...declared);
		assert.ok(
			shortest >= FLOOR_REM,
			`${file}: shortest min-height is ${shortest}rem (${shortest * 16}px), under the ` +
				`${FLOOR_REM}rem (${FLOOR_REM * 16}px) floor`,
		);
	}
	// An icon button has no label to stretch it, so its width is its whole hit area.
	const iconWidth = Number(read("components/button.css").match(/\.icon-btn \{\s*width:\s*([\d.]+)rem/)?.[1]);
	assert.ok(iconWidth >= FLOOR_REM, `.icon-btn is ${iconWidth}rem wide, under the ${FLOOR_REM}rem floor`);
});

function luminance([r, g, b]) {
	const lin = (c) => {
		c /= 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}
function blockVars(css, selectorRe) {
	const m = css.match(selectorRe);
	if (!m) return {};
	const body = css.slice(m.index).match(/\{([\s\S]*?)\n\}/)[1];
	const vars = {};
	for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) vars[name] = value.trim();
	return vars;
}
function resolveColor(value, scope) {
	const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hex) {
		let h = hex[1];
		if (h.length === 3) h = [...h].map((c) => c + c).join("");
		return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
	}
	const triplet = value.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
	if (triplet) return triplet.slice(1, 4).map(Number);
	const rgbvar = value.match(/^rgb\(var\((--[a-z0-9-]+)\)\)$/);
	if (rgbvar) return resolveColor(scope(rgbvar[1]), scope);
	const varref = value.match(/^var\((--[a-z0-9-]+)\)$/);
	if (varref) return resolveColor(scope(varref[1]), scope);
	const mix = value.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/);
	if (mix) {
		const a = resolveColor(mix[1], scope);
		const b = mix[3] === "black" ? [0, 0, 0] : resolveColor(mix[3], scope);
		const p = Number(mix[2]) / 100;
		return a.map((c, i) => Math.round(c * p + b[i] * (1 - p)));
	}
	throw new Error(`cannot resolve color: ${value}`);
}

test("solid primary button meets 4.5:1 in every theme and palette", () => {
	const colors = read("tokens/colors.css");
	const scopes = [
		{ label: "default dark", layers: [blockVars(colors, /:root \{/)] },
		{ label: "default light", layers: [blockVars(colors, /:root\[data-theme="light"\]/), blockVars(colors, /:root \{/)] },
	];
	for (const file of ["gold.css", "wend.css", "daily.css", "ignite.css", "hugin.css", "classic.css"]) {
		const css = read(`tokens/palettes/${file}`);
		const dark = blockVars(css, /^\[data-palette="[a-z]+"\] \{/m);
		scopes.push({ label: `palette ${file} (dark)`, layers: [dark, blockVars(colors, /:root \{/)] });
		const light = blockVars(css, /\[data-theme="light"\]\[data-palette="[a-z]+"\]/);
		if (Object.keys(light).length > 0) {
			scopes.push({
				label: `palette ${file} (light)`,
				layers: [light, blockVars(colors, /:root\[data-theme="light"\]/), dark, blockVars(colors, /:root \{/)],
			});
		}
	}
	// The shipped "no palette chosen" identity (3.0.0: Kenaz/Gold blend) lives in its own
	// [data-palette="default"] block in colors.css, not in a palettes/*.css file — without
	// this it would be the one identity real users render that this loop never checks.
	const defaultDark = blockVars(colors, /\[data-palette="default"\],\nhtml:not\(\[data-palette\]\) \{/);
	scopes.push({ label: "default identity (dark)", layers: [defaultDark, blockVars(colors, /:root \{/)] });
	const defaultLight = blockVars(colors, /\[data-theme="light"\]\[data-palette="default"\],\nhtml\[data-theme="light"\]:not\(\[data-palette\]\) \{/);
	scopes.push({
		label: "default identity (light)",
		layers: [defaultLight, blockVars(colors, /:root\[data-theme="light"\]/), defaultDark, blockVars(colors, /:root \{/)],
	});
	for (const { label, layers } of scopes) {
		const scope = (name) => {
			for (const layer of layers) if (name in layer) return layer[name];
			throw new Error(`${label}: token ${name} not found`);
		};
		const ink = resolveColor(scope("--on-accent"), scope);
		for (const fill of ["--accent-solid", "--accent-solid-strong"]) {
			const c = contrast(resolveColor(scope(fill), scope), ink);
			assert.ok(c >= 4.5, `${label}: ${fill} vs --on-accent is ${c.toFixed(2)}:1 (needs >=4.5)`);
		}
	}
});

test("default-theme solid button keeps real AA headroom, not a 0.09 margin", () => {
	// The 4.5 floor above catches outright failure; the default identity additionally
	// holds >=5.0 so a small accent nudge can't land it on the AA line unnoticed (#10).
	const colors = read("tokens/colors.css");
	for (const layers of [
		[blockVars(colors, /:root \{/)],
		[blockVars(colors, /:root\[data-theme="light"\]/), blockVars(colors, /:root \{/)],
	]) {
		const scope = (name) => {
			for (const layer of layers) if (name in layer) return layer[name];
			throw new Error(`token ${name} not found`);
		};
		const ink = resolveColor(scope("--on-accent"), scope);
		for (const fill of ["--accent-solid", "--accent-solid-strong"]) {
			const c = contrast(resolveColor(scope(fill), scope), ink);
			assert.ok(c >= 5.0, `default theme: ${fill} vs --on-accent is ${c.toFixed(2)}:1 (needs >=5.0 headroom)`);
		}
	}
});

test("type skins exist, scope via data-typeskin, and are imported", () => {
	const index = read("tokens/palettes/index.css");
	for (const [file, display] of [
		["fraunces.css", "Fraunces"],
		["instrument.css", "Instrument Serif"],
		["nordic.css", "Schibsted Grotesk"],
	]) {
		const css = read(`tokens/palettes/${file}`);
		const skin = file.replace(".css", "");
		assert.ok(css.includes(`[data-typeskin="${skin}"]`), `${file} must scope via data-typeskin`);
		assert.ok(css.includes(`"${display}"`), `${file} must set display font ${display}`);
		assert.ok(index.includes(`./${file}`), `palettes/index.css must import ${file}`);
	}
	for (const file of ["fraunces.css", "instrument.css"]) {
		assert.match(
			read(`tokens/palettes/${file}`),
			/h3,\n\[data-typeskin="[a-z]+"\] h4 \{\n\tfont-family: var\(--font-sans\);/,
			`${file} must return h3/h4 to the body sans (serif reads poorly small)`,
		);
	}
	assert.ok(read("tokens/palettes/nordic.css").includes("Atkinson Hyperlegible Next"), "nordic must set the hyperlegible body");
});

test("every palette's lead typeface is actually bundled", () => {
	// A stack may fall back to system faces, but the FIRST quoted family is the
	// documented identity — it must have an @font-face, or it silently never renders (#9).
	const faces = [...read("tokens/typography.css").matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1]);
	const palettes = readdirSync(join(DS, "tokens", "palettes")).filter((f) => f.endsWith(".css"));
	for (const file of palettes) {
		for (const [, name, lead] of read(`tokens/palettes/${file}`).matchAll(/(--font-[a-z-]+):\s*"([^"]+)"/g)) {
			assert.ok(faces.includes(lead), `${file}: ${name} leads with "${lead}", which has no bundled @font-face`);
		}
	}
	assert.ok(!read("tokens/palettes/daily.css").includes("Inter"), "daily.css must not reference the unbundled Inter");
});

test("nothing overrides the root font size, so rem floors are real px", () => {
	// The 44px figure above holds only while 1rem === 16px. An html { font-size } anywhere in
	// the bundle would rescale every control floor without changing a single min-height value.
	for (const file of ["base/reset.css", "base/base.css", "tokens/typography.css"]) {
		assert.ok(
			!/(?:^|\s|,)html[^{]*\{[^}]*font-size/s.test(read(file)),
			`${file} sets a root font-size, which invalidates every rem-based touch-target floor`,
		);
	}
});

test("VERSION is 3.0.0 and README documents the identity", () => {
	assert.equal(read("VERSION").trim(), "3.0.0");
	const readme = read("README.md");
	for (const needle of ["Sora", "Figtree", "data-typeskin", "fraunces", "instrument", "nordic", "Daily", "hugin", "classic"]) {
		assert.ok(readme.includes(needle), `README should mention ${needle}`);
	}
});
