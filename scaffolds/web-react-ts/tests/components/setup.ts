/* ======================================================================
   tests/components/setup.ts — browser project setup
   Loads the same stylesheets index.html links, in the same order, and
   sets the default theme, so components render exactly as in the app.
   That is what lets axe measure colour contrast in component tests.
   Stored choices (language) are cleared before each test so no test
   inherits the last one's language.
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

document.documentElement.lang = "en"
document.documentElement.dataset.theme = "dark"
document.documentElement.dataset.palette = "default"

beforeEach(() => {
	localStorage.clear()
	document.documentElement.lang = "en"
})
