/* ======================================================================
   i18n — type declarations for index.js, so TypeScript projects get a
   checked contract without the library itself being TypeScript.

   Types come from the bundles passed in: languages are the bundle names,
   and keys are the keys every bundle shares. With JSON bundles imported
   as modules, a mistyped key in t() is a compile error, not a raw key in
   the UI.
   ====================================================================== */

export type Bundle = Record<string, string>

export type Vars = Record<string, string | number>

export interface Translator<Lang extends string = string, Key extends string = string> {
	/** The string for `key` in `lang`, then in the fallback, then the key itself. `{vars}` are interpolated, never escaped. */
	t(lang: Lang, key: Key, vars?: Vars): string
	/** Picks `<key>.<category>` by the language's plural rules, falling back to `<key>.other`. `{count}` is always set. */
	plural(lang: Lang, key: string, count: number, vars?: Vars): string
	/** The first candidate ("nb-NO", "EN", null) that maps to a bundled language, else the fallback. */
	resolveLang(...candidates: unknown[]): Lang
	readonly languages: Lang[]
	readonly fallback: Lang
}

export function createTranslator<Bundles extends Record<string, Bundle>>(
	bundles: Bundles,
	options?: { fallback?: Extract<keyof Bundles, string> }
): Translator<Extract<keyof Bundles, string>, Extract<keyof Bundles[keyof Bundles], string>>
