/* ======================================================================
   tests/counter.test.ts — example service test
   Services are pure and DOM-free, so they test without any browser
   environment. Real projects grow this pattern: put logic in services,
   test it here; components stay thin enough not to need tests at first.
   Component tests come later via jsdom + @testing-library/react.
   ====================================================================== */

import { expect, test } from "vitest"
import { decrement, increment } from "../src/services/counter.ts"

test("increment adds one", () => {
	expect(increment(0)).toBe(1)
	expect(increment(41)).toBe(42)
})

test("decrement subtracts one", () => {
	expect(decrement(2)).toBe(1)
})

test("decrement never goes below zero", () => {
	expect(decrement(0)).toBe(0)
})
