/* ======================================================================
   e2e/app.spec.ts: Layer 2: full-page accessibility scan
   Scans the built app with axe in both themes, in Norwegian, and with
   each picker open. This is where the document-level rules the component
   tests skip are checked: lang, title, landmarks, one h1, skip link. Add
   a test per route as you build them.
   ====================================================================== */

import { expect, test } from "@playwright/test"
import { picker, scan } from "./pickers.ts"

for (const theme of ["dark", "light"]) {
	test(`home page has no axe violations (${theme} theme)`, async ({ page }) => {
		// Seeds the choice the theme picker would store, before the page's
		// own no-flash script reads it.
		await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
		await page.goto("/")

		// Waiting for rendered content makes a blank page fail instead of
		// passing an empty scan.
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
		expect(await scan(page)).toEqual([])
	})
}

// Translated strings change lengths and accessible names, so the scan runs
// in every language too. The document-level side effects are checked here
// against the real built page.
test("switching to Norsk bokmål translates the page with no axe violations", async ({ page }) => {
	await page.goto("/")
	// The browser is pinned to en-US, so System resolves to English and USD.
	await expect(page.getByText("Example price: $949.00")).toBeVisible()
	await picker(page, "lang").click()
	await page.getByRole("button", { name: "Norsk bokmål" }).click()

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prosjekt")
	await expect(page.locator("html")).toHaveAttribute("lang", "nb")
	await expect(page).toHaveTitle("Prosjekt")
	await expect(page.getByText("Eksempelpris: 949,00 USD")).toBeVisible()

	// The price follows the currency picker too: separators from the
	// language, the symbol from the currency.
	await picker(page, "currency").click()
	await page.locator('[data-currency="NOK"]').click()
	await expect(page.getByText("Eksempelpris: 949,00 kr")).toBeVisible()
	expect(await scan(page)).toEqual([])
})

test("each picker open, one at a time, has no axe violations", async ({ page }) => {
	await page.goto("/")
	for (const name of ["lang", "theme", "currency"] as const) {
		await picker(page, name).click()
		await expect(page.locator("details[data-picker][open]")).toHaveCount(1)
		await expect(page.locator(`details[data-picker="${name}"][open]`)).toHaveCount(1)
		expect(await scan(page)).toEqual([])
	}
})
