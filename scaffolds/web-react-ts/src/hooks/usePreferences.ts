/* ======================================================================
   src/hooks/usePreferences.ts: LANGUAGE, THEME AND CURRENCY
   usePreferencesState owns the three preferences. One rule for each:
   value = stored key (if valid) ?? system value, and System is the absence
   of the key (spec section 5). Storage goes through the design system's
   theme/preferences.js, which never throws: when storage refuses a write
   the choice still holds here, for the open page.
   Language and currency are read once per page load; the theme stays
   live (OS changes and other tabs) while no key is stored.
   PreferencesProvider calls this once; components read it through
   usePreferences (everything) or useI18n (strings only).
   ====================================================================== */

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react"
import {
	applyTheme,
	initTheme,
	readPreference,
	systemTheme,
	THEMES,
	watchStorage,
	writePreference,
} from "../../design-system/theme/preferences.js"
import type { Vars } from "../../i18n/index.js"
import { PREFERENCES, type PreferencesConfig } from "../config/preferences.ts"
import { i18n, type Lang, type MessageKey } from "../locales/index.ts"
import { systemCurrency } from "../services/preferences.ts"

export type Theme = (typeof THEMES)[number]

// One preference: the value in use, what is stored (null = System) and what
// System resolves to right now. set("") is the System row: it removes the key.
export interface Preference<T extends string> {
	value: T
	stored: T | null
	system: T
	set: (next: T | "") => void
}

export interface Preferences {
	lang: Preference<Lang>
	theme: Preference<Theme>
	currency: Preference<string>
	languages: readonly Lang[]
	currencies: readonly string[]
	flagOf: (currency: string) => string
	t: (key: MessageKey, vars?: Vars) => string
	plural: (key: string, count: number, vars?: Vars) => string
	/** `amount` in `currency` (default: the active one) by the active language's rules. */
	money: (amount: number, currency?: string) => string
}

export const PreferencesContext = createContext<Preferences | null>(null)

const LIGHT_QUERY = "(prefers-color-scheme: light)"

// The OS colour scheme as an external store, so the trigger icon and the
// "System (...)" row follow a live change. preferences.js applies the
// data-theme attribute for the same change; this only mirrors it into state.
function subscribeToScheme(onChange: () => void) {
	if (typeof matchMedia !== "function") return () => {}
	const query = matchMedia(LIGHT_QUERY)
	query.addEventListener("change", onChange)
	return () => query.removeEventListener("change", onChange)
}

export function usePreferencesState(config: PreferencesConfig = PREFERENCES): Preferences {
	const [storedLang, setStoredLang] = useState<Lang | null>(() =>
		readPreference("lang", i18n.languages)
	)
	const [systemLang] = useState<Lang>(() => i18n.resolveLang(navigator.languages))
	const [storedTheme, setStoredTheme] = useState<Theme | null>(() =>
		readPreference("theme", THEMES)
	)
	const osTheme = useSyncExternalStore(subscribeToScheme, systemTheme)
	const [storedCurrency, setStoredCurrency] = useState<string | null>(() =>
		readPreference("currency", config.currencies)
	)
	const [sysCurrency] = useState(() => systemCurrency(navigator.languages, config))

	const lang = storedLang ?? systemLang
	const theme = storedTheme ?? osTheme
	const currency = storedCurrency ?? sysCurrency

	// Document-level, outside React's tree: screen readers pick their voice
	// from <html lang>, and the tab title should read in the active language.
	useEffect(() => {
		document.documentElement.lang = lang
		document.title = i18n.t(lang, "app.title")
	}, [lang])

	// The head snippet set the first paint; initTheme keeps data-theme right
	// afterwards (OS changes, other tabs). The storage watcher mirrors another
	// tab's change into state so the trigger name and icon follow it.
	useEffect(() => {
		const stopTheme = initTheme()
		const stopStorage = watchStorage((stored) => setStoredTheme(stored))
		return () => {
			stopTheme()
			stopStorage()
		}
	}, [])

	return {
		lang: {
			value: lang,
			stored: storedLang,
			system: systemLang,
			set: (next) => {
				writePreference("lang", next)
				setStoredLang(next || null)
			},
		},
		theme: {
			value: theme,
			stored: storedTheme,
			system: osTheme,
			set: (next) => {
				writePreference("theme", next)
				applyTheme(next || null)
				setStoredTheme(next || null)
			},
		},
		currency: {
			value: currency,
			stored: storedCurrency,
			system: sysCurrency,
			set: (next) => {
				writePreference("currency", next)
				setStoredCurrency(next || null)
			},
		},
		languages: i18n.languages,
		currencies: config.currencies,
		flagOf: (code) => config.currencyFlag[code] ?? "",
		// t() returns plain text. JSX escapes it; never pass it to dangerouslySetInnerHTML.
		t: (key, vars) => i18n.t(lang, key, vars),
		plural: (key, count, vars) => i18n.plural(lang, key, count, vars),
		money: (amount, code = currency) => i18n.money(lang, amount, code),
	}
}

export function usePreferences(): Preferences {
	const context = useContext(PreferencesContext)
	if (!context) throw new Error("usePreferences needs a <PreferencesProvider> above it")
	return context
}
