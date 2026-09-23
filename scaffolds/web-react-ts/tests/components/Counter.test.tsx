/* ======================================================================
   tests/components/Counter.test.tsx — example component tests
   Runs in real Chromium (the `browser` project in vite.config.ts), so
   layout, focus and colour contrast are real. Copy this shape for every
   component you add: render it, then check
   1. axe finds no violations,
   2. the accessibility tree matches its ARIA snapshot,
   3. it works from the keyboard.
   Components that call useI18n render inside LanguageProvider (wrapper).
   Automated checks never judge whether labels make sense or whether focus
   order feels right — test those by hand before shipping.
   ====================================================================== */

import { expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { Counter } from "../../src/components/Counter.tsx"
import { LanguageProvider } from "../../src/components/LanguageProvider.tsx"
import { axeComponent } from "./axe.ts"

test("Counter renders without axe violations", async () => {
	const screen = await render(<Counter />, { wrapper: LanguageProvider })
	expect(await axeComponent(screen.container)).toEqual([])
})

// The snapshot is the component's contract with assistive technology: a
// renamed button or a lost live region fails here. Update it deliberately
// with `npx vitest -u` when the change is intended.
test("Counter exposes the expected accessibility tree", async () => {
	const screen = await render(<Counter />, { wrapper: LanguageProvider })
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`
		- paragraph:
		  - text: "Count:"
		  - strong: "0"
		- button "Decrease count": −
		- button "Increase count": +
	`)
})

test("Counter increases from the keyboard", async () => {
	const screen = await render(<Counter />, { wrapper: LanguageProvider })
	await userEvent.tab()
	await userEvent.tab()
	await expect.element(screen.getByRole("button", { name: "Increase count" })).toHaveFocus()
	await userEvent.keyboard("{Enter}")
	await expect.element(screen.getByRole("paragraph")).toHaveTextContent("Count: 1")
})

// Proves the harness reports real problems instead of passing silently.
// The glyph is hidden from assistive technology the way a real icon would
// be, so the button has no accessible name.
test("an icon-only button with no accessible name is reported", async () => {
	const screen = await render(
		<button type="button">
			<span aria-hidden="true">&#9881;</span>
		</button>
	)
	const violations = await axeComponent(screen.container)
	expect(violations.map((v) => v.id)).toEqual(["button-name"])
})
