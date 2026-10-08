/* ======================================================================
   tests/components/measure.ts — geometry and colour helpers
   Numbers read off the rendered element, never assumed: the 44 px
   control floor, a computed length, and the colour a design-system
   token resolves to on the current theme and palette (a probe element
   paints its background with the token, then reports the computed
   colour, so it compares like for like with another element's
   background).
   ====================================================================== */

export const CONTROL_MIN = 44

export function heightOf(element: Element | null | undefined): number {
	if (!element) throw new Error("element missing")
	return element.getBoundingClientRect().height
}

export function widthOf(element: Element | null | undefined): number {
	if (!element) throw new Error("element missing")
	return element.getBoundingClientRect().width
}

export function computed(element: Element, property: string): string {
	return getComputedStyle(element).getPropertyValue(property)
}

export function tokenColor(token: string): string {
	const probe = document.createElement("span")
	probe.style.backgroundColor = `var(${token})`
	document.body.append(probe)
	const color = getComputedStyle(probe).backgroundColor
	probe.remove()
	return color
}

// Every control in the list is at least 44 px tall; returns the offenders
// with their heights so a failure says which one.
export function shortControls(elements: Iterable<Element>): string[] {
	return [...elements]
		.map((el) => ({ el, height: heightOf(el) }))
		.filter(({ height }) => height < CONTROL_MIN)
		.map(({ el, height }) => `${el.tagName.toLowerCase()} "${el.textContent?.trim()}" ${height}px`)
}
