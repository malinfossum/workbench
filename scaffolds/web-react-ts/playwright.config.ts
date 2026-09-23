/* ======================================================================
   playwright.config.ts — Layer 2: full-page accessibility scan
   Builds the app, serves the production preview and runs e2e/ against it
   in Chromium. Shares the browser Vitest's browser project uses, so one
   `npx playwright install --only-shell chromium` covers both layers.
   The locale is pinned so the app starts in English on every machine.
   ====================================================================== */

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "e2e",
	use: {
		baseURL: "http://localhost:4173",
		locale: "en-US",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "npm run build && npm run preview -- --strictPort",
		url: "http://localhost:4173",
		reuseExistingServer: true,
		timeout: 120_000,
	},
})
