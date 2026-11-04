/* ======================================================================
   src/components/layout.tsx: DESIGN SYSTEM LAYOUT PRIMITIVES
   Thin wrappers that only render the design system class, so a row of
   controls, a switcher, a row list or a card grid decides its layout once
   for the whole group. e2e/layout.spec.ts audits all of them.
   A row of controls hand-rolled with Tailwind (flex gap-2) when one of
   these fits is a review finding.
   Card renders an <article>: use it for self-contained items (a service,
   a result). A panel that is not one stays <div className="card">.
   ====================================================================== */

import { cn } from "cn"
import type { ComponentProps, CSSProperties } from "react"

export function ControlRow({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("control-row", className)} {...props} />
}

export function Switcher({
	className,
	style,
	threshold,
	...props
}: ComponentProps<"div"> & { threshold?: string }) {
	const vars = threshold ? ({ "--switcher-threshold": threshold } as CSSProperties) : undefined
	return <div className={cn("switcher", className)} style={{ ...vars, ...style }} {...props} />
}

export function RowList({ className, ...props }: ComponentProps<"ul">) {
	return <ul className={cn("row-list", className)} {...props} />
}

export function CardGrid({
	className,
	style,
	min,
	...props
}: ComponentProps<"div"> & { min?: string }) {
	const vars = min ? ({ "--card-min": min } as CSSProperties) : undefined
	return <div className={cn("card-grid", className)} style={{ ...vars, ...style }} {...props} />
}

export function Card({
	className,
	style,
	slots,
	...props
}: ComponentProps<"article"> & { slots?: number }) {
	const vars = slots ? ({ "--card-slots": String(slots) } as CSSProperties) : undefined
	return <article className={cn("card", className)} style={{ ...vars, ...style }} {...props} />
}
