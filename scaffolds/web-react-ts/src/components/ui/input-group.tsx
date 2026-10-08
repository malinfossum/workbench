/* ======================================================================
   src/components/ui/input-group.tsx: shadcn/ui InputGroup
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/input-group). Registry
   dependency of combobox. House edits, re-applied on a re-add:
   - the group is h-11 (44 px) and every button inside it is 44 px: xs
     h-11, icon-xs and icon-sm size-11; the addon has no block padding so
     a 44 px button fits the 44 px group
   - focus: the group draws the DS ring (shadow-ring) when its control has
     focus-visible; the inner control draws none (shadow-none)
   - rounded-sm, the DS control radius; kbd rounded-xs (shadcn's --radius
     is never defined here)
   - no role="group" on the wrapper or the addon: the input is named by its
     label, and a nameless group only adds a node to the tree; the addon's
     click-to-focus handler is gone with it (pointer-only behaviour with no
     keyboard half; a 44 px button fills the addon anyway)
   - outline-hidden; dark: and aria-invalid ring variants dropped
   ====================================================================== */

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="input-group"
			className={cn(
				"group/input-group relative flex h-11 w-full min-w-0 items-center rounded-sm border border-input transition-colors outline-hidden in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:shadow-none has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:shadow-ring has-[[data-slot][aria-invalid=true]]:border-destructive has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
				className
			)}
			{...props}
		/>
	)
}

const inputGroupAddonVariants = cva(
	"flex h-auto items-center justify-center gap-2 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-xs [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				"inline-start": "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
				"inline-end": "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
				"block-start":
					"order-first w-full justify-start px-3 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
				"block-end":
					"order-last w-full justify-start px-3 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
			},
		},
		defaultVariants: {
			align: "inline-start",
		},
	}
)

function InputGroupAddon({
	className,
	align = "inline-start",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
	return (
		<div
			data-slot="input-group-addon"
			data-align={align}
			className={cn(inputGroupAddonVariants({ align }), className)}
			{...props}
		/>
	)
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
	variants: {
		size: {
			xs: "h-11 gap-1 px-2 [&>svg:not([class*='size-'])]:size-3.5",
			sm: "",
			"icon-xs": "size-11 p-0 has-[>svg]:p-0",
			"icon-sm": "size-11 p-0 has-[>svg]:p-0",
		},
	},
	defaultVariants: {
		size: "xs",
	},
})

function InputGroupButton({
	className,
	type = "button",
	variant = "ghost",
	size = "xs",
	...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
	VariantProps<typeof inputGroupButtonVariants> & {
		type?: "button" | "submit" | "reset"
	}) {
	return (
		<Button
			type={type}
			data-size={size}
			variant={variant}
			className={cn(inputGroupButtonVariants({ size }), className)}
			{...props}
		/>
	)
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		/>
	)
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
	return (
		<Input
			data-slot="input-group-control"
			className={cn(
				"flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:shadow-none disabled:bg-transparent",
				className
			)}
			{...props}
		/>
	)
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<Textarea
			data-slot="input-group-control"
			className={cn(
				"flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none focus-visible:shadow-none disabled:bg-transparent",
				className
			)}
			{...props}
		/>
	)
}

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
}
