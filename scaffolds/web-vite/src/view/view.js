/* ======================================================================
   src/view/view.js — VIEW
   Renders HTML from state and forwards user actions to the controller.
   No state mutation. No timers.
   Interactive elements carry a data-action attribute
   (e.g. <button data-action="add">); bindActions routes them by name.
   Every user-facing string goes through t() — never a literal.
   ====================================================================== */

export function createView(rootEl, i18n) {
	function render(state) {
		const t = (key, vars) => i18n.t(state.lang, key, vars)

		// t() returns plain text: interpolate user-supplied values only through
		// textContent, or escape them first — never straight into innerHTML.
		rootEl.innerHTML = `
			<h1>${t("app.title")}</h1>
			<p>${t("app.tagline")}</p>
			${languageSwitcher(state.lang, t)}
		`
		// build the rest of the UI from state here
	}

	function languageSwitcher(active, t) {
		const buttons = i18n.languages
			.map(
				(lang) => `
					<button
						type="button"
						class="btn btn-ghost"
						data-action="set-lang"
						data-lang="${lang}"
						aria-pressed="${lang === active}"
						lang="${lang}"
					>${t(`lang.${lang}`)}</button>`
			)
			.join("")
		return `
			<nav aria-label="${t("lang.label")}" class="cluster">${buttons}</nav>
		`
	}

	// One delegated listener; handlers = { actionName: (event, target) => {} }
	function bindActions(handlers) {
		rootEl.addEventListener("click", (event) => {
			const target = event.target.closest("[data-action]")
			if (!target) return
			handlers[target.dataset.action]?.(event, target)
		})
	}

	return { render, bindActions }
}
