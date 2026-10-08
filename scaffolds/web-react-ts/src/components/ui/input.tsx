/* ======================================================================
   src/components/ui/input.tsx: shadcn/ui Input on Base UI
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/input). Registry dependency
   of combobox (input-group). House edits, re-applied on a re-add:
   - h-11 px-3 rounded-sm: the 44 px control height and the DS control
     radius, same as the DS .input
   - focus-visible:shadow-ring replaces the ring utilities; outline-hidden
   - dark: and aria-invalid ring variants dropped; the DS control border
     (border-input) is the SC 1.4.11 boundary in both themes
   ====================================================================== */

import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"
import type * as React from "react"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-11 w-full min-w-0 rounded-sm border border-input bg-transparent px-3 py-1 text-base transition-colors outline-hidden file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:shadow-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
				className
			)}
			{...props}
		/>
	)
}

export { Input }
