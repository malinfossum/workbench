/* ======================================================================
   src/model/model.js — MODEL
   State and data only. No DOM. No timers.
   Change state through methods here, then call notify() so the view
   re-renders.
   ====================================================================== */

export function createModel({ lang }) {
	const subscribers = []

	const state = {
		lang, // active UI language — a bundle key from src/locales
		// project state goes here
	}

	function subscribe(fn) {
		subscribers.push(fn)
	}

	function notify() {
		for (const fn of subscribers) fn(state)
	}

	function setLang(next) {
		if (next === state.lang) return
		state.lang = next
		notify()
	}

	return { subscribe, notify, state, setLang }
}
