/* ======================================================================
   src/components/Picker.tsx: PREFERENCE PICKER
   One <details class="picker"> disclosure: an icon-only trigger whose name
   lives in a .sr-only span, and a list of rows. Markup per the locale
   standard, section 6.1; the keyboard and focus rules come from
   design-system/components/picker.js (loaded in index.html), so nothing
   is wired here. Rendering only: the Header owns what each row does.
   The label sits in one span: a .picker-row is a flex box, and the System
   row's label is text around a <span lang>, which would otherwise split
   into three flex items with a gap between them.
   ====================================================================== */

import type { ReactNode } from "react"
import { Icon } from "./Icon.tsx"

export type PickerName = "lang" | "theme" | "currency"

export interface PickerRow {
	key: string
	label: ReactNode
	active: boolean
	onSelect: () => void
	/** The language of the row text (language rows only). */
	lang?: string
	/** Flag and code in front of the label (currency rows only). */
	lead?: ReactNode
	/** data-* attributes naming the choice, for a reader of the DOM; the handler is onSelect. */
	attrs?: Record<`data-${string}`, string>
}

interface PickerProps {
	name: PickerName
	triggerIcon: ReactNode
	/** "Language: Norsk bokmål": the accessible name of the trigger. */
	triggerName: string
	/** The setting name, the aria-label of the list. */
	listLabel: string
	rows: PickerRow[]
}

export function Picker({ name, triggerIcon, triggerName, listLabel, rows }: PickerProps) {
	return (
		<details className="picker" data-picker={name}>
			<summary className="btn icon-btn">
				{triggerIcon}
				<span className="sr-only">{triggerName}</span>
			</summary>
			<ul className="picker-list" aria-label={listLabel}>
				{rows.map((row) => (
					<li key={row.key}>
						<button
							className="picker-row"
							type="button"
							lang={row.lang}
							aria-current={row.active ? "true" : undefined}
							onClick={row.onSelect}
							{...row.attrs}
						>
							{row.lead}
							<span>{row.label}</span>
							{row.active && <Icon name="check" />}
						</button>
					</li>
				))}
			</ul>
		</details>
	)
}
