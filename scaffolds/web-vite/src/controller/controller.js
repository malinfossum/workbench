/* ======================================================================
   src/controller/controller.js — CONTROLLER
   Behavior: handles view actions, updates the model, owns any timers.
   Never writes HTML — that's the view's job.
   ====================================================================== */

const LANG_STORAGE_KEY = "lang"

// The stored choice wins; a first visit follows the browser; anything
// unsupported lands on the fallback bundle.
export function initialLang(i18n) {
	return i18n.resolveLang(localStorage.getItem(LANG_STORAGE_KEY), navigator.language)
}

export function createController({ model, view, i18n }) {
	function init() {
		model.subscribe((state) => view.render(state))
		model.subscribe(syncDocumentLang)

		view.bindActions({
			"set-lang": (_event, target) => setLang(target.dataset.lang),
			// actionName: (event, target) => { update model state, then model.notify() }
		})

		model.notify() // first render
	}

	function setLang(lang) {
		localStorage.setItem(LANG_STORAGE_KEY, lang) // written only on an explicit choice
		model.setLang(lang)
	}

	// Document-level, not HTML: screen readers pick their voice from <html lang>,
	// and the tab title should read in the active language too.
	function syncDocumentLang(state) {
		document.documentElement.lang = state.lang
		document.title = i18n.t(state.lang, "app.title")
	}

	return { init }
}
