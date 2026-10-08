/* ======================================================================
   src/components/ui/button.tsx: shadcn/ui Button on Base UI
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/button), added with
   `npx shadcn@4.21.4 add button`. House edits, re-applied on a re-add:
   - every size is at least 44 px tall: default h-11 px-4, sm h-11 px-3,
     xs h-11, lg h-12, icon and icon-xs and icon-sm size-11, icon-lg
     size-12; the per-size radius overrides are gone, the DS radius applies
   - rounded-sm, the DS control radius (--radius-sm), same as .btn
   - focus: focus-visible:shadow-ring (the DS focus ring) replaces the ring
     utilities; outline-hidden, never the outline reset utility
   - secondary carries border-input: its fill is about 1.2:1 against the
     page, so the edge is what identifies it as a control (SC 1.4.11); its
     hover mixes DS tokens directly, since shadcn's --secondary is the DS
     brand hue, not this fill
   - destructive is solid: bg-destructive text-destructive-foreground
   - dark: variants dropped; DS tokens flip themselves per theme
   Project UI uses the DS .btn; Button is for inside and beside shadcn
   components (README, "shadcn").
   ====================================================================== */

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-hidden select-none focus-visible:shadow-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/80",
				outline:
					"border-input bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
				secondary:
					"border-input bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--interactive-bg),var(--text)_8%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost:
					"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				xs: "h-11 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-11 gap-1 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-12 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-11",
				"icon-xs": "size-11 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-11",
				"icon-lg": "size-12",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
)

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
