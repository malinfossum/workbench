/* ======================================================================
   tests/components/axe.ts — Layer 1 accessibility helper
   Runs axe-core on a rendered component in the real browser, with the
   PAGE-LEVEL rules disabled. A component test checks the component's own
   accessibility (roles, names, labels, contrast); whole-document rules
   (lang, title, single main landmark, region, bypass, one h1) belong to
   Layer 2 — e2e/app.spec.ts scans the real built page.
   This is intentional scoping, not suppression.
   ====================================================================== */

import axe from "axe-core"

const PAGE_LEVEL_RULES = {
	region: { enabled: false },
	"landmark-one-main": { enabled: false },
	"page-has-heading-one": { enabled: false },
	"html-has-lang": { enabled: false },
	"document-title": { enabled: false },
	bypass: { enabled: false },
}

export interface Violation {
	id: string
	help: string
	targets: string[]
}

// Returns axe violations for the element, trimmed to what a failure needs
// to show: the rule id, the help text and the offending selectors.
// An empty array means no violations.
export async function axeComponent(element: Element): Promise<Violation[]> {
	const { violations } = await axe.run(element, { rules: PAGE_LEVEL_RULES })
	return violations.map(({ id, help, nodes }) => ({
		id,
		help,
		targets: nodes.map((n) => n.target.join(" ")),
	}))
}
