/* ======================================================================
   tests/locales.test.js — every bundle carries the same keys
   A key added to one language and forgotten in another renders as the
   raw key in the UI. This catches it before anyone sees it.
   ====================================================================== */

import assert from "node:assert/strict"
import { test } from "node:test"
import { bundles, FALLBACK_LANG } from "../src/locales/index.js"

const reference = Object.keys(bundles[FALLBACK_LANG]).sort()

for (const [lang, bundle] of Object.entries(bundles)) {
	test(`locales/${lang}.json has exactly the ${FALLBACK_LANG} keys`, () => {
		assert.deepEqual(Object.keys(bundle).sort(), reference)
	})

	test(`locales/${lang}.json has no empty strings`, () => {
		const empty = Object.entries(bundle).filter(([, value]) => value.trim() === "")
		assert.deepEqual(empty, [])
	})
}
