/* ======================================================================
   tests/preferences.test.ts: System currency resolution
   The region of the first navigator.languages entry that maps to one of
   the project's currencies wins; no mapped region means the base currency.
   Pure logic, run in Node.
   ====================================================================== */

import { expect, test } from "vitest"
import type { PreferencesConfig } from "../src/config/preferences.ts"
import { currencyName, systemCurrency } from "../src/services/preferences.ts"

const config: PreferencesConfig = {
	currencies: ["NOK", "EUR", "USD"],
	baseCurrency: "NOK",
	regionCurrency: { NO: "NOK", US: "USD", DE: "EUR", SE: "SEK" },
	currencyFlag: { NOK: "no", EUR: "eu", USD: "us" },
}

test("the first entry with a mapped region wins", () => {
	expect(systemCurrency(["nb-NO", "en-US"], config)).toBe("NOK")
	expect(systemCurrency(["en-US", "nb-NO"], config)).toBe("USD")
	expect(systemCurrency(["de-DE"], config)).toBe("EUR")
})

test("entries without a region, or with an unmapped one, are skipped", () => {
	expect(systemCurrency(["en", "nb", "de-AT", "en-US"], config)).toBe("USD")
	expect(systemCurrency(["en-GB", "pl-PL", "nb-NO"], config)).toBe("NOK")
})

test("a region whose currency the project does not sell in is skipped", () => {
	expect(systemCurrency(["sv-SE", "de-DE"], config)).toBe("EUR")
})

test("no mapped region anywhere gives the base currency", () => {
	expect(systemCurrency(["en", "nb"], config)).toBe("NOK")
	expect(systemCurrency([], config)).toBe("NOK")
})

test("script subtags and malformed tags do not break the region lookup", () => {
	expect(systemCurrency(["zh-Hant-TW", "en-US"], config)).toBe("USD")
	expect(systemCurrency(["not a tag", "nb-NO"], config)).toBe("NOK")
})

test("currency names come from Intl, in the active language", () => {
	expect(currencyName("en", "NOK")).toBe("Norwegian Krone")
	expect(currencyName("nb", "NOK")).toBe("norske kroner")
})
