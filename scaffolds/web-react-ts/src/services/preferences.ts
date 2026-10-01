/* ======================================================================
   src/services/preferences.ts: PREFERENCE RESOLUTION
   The pure part of the preference model: no React, no DOM, unit-tested
   in Node. Language resolution lives in the i18n library; theme storage
   lives in the design system's theme/preferences.js.
   ====================================================================== */

import type { PreferencesConfig } from "../config/preferences.ts"

// The region subtag of a BCP 47 tag ("nb-NO" → "NO", "zh-Hant-TW" → "TW"),
// or undefined when the tag has none or does not parse.
function regionOf(tag: string): string | undefined {
	try {
		return new Intl.Locale(tag).region
	} catch {
		return undefined
	}
}

// The System currency: the region of the first language entry that maps to
// one of the project's currencies, else the base currency.
export function systemCurrency(languages: readonly string[], config: PreferencesConfig): string {
	for (const tag of languages) {
		const region = regionOf(tag)
		const code = region ? config.regionCurrency[region] : undefined
		if (code && config.currencies.includes(code)) return code
	}
	return config.baseCurrency
}

// "Norwegian Krone" in English, "norske kroner" in Norwegian; the code when
// Intl.DisplayNames is unavailable. Not a bundle key: the browser knows them.
export function currencyName(lang: string, code: string): string {
	if (typeof Intl.DisplayNames !== "function") return code
	return new Intl.DisplayNames([lang], { type: "currency" }).of(code) ?? code
}
