/* ======================================================================
   src/components/ui/textarea.tsx: shadcn/ui Textarea
   Source: shadcn/ui, style base-nova, MIT
   (https://ui.shadcn.com/docs/components/base/textarea). Registry
   dependency of combobox (input-group). House edits, re-applied on a
   re-add:
   - px-3, rounded-sm: the DS control padding and radius
   - focus-visible:shadow-ring replaces the ring utilities; outline-hidden
   - dark: and aria-invalid ring variants dropped
   ====================================================================== */

import { cn } from "cn"
import type * as React from "react"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-base transition-colors outline-hidden placeholder:text-muted-foreground focus-visible:shadow-ring disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
				className
			)}
			{...props}
		/>
	)
}

export { Textarea }
