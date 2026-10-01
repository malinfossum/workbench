/* ======================================================================
   e2e/pickers.ts: shared helpers for the e2e specs
   The axe scan every spec runs, and the picker trigger by name: a
   <summary> is not a button to Playwright's role engine, so it is found
   through its data-picker attribute.
   ====================================================================== */

import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

export async function scan(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
	return violations.map(({ id, help, nodes }) => ({ id, help, count: nodes.length }))
}

export function picker(page: Page, name: "lang" | "theme" | "currency") {
	return page.locator(`details[data-picker="${name}"] > summary`)
}

export function triggerName(page: Page, name: "lang" | "theme" | "currency") {
	return picker(page, name).locator(".sr-only")
}
