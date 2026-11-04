import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "selftest",
	use: { baseURL: "http://127.0.0.1:4400", reducedMotion: "reduce", bypassCSP: true },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "node selftest/serve.mjs",
		url: "http://127.0.0.1:4400/libraries/layout-audit/fixtures/good.html",
		reuseExistingServer: !process.env.CI,
	},
});
