/* ======================================================================
   e2e/preferences.spec.ts: the preference model on the built page
   The theme rule (stored key ?? prefers-color-scheme) against a real
   browser context, the storage event between two pages, the keyboard
   walk through a picker, and the header measured at 320 px.
   ====================================================================== */

import { expect, test } from "@playwright/test"
import { picker, triggerName } from "./pickers.ts"

test.use({ colorScheme: "light" })

test("no stored key follows prefers-color-scheme", async ({ page }) => {
	await page.goto("/")
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
	await expect(triggerName(page, "theme")).toHaveText("Theme: System (Light)")
	expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull()
})

test("a stored dark key wins over prefers-color-scheme", async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("theme", "dark"))
	await page.goto("/")
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
	await expect(triggerName(page, "theme")).toHaveText("Theme: Dark")
})

test("choosing System removes the key and the page follows the OS again", async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("theme", "dark"))
	await page.goto("/")
	await picker(page, "theme").click()
	await page.getByRole("button", { name: "System (Light)" }).click()

	await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
	await expect(triggerName(page, "theme")).toHaveText("Theme: System (Light)")
	expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull()
	await expect(picker(page, "theme")).toBeFocused()
})

test("a stored 'no' language and 'system' theme are removed on first read", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem("lang", "no")
		localStorage.setItem("theme", "system")
	})
	await page.goto("/")
	await expect(page.locator("html")).toHaveAttribute("lang", "en")
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
	expect(
		await page.evaluate(() => [localStorage.getItem("lang"), localStorage.getItem("theme")])
	).toEqual([null, null])
})

test("a second page flips theme when the first clears the key", async ({ context }) => {
	await context.addInitScript(() => {
		if (localStorage.getItem("theme") === null) localStorage.setItem("theme", "dark")
	})
	const first = await context.newPage()
	await first.goto("/")
	const second = await context.newPage()
	await second.goto("/")
	await expect(second.locator("html")).toHaveAttribute("data-theme", "dark")

	await picker(first, "theme").click()
	await first.getByRole("button", { name: "System (Light)" }).click()

	await expect(first.locator("html")).toHaveAttribute("data-theme", "light")
	await expect(second.locator("html")).toHaveAttribute("data-theme", "light")
	await expect(triggerName(second, "theme")).toHaveText("Theme: System (Light)")
})

test("the language picker works from the keyboard", async ({ page }) => {
	await page.goto("/")
	const record: string[] = []
	const focused = () =>
		page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			if (!el) return "nothing"
			const picker = el.closest("[data-picker]")?.getAttribute("data-picker")
			if (el.tagName === "SUMMARY") return `${picker} trigger`
			return `row "${el.textContent?.trim()}"`
		})
	const openList = page.locator('details[data-picker="lang"][open]')
	// Activation and picker.js's toggle handler run after the key events are
	// acknowledged, so every step waits for the state it expects.
	const step = async (key: string, expectFocus: string, expectOpen: boolean) => {
		await page.keyboard.press(key)
		await expect.poll(focused, { message: key }).toBe(expectFocus)
		await expect(openList, key).toHaveCount(expectOpen ? 1 : 0)
		record.push(
			`${key.padEnd(9)} -> focus: ${expectFocus}, language list ${expectOpen ? "open" : "closed"}`
		)
	}

	// Tab reaches the trigger (after the skip link). Enter opens on the active
	// row (System, since nothing is stored). Arrows wrap at both ends.
	await page.keyboard.press("Tab")
	await step("Tab", "lang trigger", false)
	await step("Enter", 'row "System (English)"', true)
	await step("ArrowUp", 'row "Norsk bokmål"', true)
	await step("ArrowDown", 'row "System (English)"', true)
	await step("ArrowDown", 'row "English"', true)
	await step("End", 'row "Norsk bokmål"', true)
	await step("Home", 'row "System (English)"', true)
	// Escape closes and returns focus to the trigger.
	await step("Escape", "lang trigger", false)
	// Reopened, Tab walks the rows (they are buttons, not a menu); Tab from
	// the last row leaves the disclosure, which closes it, and lands on the
	// theme trigger.
	await step("Enter", 'row "System (English)"', true)
	await step("Tab", 'row "English"', true)
	await step("Tab", 'row "Norsk bokmål"', true)
	await step("Tab", "theme trigger", false)
	// Back to the language picker, choose Norsk with Enter: the list closes,
	// focus returns to the trigger, which now carries the new name.
	await step("Shift+Tab", "lang trigger", false)
	await step("Enter", 'row "System (English)"', true)
	await step("ArrowUp", 'row "Norsk bokmål"', true)
	await step("Enter", "lang trigger", false)
	await expect(triggerName(page, "lang")).toHaveText("Språk: Norsk bokmål")
	await expect(page.locator("html")).toHaveAttribute("lang", "nb")

	console.log(`keyboard walk:\n${record.join("\n")}`)
})

test("the header fits at 320 px with every list inside the viewport", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 640 })
	await page.goto("/")
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

	const layout = await page.evaluate(() => {
		const rect = (el: Element | null) => {
			const r = el?.getBoundingClientRect()
			return r
				? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height }
				: null
		}
		return {
			scrollWidth: document.documentElement.scrollWidth,
			header: rect(document.querySelector("header")),
			triggers: [...document.querySelectorAll("details[data-picker] > summary")].map(rect),
		}
	})
	console.log(`header at 320px: ${JSON.stringify(layout)}`)
	expect(layout.scrollWidth).toBe(320)
	expect(layout.header?.w).toBeLessThanOrEqual(320)
	expect(layout.triggers).toHaveLength(3)
	for (const trigger of layout.triggers) {
		expect(trigger?.w).toBe(44)
		expect(trigger?.h).toBe(44)
		expect(trigger?.bottom).toBe(layout.triggers[0]?.bottom)
	}

	for (const name of ["lang", "theme", "currency"] as const) {
		await picker(page, name).click()
		const list = await page
			.locator(`details[data-picker="${name}"] .picker-list`)
			.evaluate((el) => {
				const r = el.getBoundingClientRect()
				const rows = [...el.querySelectorAll(".picker-row")].map(
					(row) => row.getBoundingClientRect().height
				)
				return { left: r.left, right: r.right, rows }
			})
		console.log(`${name} list at 320px: ${JSON.stringify(list)}`)
		expect(list.left).toBeGreaterThanOrEqual(0)
		expect(list.right).toBeLessThanOrEqual(320)
		for (const height of list.rows) expect(height).toBeGreaterThanOrEqual(44)
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
	}
})
