/* Optional Core Web Vitals check: LCP and CLS read with PerformanceObserver in the
   page, no extra dependency. Takes a Playwright or a Puppeteer page (both have goto
   and evaluate). Chromium only: other engines don't report largest-contentful-paint.
   Numbers from localhost are lab numbers (no network, a fast machine). They catch a
   regression between two runs; they don't predict what a visitor on a phone gets. */
export const VITALS_BUDGET = { lcp: 2500, cls: 0.1 };

export async function measureVitals(page, url, { budget = VITALS_BUDGET, settleMs = 1000 } = {}) {
	await page.goto(url, { waitUntil: "load" });
	const vitals = await page.evaluate(async (ms) => {
		const types = PerformanceObserver.supportedEntryTypes;
		if (!types.includes("largest-contentful-paint") || !types.includes("layout-shift")) return { supported: false };
		const out = { supported: true, lcp: null, cls: 0 };
		new PerformanceObserver((list) => {
			const entries = list.getEntries();
			out.lcp = entries[entries.length - 1].startTime;
		}).observe({ type: "largest-contentful-paint", buffered: true });
		// CLS is the worst session window: shifts less than 1 s apart, at most 5 s long.
		let session = 0, first = 0, last = 0;
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) {
				if (e.hadRecentInput) continue;
				if (session > 0 && e.startTime - last < 1000 && e.startTime - first < 5000) session += e.value;
				else [session, first] = [e.value, e.startTime];
				last = e.startTime;
				out.cls = Math.max(out.cls, session);
			}
		}).observe({ type: "layout-shift", buffered: true });
		await new Promise((done) => setTimeout(done, ms));
		return out;
	}, settleMs);
	if (!vitals.supported) return { lcp: null, cls: null, errors: ["this browser does not report LCP and CLS: run the vitals check in Chromium"] };
	const errors = [];
	if (vitals.lcp === null) errors.push("no LCP candidate: the page painted no text or image");
	else if (vitals.lcp > budget.lcp) errors.push(`LCP ${Math.round(vitals.lcp)} ms is over the ${budget.lcp} ms budget (lab number)`);
	if (vitals.cls > budget.cls) errors.push(`CLS ${vitals.cls.toFixed(3)} is over the ${budget.cls} budget`);
	return { lcp: vitals.lcp, cls: vitals.cls, errors };
}
