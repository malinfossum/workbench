/* ======================================================================
   src/components/ExampleMenu.tsx: EXAMPLE, a shadcn DropdownMenu
   Three items, each writing one line to the page's status region
   through onStatus ("Sorted by name"), so a screen reader hears the
   result of the press. The trigger is a shadcn Button: it sits inside a
   shadcn composition, so Button is the right one (README, "shadcn").
   Delete when you start your real app.
   ====================================================================== */

import { useI18n } from "../hooks/useI18n.ts"
import { Button } from "./ui/button.tsx"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx"

const SORT_KEYS = ["menu.name", "menu.date", "menu.size"] as const

export function ExampleMenu({ onStatus }: { onStatus: (line: string) => void }) {
	const { t } = useI18n()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{t("menu.label")}
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{SORT_KEYS.map((key) => (
					<DropdownMenuItem
						key={key}
						onClick={() => onStatus(t("status.sorted", { value: t(key) }))}
					>
						{t(key)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
