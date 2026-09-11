/* ======================================================================
   src/app.js — APP WIRING
   Connects model, view, and controller. Rarely edited — day-to-day work
   happens in src/model, src/view, and src/controller.
   ====================================================================== */

import { createTranslator } from "../i18n/index.js"
import { createController, initialLang } from "./controller/controller.js"
import { bundles, FALLBACK_LANG } from "./locales/index.js"
import { createModel } from "./model/model.js"
import { createView } from "./view/view.js"

export function createApp() {
	// If you rename the root element in index.html, update it here once.
	const root = document.getElementById("main")
	if (!root) throw new Error("Missing #main element in index.html")

	const i18n = createTranslator(bundles, { fallback: FALLBACK_LANG })
	const model = createModel({ lang: initialLang(i18n) })
	const view = createView(root, i18n)
	const controller = createController({ model, view, i18n })

	controller.init()
}
