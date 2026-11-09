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
