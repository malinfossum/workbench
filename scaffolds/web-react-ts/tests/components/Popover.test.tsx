/* ======================================================================
   tests/components/Popover.test.tsx — shadcn Popover
   No example ships for the popover (the menu and the combobox cover the
   anchored-popup model), so the fixture lives here. Pinned: the content
   is named by its title, paints the DS elevated surface, opens from the
   keyboard, closes on Escape and returns focus; the trigger is 44 px.
   ====================================================================== */

import { expect, test } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { Button } from "../../src/components/ui/button.tsx"
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "../../src/components/ui/popover.tsx"
import { axeComponent } from "./axe.ts"
import { computed, heightOf, tokenColor } from "./measure.ts"

function Fixture() {
	return (
		<Popover>
			<PopoverTrigger render={<Button variant="outline" />}>Details</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Shipping</PopoverTitle>
					<PopoverDescription>Orders ship within two days.</PopoverDescription>
				</PopoverHeader>
				<Button size="sm">Got it</Button>
			</PopoverContent>
		</Popover>
	)
}

test("Popover renders without axe violations, closed and open", async () => {
	const screen = await render(<Fixture />)
	expect(await axeComponent(screen.container)).toEqual([])
	await screen.getByRole("button", { name: "Details" }).click()
	await expect.element(page.getByRole("dialog")).toBeVisible()
	expect(await axeComponent(document.body)).toEqual([])
})

test("the open popover exposes the expected accessibility tree", async () => {
	const screen = await render(<Fixture />)
	await screen.getByRole("button", { name: "Details" }).click()
	await expect.element(page.getByRole("dialog")).toMatchAriaInlineSnapshot(`
		- dialog "Shipping":
		  - heading "Shipping" [level=2]
		  - paragraph: Orders ship within two days.
		  - button "Got it"
	`)
})

test("the popover works from the keyboard and paints the elevated surface", async () => {
	const screen = await render(<Fixture />)
	await userEvent.tab()
	const trigger = screen.getByRole("button", { name: "Details" })
	await expect.element(trigger).toHaveFocus()
	expect(heightOf(trigger.element())).toBe(44)
	await userEvent.keyboard("{Enter}")
	const popover = page.getByRole("dialog")
	await expect.element(popover).toBeVisible()
	expect(computed(popover.element(), "background-color")).toBe(tokenColor("--elevated-bg"))
	await userEvent.keyboard("{Escape}")
	await expect.element(popover).not.toBeInTheDocument()
	await expect.element(trigger).toHaveFocus()
})
