/* ======================================================================
   src/components/ResetDialog.tsx: EXAMPLE, a shadcn Dialog
   A confirm step in front of the Counter's reset. The trigger is a DS
   .btn (Base UI's render prop), the inside is shadcn: heading and
   description are required props of DialogContent, the footer holds a
   cancel (DialogClose) and the confirm. The audible result of a confirm
   is the Counter's own live paragraph changing to zero. Delete with the
   Counter example.
   ====================================================================== */

import { useState } from "react"
import { useI18n } from "../hooks/useI18n.ts"
import { Button } from "./ui/button.tsx"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "./ui/dialog.tsx"

export function ResetDialog({ onConfirm }: { onConfirm: () => void }) {
	const { t } = useI18n()
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<button type="button" className="btn" />}>
				{t("counter.reset")}
			</DialogTrigger>
			<DialogContent heading={t("reset.title")} description={t("reset.description")}>
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>{t("reset.cancel")}</DialogClose>
					<Button
						onClick={() => {
							onConfirm()
							setOpen(false)
						}}
					>
						{t("reset.confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
