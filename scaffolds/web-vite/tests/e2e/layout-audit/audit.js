/* workbench-lib: layout-audit v1.0.0 — extracted; edit in the workbench, not here */
/* ======================================================================
   layout-audit: auditLayout(document, options)
   Checks the layout contracts of the design system primitives in a live page
   and returns what broke, with the measured numbers. A classic script on
   purpose: Playwright, Puppeteer and the browser pane all inject it as a
   <script>, so it assigns globals instead of exporting.
   Test-only. Each scaffold's bundle test fails if "auditLayout" reaches a
   production build.
   ====================================================================== */
(() => {
	const TOLERANCE = 1;
	const CONTROL_FLOOR = 44;
	const VISIBLE = { visibilityProperty: true, checkVisibilityCSS: true };
	const CLIPPING = new Set(["hidden", "clip"]);
	const CLASS_CONTRACTS = {
		"control-row": ".control-row",
		switcher: ".switcher",
		"row-list": ".row-list",
		"card-grid": ".card-grid",
	};
	const ALIGN_CONTRACTS = { row: "control-row", switch: "switcher", rows: "row-list", slots: "card-grid" };
	// data-slot marks a shadcn part whose data-align is not ours (for example
	// InputGroupAddon's data-align="inline-end"), so it is never a group.
	const GROUPS = ".control-row, .switcher, .row-list, .card-grid, [data-align]:not([data-align='label']):not([data-slot])";
	const CONTROLS = [
		"button",
		"select",
		"textarea",
		"summary",
		"[role='button']",
		"input:not([type='checkbox'], [type='radio'], [type='hidden'], [type='range'])",
		".btn",
		".input",
		".select",
		".tab",
		".picker-row",
	].join(", ");

	const px = (n) => `${Math.round(n * 10) / 10} px`;
	const spread = (values) => Math.max(...values) - Math.min(...values);

	// Rendered and bigger than the 1 px box of the visually hidden pattern.
	function shown(el) {
		if (!el.checkVisibility(VISIBLE)) return false;
		const box = el.getBoundingClientRect();
		return box.width > TOLERANCE && box.height > TOLERANCE;
	}

	function labelOf(el) {
		const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
		if (text) return `"${text.length > 40 ? `${text.slice(0, 39)}…` : text}"`;
		return `<${el.localName}>`;
	}

	function selectorOf(el) {
		const parts = [];
		for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
			if (node.id) {
				parts.unshift(`#${CSS.escape(node.id)}`);
				break;
			}
			if (!node.parentElement) {
				parts.unshift(node.localName);
				break;
			}
			parts.unshift(`${node.localName}:nth-child(${[...node.parentElement.children].indexOf(node) + 1})`);
		}
		return parts.join(" > ");
	}

	function boxes(container) {
		return [...container.children].filter(shown).map((el) => ({ el, rect: el.getBoundingClientRect() }));
	}

	// Items whose vertical extents overlap share a visual line.
	function lines(items) {
		const result = [];
		for (const item of [...items].sort((a, b) => a.rect.top - b.rect.top)) {
			const line = result.find((l) => item.rect.top < l.bottom - TOLERANCE && item.rect.bottom > l.top + TOLERANCE);
			if (line) {
				line.items.push(item);
				line.bottom = Math.max(line.bottom, item.rect.bottom);
			} else {
				result.push({ top: item.rect.top, bottom: item.rect.bottom, items: [item] });
			}
		}
		return result;
	}

	function checkRow(container, add) {
		for (const line of lines(boxes(container))) {
			if (line.items.length < 2) continue;
			const heights = line.items.map((i) => i.rect.height);
			const bottoms = line.items.map((i) => i.rect.bottom);
			if (spread(heights) > TOLERANCE || spread(bottoms) > TOLERANCE) {
				const tallest = line.items.reduce((a, b) => (b.rect.height > a.rect.height ? b : a));
				add("control-row", container, `${labelOf(tallest.el)} ${px(Math.max(...heights))} vs ${px(Math.min(...heights))}, bottoms ${px(spread(bottoms))} apart`);
			}
		}
	}

	function checkSwitch(container, add) {
		const items = boxes(container);
		if (items.length < 2) return;
		const rows = lines(items);
		if (rows.length !== 1 && rows.length !== items.length) {
			add("switcher", container, `${items.length} items in ${rows.length} rows (${rows.map((r) => r.items.length).join(" + ")}); all side by side or all stacked`);
		}
	}

	function checkRows(container, add) {
		const pairs = [];
		for (const row of boxes(container)) {
			const parts = [...row.el.children].filter(shown);
			if (parts.length < 2) continue;
			const content = parts[0].getBoundingClientRect();
			const actions = parts[parts.length - 1].getBoundingClientRect();
			pairs.push({ beside: actions.top < content.bottom - TOLERANCE, left: actions.left });
		}
		const beside = pairs.filter((p) => p.beside).length;
		if (beside > 0 && beside < pairs.length) {
			add("row-list", container, `${beside} rows with actions beside, ${pairs.length - beside} below; one arrangement for all rows`);
		} else if (pairs.length > 1 && spread(pairs.map((p) => p.left)) > TOLERANCE) {
			add("row-list", container, `action column left edges ${px(spread(pairs.map((p) => p.left)))} apart`);
		}
	}

	function checkSlots(container, add) {
		// A subgrid has no implicit rows: parts beyond --card-slots pile into the last slot.
		for (const card of boxes(container)) {
			const slots = Number.parseInt(getComputedStyle(card.el).getPropertyValue("--card-slots"), 10);
			const parts = [...card.el.children].filter((s) => s.checkVisibility(VISIBLE)).length;
			if (slots > 0 && parts > slots) {
				add("card-grid", card.el, `${labelOf(card.el)} has ${parts} parts but --card-slots is ${slots}; the extra parts overlap the last slot`);
			}
		}
		for (const line of lines(boxes(container))) {
			if (line.items.length < 2) continue;
			// An empty slot element still takes its grid track, so count by rendering, not by size.
			const slots = line.items.map((card) => [...card.el.children].filter((s) => s.checkVisibility(VISIBLE)).map((s) => s.getBoundingClientRect().top));
			const count = Math.max(...slots.map((s) => s.length));
			for (let k = 0; k < count; k++) {
				const tops = slots.filter((s) => s.length > k).map((s) => s[k]);
				if (tops.length > 1 && spread(tops) > TOLERANCE) {
					add("card-grid", container, `slot ${k + 1} tops ${px(spread(tops))} apart across ${tops.length} cards in one row`);
				}
			}
		}
	}

	const CHECKS = { "control-row": checkRow, switcher: checkSwitch, "row-list": checkRows, "card-grid": checkSlots };

	function checkLabel(label, value, add) {
		if (!value) {
			add("label", label, `${labelOf(label)} has no value element after it`);
			return;
		}
		const a = getComputedStyle(label);
		const b = getComputedStyle(value);
		if (a.fontWeight === b.fontWeight && a.fontSize === b.fontSize && a.color === b.color) {
			add("label", label, `${labelOf(label)} looks like its value (weight ${a.fontWeight}, size ${a.fontSize}, colour ${a.color})`);
		}
	}

	function checkFloor(container, add, checked) {
		for (const control of container.querySelectorAll(CONTROLS)) {
			if (checked.has(control) || !shown(control)) continue;
			checked.add(control);
			const height = control.getBoundingClientRect().height;
			if (height < CONTROL_FLOOR - TOLERANCE) add("control-floor", control, `${labelOf(control)} ${px(height)} tall, under ${CONTROL_FLOOR} px`);
		}
	}

	function checkClipped(container, add) {
		for (const el of [container, ...container.querySelectorAll("*")]) {
			if (!shown(el) || !el.textContent.trim()) continue;
			const style = getComputedStyle(el);
			const clipsX = CLIPPING.has(style.overflowX) && el.scrollWidth > el.clientWidth + TOLERANCE;
			const clipsY = CLIPPING.has(style.overflowY) && el.scrollHeight > el.clientHeight + TOLERANCE;
			if (clipsX || clipsY) {
				add("clipped-text", el, `${labelOf(el)} needs ${px(el.scrollWidth)} x ${px(el.scrollHeight)} but its box is ${px(el.clientWidth)} x ${px(el.clientHeight)}`);
			}
		}
	}

	function checkPage(doc, add) {
		const root = doc.documentElement;
		if (!doc.body || root.scrollWidth <= root.clientWidth) return;
		const wide = [...doc.body.querySelectorAll("*")].filter((el) => shown(el) && el.getBoundingClientRect().right > root.clientWidth + TOLERANCE);
		const leaves = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
		add("no-sideways-scroll", leaves[0] ?? doc.body, `page is ${px(root.scrollWidth)} wide in a ${px(root.clientWidth)} viewport (${leaves.length} elements stick out)`);
	}

	function contractsOf(el, add) {
		const found = new Set();
		for (const [name, selector] of Object.entries(CLASS_CONTRACTS)) if (el.matches(selector)) found.add(name);
		const align = el.getAttribute("data-align");
		// A shadcn part (data-slot) carries its own data-align values; not a typo of ours.
		if (align !== null && align !== "label" && !el.hasAttribute("data-slot")) {
			if (ALIGN_CONTRACTS[align]) found.add(ALIGN_CONTRACTS[align]);
			else add("data-align", el, `unknown contract "${align}"; use row, switch, rows, slots or label`);
		}
		return found;
	}

	// A known entry names one component. One that matches the root, body or main
	// would silence the whole page, so it is refused.
	function matchKnown(doc, found, known) {
		const page = [doc.documentElement, doc.body, doc.querySelector("main")].filter(Boolean);
		return known.filter((entry) => {
			let whole;
			try {
				whole = page.some((el) => el.matches(entry.selector));
			} catch {
				throw new Error(`known entry has an invalid selector: ${entry.selector}`);
			}
			if (whole) throw new Error(`known entry selector covers the whole page: ${entry.selector}; name the component instead`);
			let hits = 0;
			for (const v of found) {
				if (v.contract !== entry.contract) continue;
				let inside;
				try {
					inside = v.el.closest(entry.selector) !== null;
				} catch {
					throw new Error(`known entry has an invalid selector: ${entry.selector}`);
				}
				if (inside) {
					v.known = true;
					hits += 1;
				}
			}
			return hits === 0;
		});
	}

	function outline(doc, violations) {
		if (!doc.getElementById("layout-audit-outline")) {
			const style = doc.createElement("style");
			style.id = "layout-audit-outline";
			style.textContent = "[data-layout-violation] { outline: 3px solid #e5484d !important; outline-offset: 2px !important; }";
			doc.head.append(style);
		}
		for (const v of violations) v.el.setAttribute("data-layout-violation", v.contract);
	}

	globalThis.auditLayout = (doc = document, { known = [], mark = false } = {}) => {
		const found = [];
		const keys = new Set();
		const add = (contract, el, detail) => {
			const selector = selectorOf(el);
			const key = `${contract} ${selector} ${detail}`;
			if (keys.has(key)) return;
			keys.add(key);
			found.push({ contract, selector, message: `${contract}: ${detail}`, el, known: false });
		};

		let primitives = 0;
		const floorChecked = new Set();
		for (const container of doc.querySelectorAll(GROUPS)) {
			if (!container.checkVisibility(VISIBLE)) continue;
			const contracts = contractsOf(container, add);
			if (contracts.size === 0) continue;
			const box = container.getBoundingClientRect();
			const items = [...container.children].filter((c) => c.checkVisibility(VISIBLE));
			// A query container sized from its content collapses to its own gaps, not
			// to zero (a row-list as a flex item is 16 px wide), so its rows spill out.
			const contained = getComputedStyle(container).containerType !== "normal";
			const squeezed = contained && container.scrollWidth > container.clientWidth + TOLERANCE;
			if (box.width <= TOLERANCE || box.height <= TOLERANCE || squeezed) {
				// An empty primitive is fine; one that holds items in a zero box is a bug.
				for (const contract of contracts) {
					if (items.length > 0) add(contract, container, `${items.length} items in a collapsed ${px(box.width)} x ${px(box.height)} box`);
				}
				if (items.length > 0) primitives += contracts.size;
				continue;
			}
			primitives += contracts.size;
			for (const contract of contracts) CHECKS[contract](container, add);
			checkFloor(container, add, floorChecked);
			checkClipped(container, add);
		}

		for (const label of doc.querySelectorAll("dt, [data-align='label']")) {
			if (!shown(label)) continue;
			const next = label.nextElementSibling;
			if (label.localName === "dt" && next?.localName === "dt") continue;
			primitives += 1;
			const value = label.localName === "dt" ? (next?.localName === "dd" ? next : null) : next;
			checkLabel(label, value, add);
		}

		checkPage(doc, add);
		const stale = matchKnown(doc, found, known);
		if (mark) outline(doc, found.filter((v) => !v.known));
		return {
			primitives,
			violations: found.map((v) => ({ contract: v.contract, selector: v.selector, message: v.message, known: v.known })),
			stale,
		};
	};
})();
