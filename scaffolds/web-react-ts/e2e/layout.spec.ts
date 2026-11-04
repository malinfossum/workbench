/* ======================================================================
   e2e/layout.spec.ts: the layout audit over the built app
   One test per path, locale, width (320 to 1920) and text size (100, 200 %),
   plus WCAG 1.4.12 text spacing at 320 and 1280. e2e/layout-audit is
   extracted from the workbench (libraries/layout-audit); never edit it here.
   Add every route here as you build it. Known violations need a reason and
   can only shrink.
   ====================================================================== */
import { layoutSuite } from "./layout-audit/playwright.js"

layoutSuite({ paths: ["/"], locales: ["en-US", "nb-NO"] })
