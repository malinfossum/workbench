/* ======================================================================
   e2e/layout.spec.ts: the layout audit over the built app
   One test per path, locale, width (320 to 1920) and text size (100, 200 %),
   plus WCAG 1.4.12 text spacing at 320 and 1280. e2e/layout-audit is
   extracted from the workbench (libraries/layout-audit); never edit it here.
   Add every route here as you build it. Known violations need a reason and
   can only shrink.
   ====================================================================== */
import { readdirSync } from "node:fs"
import { layoutSuite } from "./layout-audit/playwright.js"

// One locale per src/locales/*.json, so a new language is audited the day it
// lands. Bare codes map to the tags the app renders; others pass as they are.
const TAGS: Record<string, string> = { en: "en-US", nb: "nb-NO" }
const locales = readdirSync(new URL("../src/locales", import.meta.url))
	.filter((file) => file.endsWith(".json"))
	.map((file) => file.slice(0, -".json".length))
	.map((code) => TAGS[code] ?? code)

layoutSuite({ paths: ["/"], locales })
