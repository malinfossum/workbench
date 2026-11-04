/* Playwright adapter: layoutSuite() makes one test per path, locale, width and
   text size, plus the WCAG 1.4.12 spacing cells. A failing test lists every
   violation and attaches a screenshot with each violator outlined in red. */
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { cellName, cells, knownFor, TEXT_SPACING_CSS, textSizeCss, unreachableKnown, VIEWPORT_HEIGHT, validateKnown, verdict } from "./shared.js";

export { CONTRACTS, validateKnown, unreachableKnown } from "./shared.js";

const AUDIT = fileURLToPath(new URL("./audit.js", import.meta.url));

// Load a path the way a returning visitor sees it: fonts loaded, then a reload with
// them cached (a font-display: optional face may skip the first paint).
export async function settle(page, path) {
	await page.goto(path);
	await page.evaluate(() => document.fonts.ready);
	const response = await page.reload();
	await page.evaluate(() => document.fonts.ready);
	return response?.status() ?? 0;
}

export async function checkLayout(page, cell, { locale, known = [], checkLang = true } = {}) {
	await page.setViewportSize({ width: cell.width, height: VIEWPORT_HEIGHT });
	const status = await settle(page, cell.path);
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ path: AUDIT });
	const { report, lang } = await page.evaluate(async (entries) => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return { report: globalThis.auditLayout(document, { known: entries, mark: true }), lang: document.documentElement.lang };
	}, knownFor(known, cell, locale));
	return { report, errors: verdict(report, { cell, locale, lang: checkLang ? lang : undefined, status }) };
}

export function layoutSuite({ paths, locales = ["en-US"], known = [], checkLang = true }) {
	validateKnown(known);
	const unreachable = unreachableKnown(known, paths, locales);
	if (unreachable.length > 0) {
		const scope = (k) => ["paths", "widths", "textSizes", "locales", "spacing"].filter((f) => k[f] !== undefined).map((f) => `${f}: ${JSON.stringify(k[f])}`).join(", ");
		throw new Error(unreachable.map((k) => `known entry matches no cell: ${k.contract} ${k.selector} (${scope(k)})`).join("\n"));
	}
	for (const locale of locales) {
		test.describe(`layout, ${locale}`, () => {
			test.use({ locale, reducedMotion: "reduce", bypassCSP: true });
			for (const cell of cells(paths)) {
				test(cellName(cell), async ({ page }, testInfo) => {
					const { errors } = await checkLayout(page, cell, { locale, known, checkLang });
					if (errors.length > 0) {
						await testInfo.attach("violations outlined", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
					}
					expect(errors, errors.join("\n")).toEqual([]);
				});
			}
		});
	}
}
