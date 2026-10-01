/* ======================================================================
   src/hooks/useI18n.ts: STRINGS FOR COMPONENTS
   The string-only view of the preferences: the active language, t(),
   plural() and money(). Most components need nothing more. The full
   model (stored values, setters, theme, currency) is usePreferences.
   ====================================================================== */

import { type Preferences, usePreferences } from "./usePreferences.ts"

export type I18n = Pick<Preferences, "languages" | "t" | "plural" | "money"> & {
	lang: Preferences["lang"]["value"]
}

export function useI18n(): I18n {
	const { lang, languages, t, plural, money } = usePreferences()
	return { lang: lang.value, languages, t, plural, money }
}
