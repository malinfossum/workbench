/* ======================================================================
   src/services/counter.ts — EXAMPLE SERVICE
   Pure logic only: no React, no DOM. This is the layer unit tests target
   (see tests/counter.test.ts). Delete alongside the Counter example.
   ====================================================================== */

export function increment(count: number): number {
	return count + 1
}

export function decrement(count: number): number {
	// Example domain rule: this counter never goes below zero.
	return Math.max(0, count - 1)
}
