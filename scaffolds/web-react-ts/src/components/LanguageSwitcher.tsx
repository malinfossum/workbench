/* ======================================================================
   src/components/LanguageSwitcher.tsx — LANGUAGE BUTTONS
   One toggle button per bundled language; aria-pressed marks the active
   one. Each label carries its own lang, so a screen reader says "Norsk"
   in a Norwegian voice even while the page is in English.
   ====================================================================== */

import { useI18n } from "../hooks/useI18n.ts"

export function LanguageSwitcher() {
	const { lang: active, setLang, languages, t } = useI18n()

	return (
		<nav aria-label={t("lang.label")} className="cluster">
			{languages.map((lang) => (
				<button
					key={lang}
					type="button"
					className="btn btn-ghost"
					aria-pressed={lang === active}
					lang={lang}
					onClick={() => setLang(lang)}
				>
					{t(`lang.${lang}`)}
				</button>
			))}
		</nav>
	)
}
