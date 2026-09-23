/* ======================================================================
   tests/locales.test.ts — every bundle carries the same keys
   A key added to one language and forgotten in another renders in the
   fallback language instead. This catches it before anyone sees it.
   ====================================================================== */

import { expect, test } from "vitest"
import { bundles, FALLBACK_LANG } from "../src/locales/index.ts"

const reference = Object.keys(bundles[FALLBACK_LANG]).sort()

for (const [lang, bundle] of Object.entries(bundles)) {
	test(`locales/${lang}.json has exactly the ${FALLBACK_LANG} keys`, () => {
		expect(Object.keys(bundle).sort()).toEqual(reference)
	})

	test(`locales/${lang}.json has no empty strings`, () => {
		const empty = Object.entries(bundle).filter(([, value]) => value.trim() === "")
		expect(empty).toEqual([])
	})
}
