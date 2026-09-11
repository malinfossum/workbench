/* ======================================================================
   tests/model.test.js — example model test
   The model is DOM-free, so it tests with node's built-in runner alone —
   no extra packages. Real projects add model methods (addItem, setFilter…)
   that mutate state and call notify(); test those the same way: call the
   method, assert on what subscribers receive.
   ====================================================================== */

import assert from "node:assert/strict"
import { test } from "node:test"
import { createModel } from "../src/model/model.js"

test("notify calls every subscriber with the state", () => {
	const model = createModel({ lang: "en" })
	const seen = []
	model.subscribe((state) => seen.push(state))
	model.subscribe((state) => seen.push(state))
	model.notify()
	assert.equal(seen.length, 2)
	assert.equal(seen[0], model.state)
})

test("state changes are visible to subscribers on the next notify", () => {
	const model = createModel({ lang: "en" })
	let rendered = null
	model.subscribe((state) => {
		rendered = { ...state }
	})
	// In a real project this mutation lives inside a model method that
	// ends with notify() — the mechanism under test is the same.
	model.state.count = 1
	model.notify()
	assert.equal(rendered.count, 1)
})

test("subscribers added later are not called for past notifies", () => {
	const model = createModel({ lang: "en" })
	let calls = 0
	model.notify()
	model.subscribe(() => {
		calls++
	})
	assert.equal(calls, 0)
	model.notify()
	assert.equal(calls, 1)
})

test("setLang stores the language and notifies once; a repeat is a no-op", () => {
	const model = createModel({ lang: "en" })
	let calls = 0
	model.subscribe(() => {
		calls++
	})
	model.setLang("nb")
	model.setLang("nb")
	assert.equal(model.state.lang, "nb")
	assert.equal(calls, 1)
})
