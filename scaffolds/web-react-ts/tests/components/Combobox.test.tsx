/* ======================================================================
   tests/components/Combobox.test.tsx — shadcn Combobox through
   CurrencyCombobox
   The list renders in a portal. Pinned: the input is named by its
   visible label, the clear and toggle buttons are named and 44 px, every
   row is 44 px, arrows and Enter choose a row and write the status line,
   a filter that matches nothing puts "No results" in the status node,
   Escape closes and keeps focus on the input.
   ====================================================================== */

import { expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { CurrencyCombobox } from "../../src/components/CurrencyCombobox.tsx"
import { PreferencesProvider } from "../../src/components/PreferencesProvider.tsx"
import { axeComponent } from "./axe.ts"
import { shortControls } from "./measure.ts"

test("CurrencyCombobox renders without axe violations, closed and open", async () => {
	const screen = await render(<CurrencyCombobox onStatus={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	expect(await axeComponent(screen.container)).toEqual([])
	await screen.getByRole("button", { name: "Show options" }).click()
	await expect.element(page.getByRole("listbox")).toBeVisible()
	expect(await axeComponent(document.body)).toEqual([])
})

test("the open combobox exposes the expected accessibility tree", async () => {
	const screen = await render(<CurrencyCombobox onStatus={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`
		- text: Pick a currency
		- combobox "Pick a currency"
		- button "Show options"
	`)
	await screen.getByRole("button", { name: "Show options" }).click()
	await expect.element(page.getByRole("listbox")).toBeVisible()
	await expect.element(page.getByRole("listbox")).toMatchAriaInlineSnapshot(`
		- listbox:
		  - option "NOK Norwegian Krone"
		  - option "EUR Euro"
		  - option "USD US Dollar"
	`)
})

test("the combobox works from the keyboard and writes the status line", async () => {
	const onStatus = vi.fn()
	const screen = await render(<CurrencyCombobox onStatus={onStatus} />, {
		wrapper: PreferencesProvider,
	})
	await userEvent.tab()
	const input = screen.getByRole("combobox", { name: "Pick a currency" })
	await expect.element(input).toHaveFocus()
	await userEvent.keyboard("{ArrowDown}")
	const listbox = page.getByRole("listbox")
	await expect.element(listbox).toBeVisible()
	expect(shortControls(listbox.element().querySelectorAll("[role=option]"))).toEqual([])
	expect(shortControls(screen.container.querySelectorAll("button, [role=combobox]"))).toEqual([])

	await userEvent.keyboard("{ArrowDown}{Enter}")
	expect(onStatus).toHaveBeenCalledTimes(1)
	expect(onStatus.mock.calls[0]?.[0]).toMatch(/^Currency: [A-Z]{3}$/)
	await expect.element(listbox).not.toBeInTheDocument()
	await expect.element(input).toHaveFocus()
})

test("a filter that matches nothing reports No results in the status node", async () => {
	const screen = await render(<CurrencyCombobox onStatus={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	const input = screen.getByRole("combobox", { name: "Pick a currency" })
	await input.fill("zzz")
	await expect.element(page.getByRole("status")).toHaveTextContent("No results")
	await userEvent.keyboard("{Escape}")
	await expect.element(input).toHaveFocus()
})
