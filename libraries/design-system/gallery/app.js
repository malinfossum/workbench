// A module (the rest of the gallery is classic scripts sharing globals) so it can
// import the icon set. Module scripts run after the classic ones, so every global
// this file reads already exists — and every panel renders after this line, so
// sections.js can call `icon()` as a global.
import { ICON_NAMES, icon } from "../components/icons.js";
import * as preferences from "../theme/preferences.js";

window.icon = icon;
window.ICON_NAMES = ICON_NAMES;
window.preferences = preferences;

// The gallery follows the same theme model as a consumer: the head snippet set
// the first paint, this keeps following the OS and other tabs while no key is stored.
preferences.initTheme();

const galleryModel = createGalleryModel(GALLERY_SECTIONS);
const galleryView = createGalleryView(document);
createGalleryController(galleryModel, galleryView);

// Reusable tabs behavior: click a [role="tab"] to select it and show its panel.
document.addEventListener("click", (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (!tab) return;
  const list = tab.closest('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = [...list.parentElement.querySelectorAll('[role="tabpanel"]')];
  tabs.forEach((t, i) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    if (panels[i]) panels[i].hidden = !selected;
  });
});

// Demo nav-links: clicking moves the active state (a real app would navigate).
document.addEventListener("click", (e) => {
  const link = e.target.closest(".nav-link");
  if (!link) return;
  e.preventDefault();
  const list = link.closest(".nav-list");
  if (!list) return;
  list.querySelectorAll(".nav-link").forEach((l) => l.removeAttribute("aria-current"));
  link.setAttribute("aria-current", "page");
});

// File-picker demo: the native filename text goes with the hidden control, so the
// chosen name is echoed into the help element named by data-file-echo.
document.addEventListener("change", (e) => {
  const input = e.target.closest("input[type='file'][data-file-echo]");
  if (!input) return;
  const help = document.getElementById(input.dataset.fileEcho);
  if (!help) return;
  const names = [...input.files].map((f) => f.name).join(", ");
  help.textContent = names ? `Chosen: ${names}` : "No file chosen.";
});

// Pickers demo: the header is re-rendered whole when a preference changes, and
// focus lands on the trigger of the picker that was used (its new name is the
// audible result of the press). Language and currency live in PICKER_DEMO;
// theme rows carry data-theme-set and theme-toggle.js, registered earlier,
// has already applied the choice when this handler runs.
function renderPickers(focusPicker) {
  const header = document.getElementById("picker-header");
  if (!header) return;
  header.innerHTML = renderPickerHeader();
  if (focusPicker) header.querySelector(`[data-picker="${focusPicker}"] summary`)?.focus();
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) return renderPickers();
  const row = e.target.closest("#picker-header .picker-row");
  if (!row) return;
  if (row.dataset.action === "set-lang") PICKER_DEMO.lang = row.dataset.lang;
  else if (row.dataset.action === "set-currency") PICKER_DEMO.currency = row.dataset.currency;
  else if (!("themeSet" in row.dataset)) return;
  renderPickers(row.closest("[data-picker]").dataset.picker);
});
// The OS or another tab changed the theme: the sun/moon trigger follows.
preferences.watchSystemTheme(() => renderPickers());
preferences.watchStorage(() => renderPickers());
