/* ======================================================================
   src/components/ui/dialog.tsx: shadcn/ui Dialog on Base UI
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/dialog), added with
   `npx shadcn@4.21.4 add dialog`. House edits, re-applied on a re-add:
   - DialogContent takes `heading` and `description` (both required) and
     renders DialogTitle and DialogDescription itself, so a dialog cannot
     ship without an accessible name or a description; the ARIA snapshot
     test pins both
   - the close button is a 44 px icon Button named from the bundle
     (dialog.close); the icon is aria-hidden; the footer's optional close
     button reads the same key
   - overlay bg-black/60; content bg-popover shadow-md
   - outline-hidden, never the outline reset utility
   ====================================================================== */

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/hooks/useI18n"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 isolate z-50 bg-black/60 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				className
			)}
			{...props}
		/>
	)
}

function DialogContent({
	className,
	children,
	heading,
	description,
	showCloseButton = true,
	...props
}: DialogPrimitive.Popup.Props & {
	heading: React.ReactNode
	description: React.ReactNode
	showCloseButton?: boolean
}) {
	const { t } = useI18n()
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-hidden sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
					className
				)}
				{...props}
			>
				<DialogHeader className={showCloseButton ? "pr-11" : undefined}>
					<DialogTitle>{heading}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						aria-label={t("dialog.close")}
						render={<Button variant="ghost" className="absolute top-1 right-1" size="icon" />}
					>
						<XIcon aria-hidden="true" />
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	)
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
	)
}

function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	showCloseButton?: boolean
}) {
	const { t } = useI18n()
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
				className
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close render={<Button variant="outline" />}>
					{t("dialog.close")}
				</DialogPrimitive.Close>
			)}
		</div>
	)
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-heading text-base leading-none font-medium", className)}
			{...props}
		/>
	)
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
				className
			)}
			{...props}
		/>
	)
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
}
