import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DS = join(import.meta.dirname, "..", "libraries", "design-system");

// A page with the given body, running the design system's classic scripts in
// order, the way index.html loads them at the end of <body>. The http origin
// gives the window a working localStorage; pretendToBeVisual gives it
// requestAnimationFrame. jsdom has no matchMedia, so System resolves to dark.
export function loadPage(body, scripts = []) {
	const dom = new JSDOM(`<!doctype html><html lang="en"><head></head><body>${body}</body></html>`, {
		url: "http://localhost/",
		runScripts: "outside-only",
		pretendToBeVisual: true,
	});
	for (const rel of scripts) dom.window.eval(readFileSync(join(DS, rel), "utf8"));
	return dom.window;
}

// Two frames, so a line written on the next frame has landed.
export const frames = (window) => new Promise((done) => window.requestAnimationFrame(() => window.requestAnimationFrame(done)));
