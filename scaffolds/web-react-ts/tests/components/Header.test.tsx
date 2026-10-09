/* ======================================================================
   tests/components/Header.test.tsx: the three pickers
   Same shape as Counter.test.tsx: axe, the accessibility tree, the
   keyboard. The pickers are checked open one at a time, since a closed
   <details> hides its rows from axe and from the tree.
   ====================================================================== */

import { expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { Header } from "../../src/components/Header.tsx"
import { PreferencesProvider } from "../../src/components/PreferencesProvider.tsx"
import { axeComponent } from "./axe.ts"
import { openPickers, type PickerName, trigger, triggerName } from "./pickers.ts"

const PICKERS: PickerName[] = ["lang", "theme", "currency"]

test("Header renders without axe violations, closed and with each picker open", async () => {
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	expect(await axeComponent(screen.container)).toEqual([])

	for (const name of PICKERS) {
		await userEvent.click(trigger(screen.container, name))
		expect(openPickers(screen.container)).toBe(1)
		expect(await axeComponent(screen.container)).toEqual([])
	}
})

test("Header exposes the expected accessibility tree with the language picker open", async () => {
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	await userEvent.click(trigger(screen.container, "lang"))
	// Aria snapshots match a subset of the tree, so every node the pickers
	// expose is listed here. A <summary> is a disclosure, not a button: closed,
	// its text names the group; open, it is plain text and the list follows.
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`
		- banner:
		  - text: Project
		  - group:
		    - text: "Language: System (English)"
		    - list "Language":
		      - listitem:
		        - button "System (English)"
		      - listitem:
		        - button "English"
		      - listitem:
		        - button "Norsk bokmål"
		  - group: "Theme: System (Dark)"
		  - group: "Currency: System (USD)"
	`)
})

test("rows carry the markup the spec asks for", async () => {
	localStorage.setItem("currency", "EUR")
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	const root = screen.container

	// Language rows: lang on every row, the System row's autonym in its own span.
	const langRows = root.querySelectorAll<HTMLElement>('[data-picker="lang"] .picker-row')
	expect([...langRows].map((row) => row.getAttribute("lang"))).toEqual([null, "en", "nb"])
	expect(langRows[0]?.querySelector("span[lang='en']")?.textContent).toBe("English")
	expect(langRows[0]?.getAttribute("aria-current")).toBe("true")
	expect(langRows[0]?.querySelector("svg.icon")).toBeTruthy()
	expect(langRows[1]?.querySelector("svg.icon")).toBeNull()

	// Currency rows: decorative flag, code column, Intl name; the trigger shows
	// the active flag. In dev the URL keeps its ?no-inline query; the build
	// rewrites it to a hashed file name.
	const eurRow = root.querySelector<HTMLElement>('[data-currency="EUR"]')
	expect(eurRow?.getAttribute("aria-current")).toBe("true")
	expect(eurRow?.querySelector("img.picker-flag")?.getAttribute("alt")).toBe("")
	expect(eurRow?.querySelector("img.picker-flag")?.getAttribute("src")).toMatch(
		/\/eu[-.\w]*\.svg(\?no-inline)?$/
	)
	expect(eurRow?.querySelector(".picker-code")?.textContent).toBe("EUR")
	expect(eurRow?.textContent).toContain("Euro")
	const summary = trigger(root, "currency")
	expect(summary.querySelector("img.picker-flag")?.getAttribute("src")).toMatch(
		/\/eu[-.\w]*\.svg(\?no-inline)?$/
	)
	expect(triggerName(root, "currency")).toBe("Currency: EUR")
})

test("the language picker works from the keyboard and returns focus to its trigger", async () => {
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	const summary = trigger(screen.container, "lang")

	await userEvent.tab()
	await expect.element(summary).toHaveFocus()
	await userEvent.keyboard("{Enter}")
	await expect.element(screen.getByRole("button", { name: "System (English)" })).toHaveFocus()
	await userEvent.keyboard("{ArrowUp}")
	await expect.element(screen.getByRole("button", { name: "Norsk bokmål" })).toHaveFocus()
	await userEvent.keyboard("{Enter}")

	await expect.element(summary).toHaveFocus()
	expect(openPickers(screen.container)).toBe(0)
	expect(triggerName(screen.container, "lang")).toBe("Språk: Norsk bokmål")
	expect(document.documentElement.lang).toBe("nb")
	expect(document.title).toBe("Prosjekt")
	expect(localStorage.getItem("lang")).toBe("nb")
})
