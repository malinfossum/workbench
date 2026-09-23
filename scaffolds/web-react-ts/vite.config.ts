/* ======================================================================
   vite.config.ts
   The react plugin is required; everything else is optional.
   `test` holds two Vitest projects: `unit` runs DOM-free service tests
   in Node, `browser` renders components in real Chromium (Playwright).
   The browser locale is pinned so tests read the same on every machine;
   otherwise the app follows the OS language via navigator.language.
   ====================================================================== */

import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	// If you deploy to GitHub Pages under a repo name, set:
	// base: '/your-repo-name/',
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["tests/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["tests/components/**/*.test.tsx"],
					setupFiles: ["tests/components/setup.ts"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({ contextOptions: { locale: "en-US" } }),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
})
