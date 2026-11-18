import { expect, test } from "@playwright/test";
import { measureVitals, VITALS_BUDGET } from "../playwright.js";

test("a still page reports LCP and no layout shift inside the default budget", async ({ page }) => {
	const { lcp, cls, errors } = await measureVitals(page, "/libraries/layout-audit/fixtures/good.html");
	expect(lcp).toBeGreaterThan(0);
	expect(cls).toBeLessThanOrEqual(VITALS_BUDGET.cls);
	expect(errors).toEqual([]);
});

test("a late banner is a layout shift over budget", async ({ page }) => {
	const { cls, errors } = await measureVitals(page, "/libraries/layout-audit/fixtures/shift.html");
	expect(cls).toBeGreaterThan(VITALS_BUDGET.cls);
	expect(errors.join("\n")).toMatch(/^CLS \d\.\d{3} is over the 0\.1 budget$/m);
});

test("a tight LCP budget fails with the lab-number note", async ({ page }) => {
	const { errors } = await measureVitals(page, "/libraries/layout-audit/fixtures/good.html", { budget: { lcp: 0, cls: 1 } });
	expect(errors.join("\n")).toMatch(/LCP \d+ ms is over the 0 ms budget \(lab number\)/);
});
