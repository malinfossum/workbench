/* The matrix and the verdict, shared by the Playwright and Puppeteer adapters.
   Values from the spec: six widths, text at 100 and 200 %, WCAG 1.4.12 text
   spacing at 320 and 1280 only. */
export const WIDTHS = [320, 375, 768, 1024, 1280, 1920];
export const TEXT_SIZES = [100, 200];
export const SPACING_WIDTHS = [320, 1280];
export const VIEWPORT_HEIGHT = 800;
export const TEXT_SPACING_CSS =
	"*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }";
export const textSizeCss = (percent) => `html { font-size: ${percent}% !important; }`;

export function cells(paths) {
	const out = [];
	for (const entry of paths) {
		const { path, expectPrimitives } = typeof entry === "string" ? { path: entry } : entry;
		for (const width of WIDTHS) {
			for (const textSize of TEXT_SIZES) out.push({ path, expectPrimitives, width, textSize, spacing: false });
		}
		for (const width of SPACING_WIDTHS) out.push({ path, expectPrimitives, width, textSize: 100, spacing: true });
	}
	return out;
}

export const cellName = (cell) => `${cell.path} at ${cell.width} px, text ${cell.textSize} %${cell.spacing ? ", WCAG 1.4.12 spacing" : ""}`;

export function validateKnown(known) {
	for (const entry of known) {
		if (!entry.contract || !entry.selector || !entry.reason?.trim()) {
			throw new Error(`a known violation needs contract, selector and a one-line reason: ${JSON.stringify(entry)}`);
		}
	}
}

// A known entry applies to the cells it names; an unscoped entry applies everywhere.
export function knownFor(known, cell, locale) {
	return known.filter(
		(k) =>
			(!k.paths || k.paths.includes(cell.path)) &&
			(!k.widths || k.widths.includes(cell.width)) &&
			(!k.textSizes || k.textSizes.includes(cell.textSize)) &&
			(!k.locales || k.locales.includes(locale)) &&
			(k.spacing === undefined || k.spacing === cell.spacing),
	);
}

// Everything that should fail a cell, as one line each. lang is undefined when the check is off.
export function verdict(report, { cell, locale, lang, status }) {
	const errors = [];
	if (status >= 400) errors.push(`${cell.path} answered HTTP ${status}; an error page is not a layout`);
	if (locale && lang !== undefined && lang.split("-")[0].toLowerCase() !== locale.split("-")[0].toLowerCase()) {
		errors.push(`locale ${locale} rendered <html lang="${lang}">; this cell would test the wrong language`);
	}
	if (report.primitives === 0 && cell.expectPrimitives !== 0) {
		errors.push(`no primitives found on ${cell.path}: the audit checked nothing. Pass { path, expectPrimitives: 0 } if that is deliberate`);
	}
	for (const v of report.violations) if (!v.known) errors.push(`${v.message} (${v.selector})`);
	for (const k of report.stale) errors.push(`known entry no longer reproduces, remove it: ${k.contract} ${k.selector} (${k.reason})`);
	return errors;
}
