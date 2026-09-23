/* ======================================================================
   e2e/app.spec.ts — Layer 2: full-page accessibility scan
   Scans the built app with axe in both themes. This is where the
   document-level rules the component tests skip are checked: lang, title,
   landmarks, one h1, skip link. Add a test per route as you build them.
   ====================================================================== */

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

for (const theme of ["dark", "light"]) {
	test(`home page has no axe violations (${theme} theme)`, async ({ page }) => {
		// Seeds the choice the theme toggle would store, before the page's
		// own no-flash script reads it.
		await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
		await page.goto("/")

		// Waiting for rendered content makes a blank page fail instead of
		// passing an empty scan.
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await expect(page.locator("html")).toHaveAttribute("data-theme", theme)

		const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
		expect(violations.map(({ id, help, nodes }) => ({ id, help, count: nodes.length }))).toEqual([])
	})
}

// Translated strings change lengths and accessible names, so the scan runs
// in every language too. The document-level side effects are checked here
// against the real built page.
test("switching to Norsk translates the page with no axe violations", async ({ page }) => {
	await page.goto("/")
	await page.getByRole("button", { name: "Norsk" }).click()

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prosjekt")
	await expect(page.locator("html")).toHaveAttribute("lang", "nb")
	await expect(page).toHaveTitle("Prosjekt")

	const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
	expect(violations.map(({ id, help, nodes }) => ({ id, help, count: nodes.length }))).toEqual([])
})
