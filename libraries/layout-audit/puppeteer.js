/* Puppeteer adapter for scaffolds that run node:test with Puppeteer (web-vite).
   Same steps as the Playwright adapter: settle, apply the cell, inject, audit, judge. */
import { readFileSync } from "node:fs";
import { knownFor, TEXT_SPACING_CSS, textSizeCss, VIEWPORT_HEIGHT, verdict } from "./shared.js";

export { CONTRACTS, cellName, cells, knownFor, unreachableKnown, validateKnown } from "./shared.js";

const AUDIT = readFileSync(new URL("./audit.js", import.meta.url), "utf8");

export async function checkLayout(page, url, cell, { locale, known = [], checkLang = true } = {}) {
	await page.setBypassCSP(true);
	await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
	await page.setViewport({ width: cell.width, height: VIEWPORT_HEIGHT });
	await page.goto(url, { waitUntil: "networkidle0" });
	await page.evaluate(() => document.fonts.ready);
	const response = await page.reload({ waitUntil: "networkidle0" });
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ content: AUDIT });
	const { report, lang } = await page.evaluate(async (entries) => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return { report: globalThis.auditLayout(document, { known: entries, mark: true }), lang: document.documentElement.lang };
	}, knownFor(known, cell, locale));
	return { report, errors: verdict(report, { cell, locale, lang: checkLang ? lang : undefined, status: response?.status() ?? 0 }) };
}
