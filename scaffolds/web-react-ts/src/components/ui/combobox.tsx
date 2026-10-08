/* ======================================================================
   src/components/ui/combobox.tsx: shadcn/ui Combobox on Base UI
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/combobox), added with
   `npx shadcn@4.21.4 add combobox`. House edits, re-applied on a re-add:
   - the input group is 44 px (input-group.tsx); rows carry min-h-11 px-3;
     the clear and toggle buttons are 44 px and named from the bundle
     (combobox.clear, combobox.toggle), their icons aria-hidden
   - the toggle and clear buttons are tabIndex -1, as in the ARIA combobox
     pattern: the input opens the list (ArrowDown, typing) and clears it
     (select all, Backspace). Base UI hides everything but the input and
     the list from screen readers while the list is open, so a focusable
     button next to the input would sit inside aria-hidden (axe
     aria-hidden-focus); give the input aria-labelledby as well as the
     label's htmlFor for the same reason
   - ComboboxEmpty is role="status", in the accessibility tree from the
     moment the list opens, and shows combobox.empty in the active
     language when a filter matches nothing (Base UI renders its children
     only then), so a screen reader hears "No results"
   - the input inside a popup (the chips variant) is h-11; chips are h-11
     with a 44 px remove button
   - focus-within:shadow-ring on chips; outline-hidden, never the outline
     reset utility
   - dark: and aria-invalid ring variants dropped
   The input needs a visible <label htmlFor>; placeholder text is never
   the label (README, "shadcn").
   ====================================================================== */

import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group"
import { useI18n } from "@/hooks/useI18n"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
			{...props}
		>
			{children}
			<ChevronDownIcon
				aria-hidden="true"
				className="pointer-events-none size-4 text-muted-foreground"
			/>
		</ComboboxPrimitive.Trigger>
	)
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
	const { t } = useI18n()
	return (
		<ComboboxPrimitive.Clear
			data-slot="combobox-clear"
			aria-label={t("combobox.clear")}
			tabIndex={-1}
			render={<InputGroupButton variant="ghost" size="icon-xs" />}
			className={cn(className)}
			{...props}
		>
			<XIcon aria-hidden="true" className="pointer-events-none" />
		</ComboboxPrimitive.Clear>
	)
}

function ComboboxInput({
	className,
	children,
	disabled = false,
	showTrigger = true,
	showClear = false,
	...props
}: ComboboxPrimitive.Input.Props & {
	showTrigger?: boolean
	showClear?: boolean
}) {
	const { t } = useI18n()
	return (
		<InputGroup className={cn("w-auto", className)}>
			<ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
						size="icon-xs"
						variant="ghost"
						aria-label={t("combobox.toggle")}
						tabIndex={-1}
						render={<ComboboxTrigger />}
						data-slot="input-group-button"
						className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
						disabled={disabled}
					/>
				)}
				{showClear && <ComboboxClear disabled={disabled} />}
			</InputGroupAddon>
			{children}
		</InputGroup>
	)
}

function ComboboxContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "start",
	alignOffset = 0,
	anchor,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		"side" | "align" | "sideOffset" | "alignOffset" | "anchor"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					data-chips={!!anchor}
					className={cn(
						"group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-11 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
						className
					)}
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	)
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				"no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
				className
			)}
			{...props}
		/>
	)
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex min-h-11 w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-3 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
				}
			>
				<CheckIcon className="pointer-events-none" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	)
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
	return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
	return (
		<ComboboxPrimitive.GroupLabel
			data-slot="combobox-label"
			className={cn("px-3 py-1.5 text-xs text-muted-foreground", className)}
			{...props}
		/>
	)
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
	return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
}

function ComboboxEmpty({ className, children, ...props }: ComboboxPrimitive.Empty.Props) {
	const { t } = useI18n()
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			role="status"
			className={cn(
				"flex w-full justify-center py-2 text-center text-sm text-muted-foreground empty:py-0",
				className
			)}
			{...props}
		>
			{children ?? t("combobox.empty")}
		</ComboboxPrimitive.Empty>
	)
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
	return (
		<ComboboxPrimitive.Separator
			data-slot="combobox-separator"
			className={cn("-mx-1 my-1 h-px bg-border", className)}
			{...props}
		/>
	)
}

function ComboboxChips({
	className,
	...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props) {
	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			className={cn(
				"flex min-h-11 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent bg-clip-padding px-3 py-1 text-sm transition-colors focus-within:shadow-ring has-aria-invalid:border-destructive has-data-[slot=combobox-chip]:px-1",
				className
			)}
			{...props}
		/>
	)
}

function ComboboxChip({
	className,
	children,
	showRemove = true,
	...props
}: ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean
}) {
	const { t } = useI18n()
	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				"flex h-11 w-fit items-center justify-center gap-1 rounded-sm bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
				className
			)}
			{...props}
		>
			{children}
			{showRemove && (
				<ComboboxPrimitive.ChipRemove
					aria-label={t("combobox.clear")}
					render={<Button variant="ghost" size="icon-xs" />}
					className="-ml-1 opacity-50 hover:opacity-100"
					data-slot="combobox-chip-remove"
				>
					<XIcon aria-hidden="true" className="pointer-events-none" />
				</ComboboxPrimitive.ChipRemove>
			)}
		</ComboboxPrimitive.Chip>
	)
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			className={cn("min-w-16 flex-1 outline-hidden", className)}
			{...props}
		/>
	)
}

function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null)
}

export {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	useComboboxAnchor,
}
