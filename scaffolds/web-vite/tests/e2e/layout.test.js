/* ======================================================================
   tests/e2e/layout.test.js: the layout audit over the real page
   Every width (320 to 1920), text size (100, 200 %) and locale, plus WCAG
   1.4.12 text spacing at 320 and 1280. A failing cell saves a screenshot with
   the violators outlined to test-results/. tests/e2e/layout-audit is extracted
   from the workbench (libraries/layout-audit); never edit it here.
   ====================================================================== */
import assert from "node:assert/strict"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { after, before, test } from "node:test"
import puppeteer from "puppeteer"
import { createServer } from "vite"
import { cellName, cells, checkLayout } from "./layout-audit/puppeteer.js"

const ROOT = resolve(import.meta.dirname, "../..")
// [locale the cell is named for, the stored "lang" preference that selects it]
const LOCALES = [
	["en-US", "en"],
	["nb-NO", "nb"],
]

let server
let browser
let origin

before(async () => {
	server = await createServer({ root: ROOT, logLevel: "silent", server: { port: 4318 } })
	await server.listen()
	origin = server.resolvedUrls.local[0]
	browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] })
})

after(async () => {
	await browser?.close()
	await server?.close()
})

for (const [locale, lang] of LOCALES) {
	for (const cell of cells(["/"])) {
		test(`layout, ${locale}: ${cellName(cell)}`, async () => {
			const context = await browser.createBrowserContext()
			try {
				const page = await context.newPage()
				await page.evaluateOnNewDocument((value) => localStorage.setItem("lang", value), lang)
				const { errors } = await checkLayout(page, new URL(cell.path, origin).href, cell, {
					locale,
				})
				if (errors.length > 0) {
					mkdirSync("test-results", { recursive: true })
					await page.screenshot({
						path: `test-results/layout-${lang}-${cell.width}-${cell.textSize}${cell.spacing ? "-spacing" : ""}.png`,
						fullPage: true,
					})
				}
				assert.deepEqual(errors, [])
			} finally {
				await context.close()
			}
		})
	}
}
