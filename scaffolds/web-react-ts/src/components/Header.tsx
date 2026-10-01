/* ======================================================================
   src/components/Header.tsx: HEADER WITH THE THREE PICKERS
   The wordmark and, right-aligned, the language, theme and currency
   pickers (spec section 6.3), each only when the project has more than
   one option. This is the one place trigger names, icons and aria-current
   are rendered, and it re-renders only when a preference changes.
   After a choice, focus returns to the trigger of the picker that was
   used: its new name ("Theme: Dark") is the audible result of the press.
   ====================================================================== */

import { useEffect, useState } from "react"
import { usePreferences } from "../hooks/usePreferences.ts"
import { i18n } from "../locales/index.ts"
import { currencyName } from "../services/preferences.ts"
import { Icon } from "./Icon.tsx"
import { Picker, type PickerName, type PickerRow } from "./Picker.tsx"

// Every flag the design system ships, as URLs: Vite serves them in dev and
// copies them into the build with hashed names. A plain "/design-system/..."
// string would work in dev only, since the build copies nothing it has not
// seen imported. ?no-inline keeps them files rather than data: URLs, so an
// img-src 'self' content security policy still allows them.
const FLAG_URLS = import.meta.glob<string>("../../design-system/assets/flags/*.svg", {
	eager: true,
	query: "?no-inline",
	import: "default",
})
function flagUrl(file: string): string {
	return FLAG_URLS[`../../design-system/assets/flags/${file}.svg`] ?? ""
}

export function Header() {
	const { lang, theme, currency, languages, currencies, flagOf, t } = usePreferences()

	// The picker used last, bumped on every choice (also a re-pick of the
	// active row), so the effect below runs after the header has re-rendered
	// and picker.js has closed the list.
	const [used, setUsed] = useState<{ name: PickerName; count: number } | null>(null)
	useEffect(() => {
		if (!used) return
		document.querySelector<HTMLElement>(`details[data-picker="${used.name}"] > summary`)?.focus()
	}, [used])
	const choose = (name: PickerName, apply: () => void) => () => {
		apply()
		setUsed((previous) => ({ name, count: (previous?.count ?? 0) + 1 }))
	}

	// "System ({value})" split around its placeholder, so the resolved autonym
	// can sit in its own <span lang> while the rest stays in the UI language.
	const [systemBefore, systemAfter] = t("picker.system").split("{value}")
	const system = (value: string) => t("picker.system", { value })

	const langRows: PickerRow[] = [
		{
			key: "",
			active: lang.stored === null,
			onSelect: choose("lang", () => lang.set("")),
			attrs: { "data-action": "set-lang", "data-lang": "" },
			label: (
				<>
					{systemBefore}
					<span lang={lang.system}>{i18n.displayName(lang.system)}</span>
					{systemAfter}
				</>
			),
		},
		...languages.map(
			(code): PickerRow => ({
				key: code,
				lang: code,
				active: lang.stored === code,
				onSelect: choose("lang", () => lang.set(code)),
				attrs: { "data-action": "set-lang", "data-lang": code },
				label: i18n.displayName(code),
			})
		),
	]

	const themeRows: PickerRow[] = [
		{
			key: "",
			active: theme.stored === null,
			onSelect: choose("theme", () => theme.set("")),
			attrs: { "data-theme-set": "" },
			label: system(t(`theme.${theme.system}`)),
		},
		...(["light", "dark"] as const).map(
			(value): PickerRow => ({
				key: value,
				active: theme.stored === value,
				onSelect: choose("theme", () => theme.set(value)),
				attrs: { "data-theme-set": value },
				label: t(`theme.${value}`),
			})
		),
	]

	const flag = (code: string) => <img className="picker-flag" alt="" src={flagUrl(flagOf(code))} />
	const currencyRows: PickerRow[] = [
		{
			key: "",
			active: currency.stored === null,
			onSelect: choose("currency", () => currency.set("")),
			attrs: { "data-action": "set-currency", "data-currency": "" },
			label: system(currency.system),
		},
		...currencies.map(
			(code): PickerRow => ({
				key: code,
				active: currency.stored === code,
				onSelect: choose("currency", () => currency.set(code)),
				attrs: { "data-action": "set-currency", "data-currency": code },
				lead: (
					<>
						{flag(code)}
						<span className="picker-code">{code}</span>
					</>
				),
				label: currencyName(lang.value, code),
			})
		),
	]

	return (
		<header className="topbar">
			<div className="cluster-between">
				<span className="brand">{t("app.title")}</span>
				<div className="cluster cluster-sm">
					{languages.length > 1 && (
						<Picker
							name="lang"
							triggerIcon={<Icon name="globe" />}
							triggerName={`${t("picker.language")}: ${
								lang.stored ? i18n.displayName(lang.value) : system(i18n.displayName(lang.system))
							}`}
							listLabel={t("picker.language")}
							rows={langRows}
						/>
					)}
					<Picker
						name="theme"
						triggerIcon={<Icon name={theme.value === "light" ? "sun" : "moon"} />}
						triggerName={`${t("picker.theme")}: ${
							theme.stored ? t(`theme.${theme.stored}`) : system(t(`theme.${theme.system}`))
						}`}
						listLabel={t("picker.theme")}
						rows={themeRows}
					/>
					{currencies.length > 1 && (
						<Picker
							name="currency"
							triggerIcon={flag(currency.value)}
							triggerName={`${t("picker.currency")}: ${
								currency.stored ? currency.value : system(currency.system)
							}`}
							listLabel={t("picker.currency")}
							rows={currencyRows}
						/>
					)}
				</div>
			</div>
		</header>
	)
}
