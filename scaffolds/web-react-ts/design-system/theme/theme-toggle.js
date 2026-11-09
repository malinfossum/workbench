/*
 * Theme control: click handler plus the listeners that keep System live and
 * the pressed state marked. The initial theme is set by the inline <head>
 * snippet to avoid a flash (theme/theme-init-snippet.html).
 *
 * Markup: any element with data-theme-set="light" | "dark" | "system".
 * "system" removes the stored key and applies prefers-color-scheme; while no
 * key is stored the page keeps following the OS, and a change in another tab
 * is applied here too.
 *
 * Pressed state (v3, DS 3.11.0): a button[data-theme-set] that ships with an
 * aria-pressed attribute gets "true" when it is the current choice (System
 * when no key is stored) and "false" otherwise: on load, after every click and
 * on the storage and prefers-color-scheme events. Opt-in by the attribute: a
 * control without aria-pressed in its markup is never touched, which keeps the
 * 3.8.0 picker rows (aria-current) out. A view that renders such a button after
 * load sets aria-pressed itself from the stored preference
 * (theme/preferences.js readPreference); this script takes over from the next
 * event.
 *
 * Status line (v3): after every click on a button[data-theme-set][aria-pressed],
 * the pressed one included, every [data-theme-status] element gets the
 * group's name and the button's name ("Theme: Dark"), read from the closest
 * [role="group"]'s aria-label and the button's .sr-only text (else its
 * aria-label, else its text). Whichever part is missing is left out, never an
 * empty side of the colon. No strings live here, so it works in any language.
 * The element is cleared first and written on the next frame, so a repeated
 * line is announced and not swallowed as "no change": every press needs an
 * audible result. Put the live region in the page's first HTML, outside anything
 * a view re-renders, or a screen reader may miss the first change. One live
 * region per page; a second element with the attribute and no role is a visible
 * echo (the gallery shows one).
 *
 * This is a classic script (loaded via <script src>), so it cannot import
 * theme/preferences.js; the few lines of read, write and resolve logic are
 * repeated here on purpose and must stay in step with that module. stored()
 * does not remove an invalid key because the head snippet and preferences.js do.
 *
 * [data-theme-toggle] (cycle light and dark) is kept for consumers that have
 * not migrated. Deprecated since 3.8.0, removed in DS 4.0.0; logs nothing.
 */
(function () {
	var root = document.documentElement;
	if (root.dataset.themeWired === "true") return;
	root.dataset.themeWired = "true";

	var THEMES = ["light", "dark"];
	var LIGHT_QUERY = "(prefers-color-scheme: light)";
	var PRESSABLE = "button[data-theme-set][aria-pressed]";

	function systemTheme() {
		return typeof matchMedia === "function" && matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
	}
	function stored() {
		try {
			var value = localStorage.getItem("theme");
			return THEMES.indexOf(value) === -1 ? null : value;
		} catch (e) {
			return null;
		}
	}
	// When storage refuses the write, the choice lives here for the session so
	// the pill and the page agree.
	var fallback = null;
	function write(value) {
		try {
			if (value) localStorage.setItem("theme", value);
			else localStorage.removeItem("theme");
			fallback = null;
			return true;
		} catch (e) {
			fallback = value || null;
			return false;
		}
	}
	function apply(value) {
		document.documentElement.dataset.theme = value || systemTheme();
	}

	// Every opt-in button reflects the stored key; no key is System.
	function mark() {
		var current = stored() || fallback || "system";
		document.querySelectorAll(PRESSABLE).forEach(function (button) {
			var value = button.dataset.themeSet === "" ? "system" : button.dataset.themeSet;
			button.setAttribute("aria-pressed", String(value === current));
		});
	}

	function nameOf(button) {
		var hidden = button.querySelector(".sr-only");
		var text = hidden ? hidden.textContent : button.getAttribute("aria-label") || button.textContent;
		return (text || "").replace(/\s+/g, " ").trim();
	}
	function frame(fn) {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
		else setTimeout(fn, 0);
	}
	function announce(button) {
		var targets = document.querySelectorAll("[data-theme-status]");
		if (targets.length === 0) return;
		var group = button.closest('[role="group"]');
		var groupName = group ? (group.getAttribute("aria-label") || "").trim() : "";
		var name = nameOf(button);
		var line = groupName && name ? groupName + ": " + name : groupName || name;
		targets.forEach(function (status) {
			status.textContent = "";
		});
		frame(function () {
			targets.forEach(function (status) {
				status.textContent = line;
			});
		});
	}

	document.addEventListener("click", function (event) {
		var set = event.target.closest("[data-theme-set]");
		if (set) {
			var next = set.dataset.themeSet;
			if (next === "system" || next === "") {
				write(null);
				apply(null);
			} else if (THEMES.indexOf(next) !== -1) {
				write(next);
				apply(next);
			} else {
				return;
			}
			mark();
			if (set.matches(PRESSABLE)) announce(set);
			return;
		}

		// Deprecated path: [data-theme-toggle] cycles light and dark.
		var toggle = event.target.closest("[data-theme-toggle]");
		if (!toggle) return;
		var flipped = document.documentElement.dataset.theme === "light" ? "dark" : "light";
		write(flipped);
		apply(flipped);
		mark();
	});

	// Follow the OS while no key is stored.
	if (typeof matchMedia === "function") {
		var query = matchMedia(LIGHT_QUERY);
		if (typeof query.addEventListener === "function") {
			query.addEventListener("change", function () {
				if ((stored() || fallback) === null) apply(null);
				mark();
			});
		}
	}

	// Another tab changed or cleared the key (a null key is a storage.clear()).
	// Nothing was pressed here, so the status line stays as it is.
	addEventListener("storage", function (event) {
		if (event.key !== "theme" && event.key !== null) return;
		apply(stored());
		mark();
	});

	// On load, and again when the parser finishes: a script in <head> runs
	// before its buttons exist, so it waits for them too. mark() is idempotent.
	mark();
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mark);
})();
