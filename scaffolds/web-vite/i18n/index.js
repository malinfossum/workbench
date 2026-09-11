/* workbench-lib: i18n v1.0.0 — extracted; edit in the workbench, not here */
/* ======================================================================
   i18n — translate UI strings from flat key → string bundles.

   Pure and DOM-free on purpose: it never touches localStorage, navigator
   or document. The project keeps the current language in its model and
   persists it in its controller; this module only turns (lang, key) into
   a string, so it tests in node and never fights the MVC split.

   Bundles are project content, not library content:
     { en: { "app.title": "Timer", "items.one": "{count} item", "items.other": "{count} items" },
       nb: { ... } }

   Interpolated vars are NOT escaped — t() returns plain text. Escape before
   innerHTML, or set it with textContent.
   ====================================================================== */

const PLACEHOLDER_RE = /\{(\w+)\}/g

function interpolate(text, vars) {
	return text.replace(PLACEHOLDER_RE, (match, name) => (name in vars ? String(vars[name]) : match))
}

export function createTranslator(bundles, { fallback = "en" } = {}) {
	const languages = Object.keys(bundles)
	if (!languages.includes(fallback)) {
		throw new Error(`i18n: fallback language "${fallback}" has no bundle`)
	}

	// A raw string for the key, or null. Falls through to the fallback bundle
	// so a half-translated language still renders — in the fallback tongue,
	// never as a blank.
	function lookup(lang, key) {
		return bundles[lang]?.[key] ?? bundles[fallback][key] ?? null
	}

	// Missing keys come back as the key itself: visible in the UI, easy to grep.
	function t(lang, key, vars = {}) {
		const text = lookup(lang, key)
		return text === null ? key : interpolate(text, vars)
	}

	// Picks "<key>.<category>" by the language's own plural rules — Norwegian
	// and English have one/other, Ukrainian one/few/many/other — and falls
	// back to "<key>.other" so a bundle only needs the forms its language uses.
	// The count is always available as {count}.
	function plural(lang, key, count, vars = {}) {
		const category = new Intl.PluralRules(lang).select(count)
		const chosen = lookup(lang, `${key}.${category}`) !== null ? `${key}.${category}` : `${key}.other`
		return t(lang, chosen, { count, ...vars })
	}

	// Maps whatever the environment offers ("de-AT", "NB", null) to a bundled
	// language, or the fallback. The controller feeds it the stored choice
	// first, then navigator.language.
	function resolveLang(...candidates) {
		for (const candidate of candidates) {
			if (typeof candidate !== "string") continue
			const short = candidate.toLowerCase().split("-")[0]
			if (languages.includes(short)) return short
		}
		return fallback
	}

	return { t, plural, resolveLang, languages, fallback }
}
