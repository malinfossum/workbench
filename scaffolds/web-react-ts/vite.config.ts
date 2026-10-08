/* ======================================================================
   vite.config.ts
   The react plugin is required; everything else is optional.
   `test` holds two Vitest projects: `unit` runs DOM-free service tests
   in Node, `browser` renders components in real Chromium (Playwright).
   The browser locale and colour scheme are pinned so tests read the same
   on every machine; otherwise the app follows the OS through
   navigator.languages and prefers-color-scheme.
   ====================================================================== */

import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// "@/": src/. What the shadcn CLI and its docs assume; mirrored in tsconfig.json.
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
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
						// reducedMotion: the DS reduced-motion rule then silences every
						// popup animation, so axe and the geometry checks read a settled
						// element instead of a frame of a 100 ms fade-in.
						provider: playwright({
							contextOptions: { locale: "en-US", colorScheme: "dark", reducedMotion: "reduce" },
						}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
})
