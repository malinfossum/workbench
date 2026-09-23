/* ======================================================================
   src/hooks/useI18n.ts — ACTIVE LANGUAGE
   useLanguageState owns the language: it starts from the stored choice or
   the browser language, persists only an explicit choice, and keeps
   <html lang> and the tab title in step. LanguageProvider calls it once;
   every component reads it through useI18n.
   ====================================================================== */

import { createContext, useContext, useEffect, useState } from "react"
import type { Vars } from "../../i18n/index.js"
import { i18n, type Lang, type MessageKey } from "../locales/index.ts"

const LANG_STORAGE_KEY = "lang"

export interface I18n {
	lang: Lang
	setLang: (lang: Lang) => void
	languages: Lang[]
	t: (key: MessageKey, vars?: Vars) => string
	plural: (key: string, count: number, vars?: Vars) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useLanguageState(): I18n {
	const [lang, setLangState] = useState(() =>
		i18n.resolveLang(localStorage.getItem(LANG_STORAGE_KEY), navigator.language)
	)

	// Document-level, outside React's tree: screen readers pick their voice
	// from <html lang>, and the tab title should read in the active language.
	useEffect(() => {
		document.documentElement.lang = lang
		document.title = i18n.t(lang, "app.title")
	}, [lang])

	return {
		lang,
		setLang: (next) => {
			localStorage.setItem(LANG_STORAGE_KEY, next) // written only on an explicit choice
			setLangState(next)
		},
		languages: i18n.languages,
		// t() returns plain text. JSX escapes it; never pass it to dangerouslySetInnerHTML.
		t: (key, vars) => i18n.t(lang, key, vars),
		plural: (key, count, vars) => i18n.plural(lang, key, count, vars),
	}
}

export function useI18n(): I18n {
	const context = useContext(I18nContext)
	if (!context) throw new Error("useI18n needs a <LanguageProvider> above it")
	return context
}
