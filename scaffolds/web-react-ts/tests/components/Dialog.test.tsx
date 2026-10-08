/* ======================================================================
   tests/components/Dialog.test.tsx — shadcn Dialog through ResetDialog
   The dialog renders in a portal, outside the render container, so the
   open-state checks run against the page. Pinned: the dialog is named by
   its heading and carries a description, every control inside is 44 px,
   Escape closes and focus returns to the trigger, a confirm calls back
   and closes.
   ====================================================================== */

import { expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { PreferencesProvider } from "../../src/components/PreferencesProvider.tsx"
import { ResetDialog } from "../../src/components/ResetDialog.tsx"
import { axeComponent } from "./axe.ts"
import { shortControls } from "./measure.ts"

test("ResetDialog renders without axe violations, closed and open", async () => {
	const screen = await render(<ResetDialog onConfirm={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	expect(await axeComponent(screen.container)).toEqual([])
	await screen.getByRole("button", { name: "Reset" }).click()
	await expect.element(page.getByRole("dialog")).toBeVisible()
	expect(await axeComponent(document.body)).toEqual([])
})

test("the open dialog exposes the expected accessibility tree", async () => {
	const screen = await render(<ResetDialog onConfirm={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	await screen.getByRole("button", { name: "Reset" }).click()
	await expect.element(page.getByRole("dialog")).toMatchAriaInlineSnapshot(`
		- dialog "Reset the count?":
		  - heading "Reset the count?" [level=2]
		  - paragraph: The count goes back to zero. This cannot be undone.
		  - button "Cancel"
		  - button "Reset"
		  - button "Close"
	`)
})

test("the dialog opens from the keyboard, closes on Escape and returns focus", async () => {
	const screen = await render(<ResetDialog onConfirm={() => {}} />, {
		wrapper: PreferencesProvider,
	})
	await userEvent.tab()
	const trigger = screen.getByRole("button", { name: "Reset" })
	await expect.element(trigger).toHaveFocus()
	await userEvent.keyboard("{Enter}")
	const dialog = page.getByRole("dialog")
	await expect.element(dialog).toBeVisible()
	expect(dialog.element().contains(document.activeElement)).toBe(true)
	await userEvent.keyboard("{Escape}")
	await expect.element(dialog).not.toBeInTheDocument()
	await expect.element(trigger).toHaveFocus()
})

test("confirming calls back and closes; every control inside is 44 px", async () => {
	const onConfirm = vi.fn()
	const screen = await render(<ResetDialog onConfirm={onConfirm} />, {
		wrapper: PreferencesProvider,
	})
	await screen.getByRole("button", { name: "Reset" }).click()
	const dialog = page.getByRole("dialog")
	await expect.element(dialog).toBeVisible()
	expect(shortControls(dialog.element().querySelectorAll("button"))).toEqual([])
	await dialog.getByRole("button", { name: "Reset" }).click()
	expect(onConfirm).toHaveBeenCalledTimes(1)
	await expect.element(dialog).not.toBeInTheDocument()
})
