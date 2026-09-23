/* ======================================================================
   src/components/LanguageProvider.tsx — LANGUAGE CONTEXT
   Wraps the app once (src/main.tsx) and in component tests. State and
   persistence live in useLanguageState; this only hands them down.
   ====================================================================== */

import type { ReactNode } from "react"
import { I18nContext, useLanguageState } from "../hooks/useI18n.ts"

export function LanguageProvider({ children }: { children: ReactNode }) {
	const value = useLanguageState()
	return <I18nContext value={value}>{children}</I18nContext>
}
