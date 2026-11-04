import { expect, test } from "@playwright/test";
import { checkLayout } from "../playwright.js";
import { cells, knownFor, validateKnown } from "../shared.js";

const GOOD = "/libraries/layout-audit/fixtures/good.html";
const BAD = "/libraries/layout-audit/fixtures/bad.html";
const EMPTY = "/libraries/layout-audit/fixtures/empty.html";
const cell = (path, extra = {}) => ({ path, width: 320, textSize: 100, spacing: false, ...extra });

test("a page with no primitives fails: the audit checked nothing", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(EMPTY), { locale: "en-US" });
	expect(errors.join("\n")).toMatch(/no primitives found/);
});

test("a page that opts out with expectPrimitives: 0 passes", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(EMPTY, { expectPrimitives: 0 }), { locale: "en-US" });
	expect(errors).toEqual([]);
});

test("an error page fails on its status", async ({ page }) => {
	const { errors } = await checkLayout(page, cell("/libraries/layout-audit/fixtures/missing.html"), { locale: "en-US" });
	expect(errors.join("\n")).toMatch(/answered HTTP 404/);
});

test("a locale cell that renders another language fails", async ({ page }) => {
	const { errors } = await checkLayout(page, cell(GOOD), { locale: "nb-NO" });
	expect(errors.join("\n")).toMatch(/rendered <html lang="en">/);
});

test("a known entry covers its violation and nothing else", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#bad-row", reason: "fixture" }];
	const { errors } = await checkLayout(page, cell(BAD), { locale: "en-US", known });
	expect(errors.some((e) => e.endsWith("(#bad-row)"))).toBe(false);
	expect(errors.join("\n")).toMatch(/^switcher: /m);
});

test("a known entry that no longer reproduces fails, so the list only shrinks", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#row-good", reason: "fixed long ago" }];
	const { errors } = await checkLayout(page, cell(GOOD), { locale: "en-US", known });
	expect(errors.join("\n")).toMatch(/no longer reproduces, remove it: control-row #row-good \(fixed long ago\)/);
});

test("a known entry with an invalid selector fails loudly", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "#row-good[", reason: "typo" }];
	await expect(checkLayout(page, cell(BAD), { locale: "en-US", known })).rejects.toThrow(/invalid selector/);
});

test("a known entry that covers the whole page is refused", async ({ page }) => {
	const known = [{ contract: "control-row", selector: "main", reason: "silence everything" }];
	await expect(checkLayout(page, cell(BAD), { locale: "en-US", known })).rejects.toThrow(/covers the whole page/);
});

test("known entries apply only to the cells they name", () => {
	const known = [{ contract: "control-row", selector: "#x", reason: "narrow only", widths: [320] }];
	expect(knownFor(known, cell(GOOD), "en-US")).toHaveLength(1);
	expect(knownFor(known, cell(GOOD, { width: 1280 }), "en-US")).toHaveLength(0);
});

test("a known entry without a reason is refused", () => {
	expect(() => validateKnown([{ contract: "control-row", selector: "#x" }])).toThrow(/reason/);
});

test("the matrix has six widths at two text sizes plus two spacing cells per path", () => {
	const all = cells(["/a", { path: "/b", expectPrimitives: 0 }]);
	expect(all).toHaveLength(28);
	expect(all.filter((c) => c.spacing).map((c) => c.width)).toEqual([320, 1280, 320, 1280]);
	expect(all.filter((c) => c.path === "/b").every((c) => c.expectPrimitives === 0)).toBe(true);
});
