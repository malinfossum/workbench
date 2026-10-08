/* ======================================================================
   tests/components/Button.test.tsx — shadcn Button (house-edited)
   The same three checks as every component (axe, ARIA snapshot,
   keyboard) plus the measurements the shadcn spec asks for: every size
   is at least 44 px, the DS focus ring is what focus-visible draws,
   rounded-md resolves to the DS 8 px, a DS .btn with a Tailwind margin
   gets it (utilities beat DS component rules), and a brand palette
   recolours the Button through the bridge.
   ====================================================================== */

import { expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { Button } from "../../src/components/ui/button.tsx"
import { axeComponent } from "./axe.ts"
import { computed, heightOf, shortControls, tokenColor } from "./measure.ts"

const VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const
const SIZES = ["xs", "sm", "default", "lg", "icon-xs", "icon-sm", "icon", "icon-lg"] as const

test("every variant renders without axe violations", async () => {
	const screen = await render(
		<div className="cluster">
			{VARIANTS.map((variant) => (
				<Button key={variant} variant={variant}>
					{variant}
				</Button>
			))}
		</div>
	)
	expect(await axeComponent(screen.container)).toEqual([])
})

test("Button exposes the expected accessibility tree", async () => {
	const screen = await render(
		<div>
			<Button>Save</Button>
			<Button variant="outline" disabled>
				Cancel
			</Button>
		</div>
	)
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`
		- button "Save"
		- button "Cancel" [disabled]
	`)
})

test("Button works from the keyboard and draws the DS focus ring", async () => {
	const onClick = vi.fn()
	const screen = await render(<Button onClick={onClick}>Save</Button>)
	await userEvent.tab()
	const button = screen.getByRole("button", { name: "Save" })
	await expect.element(button).toHaveFocus()
	expect(computed(button.element(), "box-shadow")).not.toBe("none")
	await userEvent.keyboard("{Enter}")
	expect(onClick).toHaveBeenCalledTimes(1)
})

test("every size is at least 44 px tall", async () => {
	const screen = await render(
		<div className="cluster">
			{SIZES.map((size) => (
				<Button key={size} size={size} aria-label={size}>
					{size.startsWith("icon") ? "×" : size}
				</Button>
			))}
		</div>
	)
	expect(shortControls(screen.container.querySelectorAll("button"))).toEqual([])
})

test("the cascade: rounded-md is the DS 8 px, and a .btn takes a Tailwind margin", async () => {
	const screen = await render(
		<div>
			<div data-testid="radius" className="rounded-md" />
			<button type="button" className="btn mt-4">
				DS button
			</button>
		</div>
	)
	const radius = screen.container.querySelector("[data-testid=radius]") as Element
	expect(computed(radius, "border-radius")).toBe("8px")
	const btn = screen.container.querySelector(".btn") as Element
	expect(computed(btn, "margin-top")).toBe("16px")
	expect(heightOf(btn)).toBe(44)
})

test("a brand palette recolours the Button through the bridge", async () => {
	const screen = await render(<Button>Save</Button>)
	const button = screen.container.querySelector("button") as Element
	const before = computed(button, "background-color")
	try {
		document.documentElement.dataset.palette = "hugin"
		// The Button transitions its colours, so poll until the new one lands.
		await expect.poll(() => computed(button, "background-color")).toBe(tokenColor("--accent-solid"))
		expect(computed(button, "background-color")).not.toBe(before)
	} finally {
		document.documentElement.dataset.palette = "default"
	}
})
