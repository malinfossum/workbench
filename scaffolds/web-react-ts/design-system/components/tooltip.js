/*
 * Tooltip dismissal for [data-tips] containers (components/tooltip.css).
 * Showing is CSS alone (:hover and :focus-visible). This script adds the way
 * out: Escape sets data-tips="hidden" on every container, which hides its tips
 * until the pointer enters or focus lands on a .tip-host inside it again
 * (WCAG 1.4.13, dismissible).
 *
 * One set of delegated listeners on document, like picker.js, so a page that
 * re-renders its footer needs no rewiring. Escape also closes an open picker
 * (picker.js); hiding tips while a picker closes is harmless, so the two
 * scripts do not coordinate and this one never stops the event.
 */
(function () {
	var root = document.documentElement;
	if (root.dataset.tipsWired === "true") return;
	root.dataset.tipsWired = "true";

	function hideAll() {
		document.querySelectorAll("[data-tips]").forEach(function (container) {
			container.dataset.tips = "hidden";
		});
	}

	// Entering a host from outside it (or focus landing on it) reveals its
	// container. relatedTarget is where the pointer came from: a move within the
	// host, icon to padding, is not an entry.
	function reveal(event) {
		var target = event.target;
		var host = target && target.closest ? target.closest(".tip-host") : null;
		if (!host) return;
		if (event.relatedTarget && host.contains(event.relatedTarget)) return;
		var container = host.closest("[data-tips]");
		if (container && container.dataset.tips === "hidden") container.dataset.tips = "";
	}

	document.addEventListener("keydown", function (event) {
		if (event.key === "Escape") hideAll();
	});
	// mouseover bubbles (mouseenter does not), so one listener covers every host.
	document.addEventListener("mouseover", reveal);
	document.addEventListener("focusin", reveal);
})();
