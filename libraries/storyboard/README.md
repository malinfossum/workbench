# Storyboard

Clickable, no-build app mocks: screens rendered with design-system classes and mock
data, wired together with hotspots. A design-first planning tool — storyboard the app,
click the flows, then build; once the real app exists, the storyboard is frozen
reference, not a maintained spec.

The library's own storyboard (Frond, a fictional plant-care app) is the demo **and**
the starter. Open `index.html` — from disk or any static server.

## Authoring

One file per screen in `screens/`, registered on the `Storyboard` global:

- `Storyboard.addScreen({ id, label, states?, note?, render(state) })` — `render`
  returns an HTML string built from design-system classes. `states` defaults to
  `["default"]`. Ids and states are kebab-case (`[a-z0-9-]+`) — they travel in the
  URL hash.
- Hotspots: `data-goto="screen-id"` or `data-goto="screen-id@state"` on a `<button>`
  or `<a>` only.
- Flows: `Storyboard.addFlow({ id, label, start: "screen@state", note? })` — a named
  entry point listed in the sidebar.
- Interpolate ALL data through `escapeHtml(...)` (shipped by the engine).
- Every screen+state is deep-linkable: `index.html#plant-detail@error`.
- New screen = new file in `screens/` + one `<script>` tag in `index.html`
  (order: registry → data → screens → flows → engine → app).

Mock data must be **fictional**. The workbench repo and its Pages site are public —
and per-project storyboards may be too. Never real names, emails, or user content.

## Using it in a project

1. Extract the engine (re-run to pick up engine updates):
   `node tools/extract.mjs storyboard <target-dir>`
2. Copy `index.html`, `screens/`, `data.js`, `flows.js` from this folder once, then
   gut and make them yours. You own these files; only `engine/` re-syncs.
3. Keep `storyboard/` next to your project's extracted `design-system/` — the
   stylesheet links assume siblings.
4. Exclude `storyboard/engine/` from your formatter (like `design-system/`) —
   a reformatted engine file trips extract's drift detection on re-sync.
