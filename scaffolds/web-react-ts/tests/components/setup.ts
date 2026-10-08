/* ======================================================================
   tests/components/setup.ts — browser project setup
   Loads the same stylesheets main.tsx imports, in the same order, plus
   picker.js, and sets the default theme (the test browser's colour
   scheme is pinned to dark in vite.config.ts), so components render
   exactly as in the app. That is what lets axe measure colour contrast
   in component tests. Stored choices (language, theme, currency) are
   cleared before each test so no test inherits the last one's.
   ====================================================================== */

import { beforeEach } from "vitest"
import "../../src/styles/index.css"
import "../../src/styles/main.css"
import "../../design-system/components/picker.js"

document.documentElement.lang = "en"
document.documentElement.dataset.theme = "dark"
document.documentElement.dataset.palette = "default"

beforeEach(() => {
	localStorage.clear()
	document.documentElement.lang = "en"
	document.documentElement.dataset.theme = "dark"
})
