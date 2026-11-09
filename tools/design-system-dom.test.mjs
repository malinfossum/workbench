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
