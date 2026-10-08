/* ======================================================================
   tests/locales.test.ts: every bundle carries the same keys
   A key added to one language and forgotten in another renders in the
   fallback language instead. This catches it before anyone sees it. Two
   more checks from the locale standard: no bundle hard-codes a price
   (prices go through money() so the active language and currency decide
   the format), and every bundle carries the keys the pickers render.
   ====================================================================== */

import { expect, test } from "vitest"
import { bundles, FALLBACK_LANG } from "../src/locales/index.ts"

const reference = Object.keys(bundles[FALLBACK_LANG]).sort()

// Reserved by the design-system pickers (locale standard § 7.2).
const PICKER_KEYS = [
	"picker.language",
	"picker.theme",
	"picker.currency",
	"picker.system",
	"theme.light",
	"theme.dark",
]

// Read by the house-edited shadcn components in src/components/ui/: the
// dialog's close button and the combobox's clear, toggle and empty state.
const SHADCN_KEYS = ["dialog.close", "combobox.clear", "combobox.toggle", "combobox.empty"]

// A digit next to a currency symbol or ISO code. Add the code when a project adds a currency.
const CURRENCY = "(?:kr|€|\\$|£|zł|₴|NOK|SEK|DKK|EUR|USD|GBP|PLN|UAH|CHF|ISK)"
const PRICE_PATTERN = new RegExp(`\\d\\s?${CURRENCY}(?!\\p{L})|${CURRENCY}\\s?\\d`, "iu")
const looksLikePrice = (value: string) => PRICE_PATTERN.test(value)

test("price check: rejects hard-coded prices and accepts a placeholder", () => {
	expect(looksLikePrice("949 kr")).toBe(true)
	expect(looksLikePrice("NOK 949")).toBe(true)
	expect(looksLikePrice("949,00 kr")).toBe(true)
	expect(looksLikePrice("$5")).toBe(true)
	expect(looksLikePrice("{price}")).toBe(false)
	expect(looksLikePrice("Example price: {price}")).toBe(false)
	expect(looksLikePrice("3 krones")).toBe(false)
})

for (const [lang, bundle] of Object.entries(bundles)) {
	test(`locales/${lang}.json has exactly the ${FALLBACK_LANG} keys`, () => {
		expect(Object.keys(bundle).sort()).toEqual(reference)
	})

	test(`locales/${lang}.json has no empty strings`, () => {
		const empty = Object.entries(bundle).filter(([, value]) => value.trim() === "")
		expect(empty).toEqual([])
	})

	test(`locales/${lang}.json has no hard-coded prices`, () => {
		const prices = Object.entries(bundle).filter(([, value]) => looksLikePrice(value))
		expect(prices).toEqual([])
	})

	test(`locales/${lang}.json carries the reserved picker keys`, () => {
		const absent = PICKER_KEYS.filter((key) => !(key in bundle))
		expect(absent).toEqual([])
	})

	test(`locales/${lang}.json carries the keys the shadcn components read`, () => {
		const absent = SHADCN_KEYS.filter((key) => !(key in bundle))
		expect(absent).toEqual([])
	})
}
