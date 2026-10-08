/* ======================================================================
   tests/components/DropdownMenu.test.tsx — shadcn DropdownMenu through
   ExampleMenu
   The menu renders in a portal. Pinned: the trigger is a named button
   with aria-haspopup, the open menu has three 44 px items, arrows move
   between them, Enter chooses and writes the status line, Escape closes
   and focus returns to the trigger.
   ====================================================================== */

import { expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { ExampleMenu } from "../../src/components/ExampleMenu.tsx"
import { PreferencesProvider } from "../../src/components/PreferencesProvider.tsx"
import { axeComponent } from "./axe.ts"
import { shortControls } from "./measure.ts"

test("ExampleMenu renders without axe violations, closed and open", async () => {
	const screen = await render(<ExampleMenu onStatus={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	expect(await axeComponent(screen.container)).toEqual([])
	await screen.getByRole("button", { name: "Sort" }).click()
	await expect.element(page.getByRole("menu")).toBeVisible()
	expect(await axeComponent(document.body)).toEqual([])
})

test("the open menu exposes the expected accessibility tree", async () => {
	const screen = await render(<ExampleMenu onStatus={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`- button "Sort"`)
	await screen.getByRole("button", { name: "Sort" }).click()
	await expect.element(page.getByRole("menu")).toMatchAriaInlineSnapshot(`
		- menu "Sort":
		  - menuitem "Name"
		  - menuitem "Date"
		  - menuitem "Size"
	`)
})

test("the menu works from the keyboard and writes the status line", async () => {
	const onStatus = vi.fn()
	const screen = await render(<ExampleMenu onStatus={onStatus} />, {
		wrapper: PreferencesProvider,
	})
	await userEvent.tab()
	const trigger = screen.getByRole("button", { name: "Sort" })
	await expect.element(trigger).toHaveFocus()
	await userEvent.keyboard("{Enter}")
	const menu = page.getByRole("menu")
	await expect.element(menu).toBeVisible()
	expect(shortControls(menu.element().querySelectorAll("[role=menuitem]"))).toEqual([])

	await userEvent.keyboard("{ArrowDown}")
	await expect.element(page.getByRole("menuitem", { name: "Date" })).toHaveFocus()
	await userEvent.keyboard("{Enter}")
	expect(onStatus).toHaveBeenCalledWith("Sorted by Date")
	await expect.element(menu).not.toBeInTheDocument()
	await expect.element(trigger).toHaveFocus()

	await userEvent.keyboard("{Enter}")
	await expect.element(page.getByRole("menu")).toBeVisible()
	await userEvent.keyboard("{Escape}")
	await expect.element(page.getByRole("menu")).not.toBeInTheDocument()
	await expect.element(trigger).toHaveFocus()
})
