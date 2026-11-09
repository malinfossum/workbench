import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
	document.documentElement.dataset.theme = "dark"; // as the head snippet would have set it
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
