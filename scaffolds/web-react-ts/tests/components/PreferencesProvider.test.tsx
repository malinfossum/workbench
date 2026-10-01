/* ======================================================================
   tests/components/PreferencesProvider.test.tsx: the preference model
   value = stored key (if valid) ?? system value; System is the absence of
   the key; storage failures never reach the user. Observed through the
   Header, which is the one place the values are rendered.
   ====================================================================== */

import { afterEach, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"
import { Header } from "../../src/components/Header.tsx"
import { PreferencesProvider } from "../../src/components/PreferencesProvider.tsx"
import { PREFERENCES } from "../../src/config/preferences.ts"
import { openPickers, trigger, triggerName } from "./pickers.ts"

const html = document.documentElement

// navigator.languages is read once on mount, so it is replaced before render
// and restored after. The property lives on the prototype; removing the own
// property puts the real one back.
function stubLanguages(languages: string[]) {
	Object.defineProperty(navigator, "languages", { configurable: true, value: languages })
}
function restoreLanguages() {
	Reflect.deleteProperty(navigator, "languages")
}

// A matchMedia stand-in whose "change" event the test can fire. The real
// one cannot be driven from inside the page.
function fakeScheme(light: boolean) {
	const listeners = new Set<() => void>()
	const query = {
		matches: light,
		media: "(prefers-color-scheme: light)",
		addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
		removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
	}
	vi.stubGlobal("matchMedia", () => query)
	return {
		flip(toLight: boolean) {
			query.matches = toLight
			for (const listener of listeners) listener()
		},
	}
}

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	restoreLanguages()
})

test("keeps the chosen language in state when storage refuses the write", async () => {
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new DOMException("quota", "QuotaExceededError")
	})
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	await userEvent.click(trigger(screen.container, "lang"))
	await screen.getByRole("button", { name: "Norsk bokmål" }).click()

	await expect.poll(() => triggerName(screen.container, "lang")).toBe("Språk: Norsk bokmål")
	expect(html.lang).toBe("nb")
	expect(document.title).toBe("Prosjekt")
	expect(localStorage.getItem("lang")).toBeNull()
})

test("an invalid stored value is removed on first read and System applies", async () => {
	localStorage.setItem("lang", "no")
	localStorage.setItem("theme", "system")
	localStorage.setItem("currency", "kr")
	const screen = await render(<Header />, { wrapper: PreferencesProvider })

	expect(localStorage.getItem("lang")).toBeNull()
	expect(localStorage.getItem("theme")).toBeNull()
	expect(localStorage.getItem("currency")).toBeNull()
	expect(triggerName(screen.container, "lang")).toBe("Language: System (English)")
	expect(triggerName(screen.container, "theme")).toBe("Theme: System (Dark)")
	expect(triggerName(screen.container, "currency")).toBe("Currency: System (USD)")
	expect(html.lang).toBe("en")
	expect(html.dataset.theme).toBe("dark")
})

test("a valid stored value wins over the system value", async () => {
	localStorage.setItem("lang", "nb")
	localStorage.setItem("theme", "light")
	localStorage.setItem("currency", "EUR")
	const screen = await render(<Header />, { wrapper: PreferencesProvider })

	expect(triggerName(screen.container, "lang")).toBe("Språk: Norsk bokmål")
	expect(triggerName(screen.container, "theme")).toBe("Tema: Lys")
	expect(triggerName(screen.container, "currency")).toBe("Valuta: EUR")
	expect(html.lang).toBe("nb")
	await expect.poll(() => html.dataset.theme).toBe("light")
})

test("choosing System removes the key and returns focus to the trigger", async () => {
	localStorage.setItem("theme", "light")
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	await userEvent.click(trigger(screen.container, "theme"))
	await screen.getByRole("button", { name: "System (Dark)" }).click()

	await expect.element(trigger(screen.container, "theme")).toHaveFocus()
	expect(triggerName(screen.container, "theme")).toBe("Theme: System (Dark)")
	expect(localStorage.getItem("theme")).toBeNull()
	expect(html.dataset.theme).toBe("dark")
	expect(openPickers(screen.container)).toBe(0)
})

test("a theme choice is stored, applied, and shown on the trigger", async () => {
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	await userEvent.click(trigger(screen.container, "theme"))
	await screen.getByRole("button", { name: "Light" }).click()

	await expect.element(trigger(screen.container, "theme")).toHaveFocus()
	expect(triggerName(screen.container, "theme")).toBe("Theme: Light")
	expect(localStorage.getItem("theme")).toBe("light")
	expect(html.dataset.theme).toBe("light")
})

test("the trigger follows the OS colour scheme while no key is stored", async () => {
	const scheme = fakeScheme(false)
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	expect(triggerName(screen.container, "theme")).toBe("Theme: System (Dark)")
	expect(trigger(screen.container, "theme").querySelector("svg path")).not.toBeNull()

	scheme.flip(true)
	await expect.poll(() => triggerName(screen.container, "theme")).toBe("Theme: System (Light)")
	expect(html.dataset.theme).toBe("light")
	// The sun has a circle, the moon only a path.
	expect(trigger(screen.container, "theme").querySelector("svg circle")).not.toBeNull()
})

test("another tab clearing the theme key is mirrored here", async () => {
	localStorage.setItem("theme", "light")
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	expect(triggerName(screen.container, "theme")).toBe("Theme: Light")

	localStorage.removeItem("theme")
	window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: null }))
	await expect.poll(() => triggerName(screen.container, "theme")).toBe("Theme: System (Dark)")
	expect(html.dataset.theme).toBe("dark")
})

test("the System currency comes from the first navigator.languages entry with a mapped region", async () => {
	stubLanguages(["en-GB", "de-DE", "nb-NO"])
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	expect(triggerName(screen.container, "currency")).toBe("Currency: System (EUR)")
})

test("no region anywhere gives the base currency", async () => {
	stubLanguages(["en", "nb"])
	const screen = await render(<Header />, { wrapper: PreferencesProvider })
	expect(triggerName(screen.container, "currency")).toBe("Currency: System (NOK)")
})

test("a project with one currency renders no currency picker", async () => {
	const oneCurrency = { ...PREFERENCES, currencies: ["NOK"] }
	const screen = await render(
		<PreferencesProvider config={oneCurrency}>
			<Header />
		</PreferencesProvider>
	)
	expect(triggerName(screen.container, "theme")).toBe("Theme: System (Dark)")
	expect(screen.container.querySelector('[data-picker="currency"]')).toBeNull()
	expect(screen.container.querySelectorAll("details").length).toBe(2)
})
