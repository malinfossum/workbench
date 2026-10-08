/* ======================================================================
   src/components/CurrencyCombobox.tsx: EXAMPLE, a shadcn Combobox
   A filterable list over the project's currencies (config/preferences).
   The visible <label htmlFor> names the input, and through it the list;
   placeholder text is never the label. Choosing a row writes one line to
   the page's status region ("Currency: EUR"); the empty state is a
   status region of its own inside the list. Delete when you start your
   real app.
   ====================================================================== */

import { useId } from "react"
import { usePreferences } from "../hooks/usePreferences.ts"
import { currencyName } from "../services/preferences.ts"
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "./ui/combobox.tsx"

export function CurrencyCombobox({ onStatus }: { onStatus: (line: string) => void }) {
	const { lang, currencies, t } = usePreferences()
	const id = useId()
	const labelId = `${id}-label`

	return (
		<div className="stack stack-sm">
			{/* htmlFor names the input; aria-labelledby keeps that name while the
			    open list hides the rest of the page from screen readers. */}
			<label id={labelId} htmlFor={id}>
				{t("example.currency")}
			</label>
			<Combobox
				items={currencies}
				onValueChange={(code) => {
					if (typeof code === "string") onStatus(t("status.currency", { value: code }))
				}}
			>
				<ComboboxInput id={id} aria-labelledby={labelId} showClear />
				<ComboboxContent>
					<ComboboxEmpty />
					<ComboboxList>
						{(code: string) => (
							<ComboboxItem key={code} value={code}>
								{code}{" "}
								<span className="text-muted-foreground">{currencyName(lang.value, code)}</span>
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	)
}
