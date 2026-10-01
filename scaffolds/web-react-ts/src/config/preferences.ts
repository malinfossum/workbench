/* ======================================================================
   src/config/preferences.ts: PREFERENCE CONFIG
   The project's currencies and the region table the System currency
   resolves through (spec: docs/specs/2026-10-01-locale-standard.md, § 8).
   Languages are not configured here: the bundles in src/locales/ are the
   language list. Themes come from the design system.
   ====================================================================== */

export interface PreferencesConfig {
	/** ISO 4217 codes the project has prices for. One entry hides the currency picker. */
	readonly currencies: readonly string[]
	/** Used when no navigator.languages entry carries a mapped region. */
	readonly baseCurrency: string
	/** ISO 3166 region to currency. Only regions the project maps; every value is in `currencies`. */
	readonly regionCurrency: Readonly<Record<string, string>>
	/** Currency to its flag file in design-system/assets/flags/ ("no", "eu", "us"). */
	readonly currencyFlag: Readonly<Record<string, string>>
}

export const PREFERENCES: PreferencesConfig = {
	currencies: ["NOK", "EUR", "USD"],
	baseCurrency: "NOK",
	regionCurrency: {
		NO: "NOK",
		US: "USD",
		AT: "EUR",
		BE: "EUR",
		DE: "EUR",
		ES: "EUR",
		FI: "EUR",
		FR: "EUR",
		IE: "EUR",
		IT: "EUR",
		NL: "EUR",
		PT: "EUR",
	},
	currencyFlag: { NOK: "no", EUR: "eu", USD: "us" },
}
