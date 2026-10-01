/* ======================================================================
   src/components/PreferencesProvider.tsx: PREFERENCE CONTEXT
   Wraps the app once (src/main.tsx) and in component tests. State and
   persistence live in usePreferencesState; this only hands them down.
   `config` defaults to src/config/preferences.ts; tests pass their own.
   ====================================================================== */

import type { ReactNode } from "react"
import type { PreferencesConfig } from "../config/preferences.ts"
import { PreferencesContext, usePreferencesState } from "../hooks/usePreferences.ts"

export function PreferencesProvider({
	children,
	config,
}: {
	children: ReactNode
	config?: PreferencesConfig
}) {
	const value = usePreferencesState(config)
	return <PreferencesContext value={value}>{children}</PreferencesContext>
}
