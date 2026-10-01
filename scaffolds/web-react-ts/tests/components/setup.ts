/* ======================================================================
   tests/components/setup.ts — browser project setup
   Loads the same stylesheets index.html links, in the same order, plus
   picker.js, and sets the default theme (the test browser's colour
   scheme is pinned to dark in vite.config.ts), so components render
   exactly as in the app. That is what lets axe measure colour contrast
   in component tests. Stored choices (language, theme, currency) are
   cleared before each test so no test inherits the last one's.
   ====================================================================== */

import { beforeEach } from "vitest"
import "../../design-system/tokens/index.css"
import "../../design-system/base/reset.css"
import "../../design-system/base/base.css"
import "../../design-system/primitives/index.css"
import "../../design-system/components/index.css"
import "../../design-system/compositions/index.css"
import "../../design-system/utilities/index.css"
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
