/* ======================================================================
   tests/components/pickers.ts: picker helpers for component tests
   A <summary> is not a button to Playwright's role engine (Chromium
   exposes it as a disclosure triangle), so the trigger is found by its
   data-picker name. The <details> itself is a group named after the
   trigger's text, which is how a trigger name is asserted.
   ====================================================================== */

export type PickerName = "lang" | "theme" | "currency"

export function trigger(root: Element, name: PickerName): HTMLElement {
	const summary = root.querySelector<HTMLElement>(`details[data-picker="${name}"] > summary`)
	if (!summary) throw new Error(`no ${name} picker in the rendered header`)
	return summary
}

export function triggerName(root: Element, name: PickerName): string {
	return trigger(root, name).querySelector(".sr-only")?.textContent ?? ""
}

export function openPickers(root: Element): number {
	return root.querySelectorAll("details[data-picker][open]").length
}
