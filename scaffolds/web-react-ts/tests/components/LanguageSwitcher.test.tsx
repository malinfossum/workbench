/* ======================================================================
   tests/components/LanguageSwitcher.test.tsx — language switching
   Same shape as Counter.test.tsx, plus the side effects the switch owns:
   <html lang>, the tab title and the stored choice.
   ====================================================================== */

import { expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { LanguageProvider } from "../../src/components/LanguageProvider.tsx"
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher.tsx"
import { axeComponent } from "./axe.ts"

test("LanguageSwitcher renders without axe violations", async () => {
	const screen = await render(<LanguageSwitcher />, { wrapper: LanguageProvider })
	expect(await axeComponent(screen.container)).toEqual([])
})

test("LanguageSwitcher exposes the expected accessibility tree", async () => {
	const screen = await render(<LanguageSwitcher />, { wrapper: LanguageProvider })
	await expect.element(screen.container).toMatchAriaInlineSnapshot(`
		- navigation "Language":
		  - button "English" [pressed]
		  - button "Norsk"
	`)
})

test("choosing Norsk from the keyboard switches the language everywhere", async () => {
	const screen = await render(<LanguageSwitcher />, { wrapper: LanguageProvider })
	await userEvent.tab()
	await userEvent.tab()
	await expect.element(screen.getByRole("button", { name: "Norsk" })).toHaveFocus()
	await userEvent.keyboard("{Enter}")

	await expect
		.element(screen.getByRole("button", { name: "Norsk" }))
		.toHaveAttribute("aria-pressed", "true")
	await expect.element(screen.getByRole("navigation", { name: "Språk" })).toBeInTheDocument()
	expect(document.documentElement.lang).toBe("nb")
	expect(document.title).toBe("Prosjekt")
	expect(localStorage.getItem("lang")).toBe("nb")
})

test("a stored choice wins over the browser language", async () => {
	localStorage.setItem("lang", "nb")
	const screen = await render(<LanguageSwitcher />, { wrapper: LanguageProvider })
	await expect
		.element(screen.getByRole("button", { name: "Norsk" }))
		.toHaveAttribute("aria-pressed", "true")
	expect(document.documentElement.lang).toBe("nb")
})
