import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const AUDIT = fileURLToPath(new URL("../audit.js", import.meta.url));
const FIXTURES = "/libraries/layout-audit/fixtures";

async function audit(page, path, width) {
	await page.setViewportSize({ width, height: 800 });
	await page.goto(`${FIXTURES}/${path}`);
	await page.evaluate(() => document.fonts.ready);
	await page.addScriptTag({ path: AUDIT });
	return page.evaluate(() => globalThis.auditLayout(document));
}

// [contract, exact selector of the reported element]
const BROKEN = [
	["control-row", "#bad-row"],
	["switcher", "#bad-switch"],
	["row-list", "#bad-rows"],
	["row-list", "#bad-rows-left"],
	["row-list", "#bad-collapsed"],
	["card-grid", "#bad-slots"],
	["card-grid", "#bad-slot-card"],
	["label", "#bad-label > dt:nth-child(1)"],
	["label", "#bad-label-orphan"],
	["control-floor", "#bad-floor > button:nth-child(1)"],
	["clipped-text", "#bad-clip > span:nth-child(1)"],
	["data-align", "#bad-typo"],
	["no-sideways-scroll", "#bad-wide"],
];

for (const width of [320, 1280]) {
	test(`bad fixtures: each broken contract is caught at ${width} px`, async ({ page }) => {
		const { violations } = await audit(page, "bad.html", width);
		for (const [contract, selector] of BROKEN) {
			const hit = violations.some((v) => v.contract === contract && v.selector === selector);
			expect(hit, `${contract} at ${selector}\nfound:\n${violations.map((v) => `${v.message} (${v.selector})`).join("\n")}`).toBe(true);
		}
	});

	test(`bad fixtures: a short control inside nested primitives is reported once at ${width} px`, async ({ page }) => {
		const { violations } = await audit(page, "bad.html", width);
		expect(violations.filter((v) => v.selector === "#bad-nested-button")).toHaveLength(1);
	});

	test(`good fixtures: no violations and every primitive counted at ${width} px`, async ({ page }) => {
		const { primitives, violations } = await audit(page, "good.html", width);
		expect(violations.map((v) => `${v.message} (${v.selector})`)).toEqual([]);
		expect(primitives).toBeGreaterThanOrEqual(15);
	});
}

test("a control-row message names the element and the measured numbers", async ({ page }) => {
	const { violations } = await audit(page, "bad.html", 320);
	const row = violations.find((v) => v.selector === "#bad-row");
	expect(row?.message).toMatch(/^control-row: ".+" [\d.]+ px vs [\d.]+ px, bottoms [\d.]+ px apart$/);
});

test("mark: true outlines each violator without moving anything", async ({ page }) => {
	await audit(page, "bad.html", 320);
	const before = await page.evaluate(() => document.querySelector("#bad-row").getBoundingClientRect().toJSON());
	await page.evaluate(() => globalThis.auditLayout(document, { mark: true }));
	const after = await page.evaluate(() => document.querySelector("#bad-row").getBoundingClientRect().toJSON());
	expect(after).toEqual(before);
	await expect(page.locator("#bad-row")).toHaveAttribute("data-layout-violation", "control-row");
	await expect(page.locator("#layout-audit-outline")).toHaveCount(1);
});
