/* ======================================================================
   src/types/design-system.d.ts: TYPES FOR THE DESIGN-SYSTEM MODULES
   design-system/ is a read-only extracted copy and ships no .d.ts, so the
   two ES modules the app imports are declared here. Wildcard names match
   the relative imports ("../../design-system/theme/preferences.js").
   Keep these in step with the JSDoc in the modules when the DS is
   re-extracted.
   ====================================================================== */

declare module "*/design-system/theme/preferences.js" {
	export const THEMES: readonly ["light", "dark"]
	/** The stored value when it is one of `valid`; anything else is removed and null returned. */
	export function readPreference<T extends string>(key: string, valid: readonly T[]): T | null
	/** Stores a choice; "" or null removes the key (the System row). Never throws. */
	export function writePreference(key: string, value: string | null | undefined): void
	/** "light" when prefers-color-scheme says so, else "dark". */
	export function systemTheme(): "light" | "dark"
	/** Sets <html data-theme> from the stored value, or the system value when null. */
	export function applyTheme(stored: "light" | "dark" | null | undefined): void
	/** Calls back with the system theme while no key is stored. Returns an unsubscribe. */
	export function watchSystemTheme(onChange: (theme: "light" | "dark") => void): () => void
	/** Calls back when another tab changes or clears the theme key. Returns an unsubscribe. */
	export function watchStorage(onChange: (stored: "light" | "dark" | null) => void): () => void
	/** Applies once, then follows the OS and other tabs. Returns one unsubscribe. */
	export function initTheme(): () => void
}

declare module "*/design-system/components/icons.js" {
	export const ICON_NAMES: readonly string[]
	/** The inline SVG markup for a DS icon as a string; "" for an unknown name. */
	export function icon(name: string, options?: { size?: number; strokeWidth?: number }): string
}
