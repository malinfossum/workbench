/* Manual browser check for the design system's Footer panel (spec § 6). Not a
   spec file, so `playwright test` ignores it; no CI job audits the gallery.
   Runs the layout audit over the page, sidebar hidden, at every cell of the shared matrix
   (default theme), checks one row at 1280 px, and hovers the first and last
   tooltip host at 320 px with the bubble inside the viewport. Prints the counts
   to paste into the PR. Needs the self-test server: `node selftest/serve.mjs`
   from libraries/layout-audit, then `node selftest/gallery-footer.mjs`. From 768 px
   the gallery is a sidebar plus a capped column, so the script hosts the Footer
   panel in one page-width column, which is the container the composition is written
   for. The gallery's own layout at 200 % text is not what this script proves. */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { cellName, cells, TEXT_SPACING_CSS, textSizeCss, verdict, VIEWPORT_HEIGHT } from "../shared.js";

const ORIGIN = "http://127.0.0.1:4400";
const GALLERY = "/libraries/design-system/gallery/index.html";
const PAGE_WIDTH_CSS = ".gallery { display: block; } .gallery-sidebar { display: none; } .gallery-main { max-width: none; }";
const AUDIT = fileURLToPath(new URL("../audit.js", import.meta.url));

async function openFooter(page, width) {
	await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
	await page.goto(ORIGIN + GALLERY);
	await page.evaluate(() => document.fonts.ready);
	await page.click('[data-action="nav"][data-id="footer"]');
	await page.waitForSelector(".site-footer");
	await page.addStyleTag({ content: PAGE_WIDTH_CSS });
}

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "en-US", reducedMotion: "reduce" });
const page = await context.newPage();
let failures = 0;

for (const cell of cells([GALLERY])) {
	await openFooter(page, cell.width);
	if (cell.textSize !== 100) await page.addStyleTag({ content: textSizeCss(cell.textSize) });
	if (cell.spacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
	await page.addScriptTag({ path: AUDIT });
	const report = await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return globalThis.auditLayout(document, { known: [], mark: false });
	});
	const errors = verdict(report, { cell, locale: "en-US", lang: undefined, status: 200 });
	failures += errors.length;
	console.log(`${errors.length === 0 ? "ok  " : "FAIL"} ${cellName(cell)}: ${errors.length} violations${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
}

await openFooter(page, 1280);
const oneRow = await page.evaluate(() => {
	const boxes = [...document.querySelector(".site-footer-row").children].map((el) => el.getBoundingClientRect());
	return Math.max(...boxes.map((b) => b.top)) < Math.min(...boxes.map((b) => b.bottom));
});
if (!oneRow) failures += 1;
console.log(`${oneRow ? "ok  " : "FAIL"} 1280 px: lead, nav, note and bar share one row`);

await openFooter(page, 320);
for (const which of ["first", "last"]) {
	const host = page.locator(".site-footer-bar .tip-host")[which]();
	await host.hover();
	const inside = await host.evaluate((el) => {
		const b = el.querySelector(".tip-bubble").getBoundingClientRect();
		return getComputedStyle(el.querySelector(".tip")).display !== "none" && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight;
	});
	if (!inside) failures += 1;
	console.log(`${inside ? "ok  " : "FAIL"} 320 px: the ${which} tooltip bubble shows inside the viewport`);
}

await browser.close();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
