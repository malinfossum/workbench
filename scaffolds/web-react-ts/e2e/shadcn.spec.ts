/* ======================================================================
   e2e/shadcn.spec.ts: Layer 2 for the shadcn examples
   Opens the dialog, the menu and the combobox on the built page and
   scans each open state with axe, in both themes, in Norwegian, and at
   320 px. Also the document-level behaviour the component tests cannot
   see: the dialog traps focus and locks scroll, and the header pickers
   still work while a menu is open.
   ====================================================================== */

import { expect, type Page, test } from "@playwright/test"
import { picker, scan } from "./pickers.ts"

async function openDialog(page: Page, name = "Reset") {
	await page.getByRole("button", { name, exact: true }).click()
	await expect(page.getByRole("dialog")).toBeVisible()
}

async function openMenu(page: Page, name = "Sort") {
	await page.getByRole("button", { name, exact: true }).click()
	await expect(page.getByRole("menu")).toBeVisible()
}

async function openCombobox(page: Page) {
	await page.getByRole("combobox").click()
	await page.keyboard.press("ArrowDown")
	await expect(page.getByRole("listbox")).toBeVisible()
}

for (const theme of ["dark", "light"]) {
	test(`each shadcn example open has no axe violations (${theme} theme)`, async ({ page }) => {
		await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
		await page.goto("/")
		await expect(page.locator("html")).toHaveAttribute("data-theme", theme)

		await openDialog(page)
		expect(await scan(page)).toEqual([])
		await page.keyboard.press("Escape")
		await expect(page.getByRole("dialog")).toHaveCount(0)

		await openMenu(page)
		expect(await scan(page)).toEqual([])
		await page.keyboard.press("Escape")
		await expect(page.getByRole("menu")).toHaveCount(0)

		await openCombobox(page)
		expect(await scan(page, [COMBOBOX_OPEN_EXCEPTION])).toEqual([])
	})
}

test("the examples translate: the dialog and the status line read Norwegian", async ({ page }) => {
	await page.goto("/")
	await picker(page, "lang").click()
	await page.getByRole("button", { name: "Norsk bokmål" }).click()
	await expect(page.locator("html")).toHaveAttribute("lang", "nb")

	await openDialog(page, "Nullstill")
	await expect(page.getByRole("dialog", { name: "Nullstille antallet?" })).toBeVisible()
	expect(await scan(page)).toEqual([])
	await page.keyboard.press("Escape")

	await openMenu(page, "Sorter")
	await page.getByRole("menuitem", { name: "Navn" }).click()
	await expect(page.getByRole("status").filter({ hasText: "Sortert etter Navn" })).toBeVisible()
})

test("the dialog traps focus and locks scroll", async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 300 })
	await page.goto("/")
	await openDialog(page)
	const dialog = page.getByRole("dialog")

	// Focus never returns to the app behind the dialog. Base UI keeps two
	// visually hidden dismiss buttons next to the dialog for touch screen
	// readers, so "inside" means "not in #root", not "inside role=dialog".
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press("Tab")
		const inApp = await page.evaluate(() =>
			document.getElementById("root")?.contains(document.activeElement)
		)
		expect(inApp).toBe(false)
	}
	await expect(dialog).toBeVisible()

	// Opening scrolled the trigger into view; from there, a wheel must not move the page.
	const before = await page.evaluate(() => window.scrollY)
	await page.mouse.wheel(0, 600)
	expect(await page.evaluate(() => window.scrollY)).toBe(before)
	await page.keyboard.press("Escape")
	await expect(dialog).toHaveCount(0)
	await expect(page.locator("[data-slot=dialog-trigger]")).toBeFocused()
})

test("the 320 px layout holds with each example open", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 640 })
	await page.goto("/")
	const noOverflow = () =>
		page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)

	await openDialog(page)
	expect(await noOverflow()).toBe(true)
	expect(await scan(page)).toEqual([])
	await page.keyboard.press("Escape")

	await openMenu(page)
	expect(await noOverflow()).toBe(true)
	await page.keyboard.press("Escape")

	await openCombobox(page)
	expect(await noOverflow()).toBe(true)
	expect(await scan(page, [COMBOBOX_OPEN_EXCEPTION])).toEqual([])
})

// While the combobox list is open, Base UI marks everything but the input
// and the list aria-hidden and traps focus between them, so the header's
// pickers are hidden focusables for that moment. axe's aria-hidden-focus
// cannot see the trap and reports them. The component test proves the
// combobox's own markup is clean; this exception is only for the open
// state on the full page, and only for that rule.
const COMBOBOX_OPEN_EXCEPTION = "aria-hidden-focus"

test("a press on a header picker closes an open menu, and the picker then works", async ({
	page,
}) => {
	await page.goto("/")
	await openMenu(page)
	// The menu is modal (Base UI default): the first press outside closes it.
	const box = await picker(page, "theme").boundingBox()
	if (!box) throw new Error("theme picker not rendered")
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
	await expect(page.getByRole("menu")).toHaveCount(0)

	await picker(page, "theme").click()
	await expect(page.locator('details[data-picker="theme"][open]')).toHaveCount(1)
	await page.getByRole("button", { name: "Light", exact: true }).click()
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
})
