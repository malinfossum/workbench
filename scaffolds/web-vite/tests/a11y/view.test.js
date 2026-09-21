/* ======================================================================
   tests/a11y/view.test.js — Layer 1: component accessibility tests
   Renders the real view into a jsdom document and asserts axe-core finds
   no violations. Copy this shape for every view you add: render it with
   representative (synthetic) state, then assert on axeComponent(mount).
   Layer 1 catches missing names, labels, roles and broken structure.
   The Pa11y scan (.pa11yci.json) catches contrast and document-level
   issues on the built page in a real browser. Neither layer checks
   keyboard order, focus handling or whether labels make sense — test
   those by hand before shipping a view.
   ====================================================================== */

import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { createTranslator } from "../../i18n/index.js"
import { bundles, FALLBACK_LANG } from "../../src/locales/index.js"
import { createView } from "../../src/view/view.js"
import { axeComponent, createMount } from "./axe-helper.js"

const i18n = createTranslator(bundles, { fallback: FALLBACK_LANG })

let dom
afterEach(() => dom?.close())

for (const lang of Object.keys(bundles)) {
	test(`view renders without axe violations (${lang})`, async () => {
		dom = createMount(lang)
		createView(dom.mount, i18n).render({ lang })
		assert.deepEqual(await axeComponent(dom.mount), [])
	})
}

// Proves the harness reports real problems instead of passing silently.
// A visible glyph counts as text, so the icon is hidden from assistive
// technology the way a real icon would be; the button then has no name.
test("an icon-only button with no accessible name is reported", async () => {
	dom = createMount()
	dom.mount.innerHTML = `<button type="button"><span aria-hidden="true">&#9881;</span></button>`
	const violations = await axeComponent(dom.mount)
	assert.deepEqual(
		violations.map((v) => v.id),
		["button-name"]
	)
})
