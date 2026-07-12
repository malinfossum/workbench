# Storyboard — design spec (Spec B)

- **Date:** 2026-07-12
- **Home:** `libraries/storyboard/` (reserved by the workbench restructure spec, §13)
- **Depends on:** workbench v2.1.0 layout, design-system (rendered classes; internals untouched)
- **Blocks:** nothing

> **Revision note (2026-07-12):** stress-tested (four lenses) the same day; 8 findings
> folded in — untrusted-hash rule + engine-chrome escape discipline (§7), `node:vm` test
> mechanism (§10), kebab-case id validation (§6), empty-registry card (§7), unknown-hash
> fallback unified across load/hashchange (§7), no focus-steal on first render (§7),
> ≥24px chrome targets (§7), public-mock-data warning (§9).

## 1. Overview

A **storyboard** is a clickable, no-build mock of an app: its screens rendered with
design-system classes and mock data, wired together with hotspots so you can drive the
future app before any of it exists.

**Purpose (locked): a design-first planning tool.** Per project, before coding: sketch every
screen, click the flows, validate the design — then write the implementation plan. Once the
real app is built, the storyboard is frozen reference material. It is explicitly **not a
living spec**: no commitment to keep it in sync with the built app. Communication value
(showing Henry, portfolio links, deep-linked screens) falls out for free because the
storyboard dogfoods the design system and is hosted via the workbench dashboard on Pages.

The engine generalises the design-system `gallery/` registry-swap MVC from component
specimens to full screens. Same idioms: plain scripts, no modules, no build step, works from
`file://` or any static server, `{ id, label, render() }` registrations, subscribe/notify
model, `data-action`-style delegation.

## 2. Goals

- Author a new screen in one small file; see it immediately (no build, no server required).
- Click through flows via hotspots inside the screens — it feels like using the future app.
- Named states per screen (default / empty / error / …) so the forgettable states get designed.
- Deep-linkable: any screen+state addressable as a URL hash.
- Extractable into any consumer (web project or C# `wwwroot`) via the existing copy model.
- V1 ships with a demo storyboard that doubles as the reference example and the starter.

## 3. Non-goals (v1)

- **Guided step-sequences / walkthrough mode** — flows are hotspot-driven; a flow entry is
  just a named starting point.
- **Annotations or comments layer.**
- **Image/PDF export.**
- **Hosting story beyond GitHub Pages** (which the dashboard already provides).
- **C# consumer documentation** — the copy model already reaches `wwwroot`; documenting and
  proving that path is deferred until a C# project wants a storyboard.
- **Any change to design-system internals** (read-only rule stands; the storyboard only
  *renders* DS classes).

## 4. Decisions (locked during brainstorm, 2026-07-12)

| Question | Decision | Why |
|---|---|---|
| Purpose | Design-first planning tool; frozen after build | A living spec would rot (parallel maintenance drifts); design-first slots into the existing brainstorm→spec→plan→build pipeline |
| Flows | Hotspots inside screens (`data-goto`) | Strongest design validation — you drive the mock, not watch it |
| States | Named states per screen, `render(state)`, chrome switcher | Forces empty/error states to get designed; hotspots can target `screen@state` |
| Engine | Plain-script registry, gallery-style | No build, `file://`-safe, consistent with the existing engine, copy-extractable everywhere |
| V1 finish line | Engine + demo storyboard in `libraries/storyboard/`, live dashboard card | Shippable without coupling to any project decision |
| Navigation | URL hash is the single source of truth | Browser back/forward and deep links for free; no custom history stack |

## 5. Layout & consumption

```
libraries/storyboard/
├── README.md         — concept, authoring guide, consumption steps
├── VERSION           — 1.0.0
├── extract.json      — { "include": ["engine"] }
├── index.html        — demo storyboard entry (dashboard links here)
├── screens/          — demo screens, one plain-script file per screen
├── data.js           — demo mock data
├── flows.js          — demo flow entry points
└── engine/
    ├── index.css     — chrome styles only (screen content styles come from the DS)
    ├── registry.js   — screen/flow registration API + escapeHtml (loads first)
    ├── model.js
    ├── view.js
    ├── controller.js
    └── app.js        — boot
```

- **Only `engine/` is extracted.** `extract.mjs` drift-checks every file in `include`;
  consumer-authored files (screens, data, flows, index.html) must stay out of the manifest or
  every consumer edit would trip `halted-modified`. Consumers re-extract the engine and own
  the rest. The version-header anchor is `engine/index.css` (`include[0]/index.css` — the
  tool's existing convention; no tool changes).
- **The demo doubles as the starter.** A new consumer copies `index.html`, `screens/`,
  `data.js`, `flows.js` once (documented in README; `project-init` integration possible
  later), then guts them. No separate `starter/` folder to keep in sync.
- **Sibling design-system convention.** The storyboard's `index.html` links the sibling
  `design-system/`'s stylesheets exactly as the gallery does (`../design-system/…`). This
  works identically in the workbench (`libraries/`) and in consumers, where `storyboard/`
  sits next to the project's extracted `design-system/`. Sibling placement is the documented
  requirement.

## 6. Authoring format

One plain-script file per screen, registering itself:

```js
// screens/board.js
Storyboard.addScreen({
  id: "board",
  label: "Board",
  states: ["default", "empty"],   // first entry = initial state
  note: "Main working view. Empty state shows the onboarding hint.",
  render(state) {
    if (state === "empty") return `<section class="stack">…</section>`;
    const cards = DEMO_DATA.cards.map((c) => `
      <button class="card" data-goto="card-detail" type="button">${escapeHtml(c.title)}</button>`).join("");
    return `<div class="board-grid">${cards}</div>`;
  },
});
```

- **Screen:** `{ id, label, states, note?, render(state) }`. `states` optional — omitted
  means `["default"]`. `render` returns an HTML string built from design-system classes.
- **Hotspots:** `data-goto="screen-id"` or `data-goto="screen-id@state"` on real interactive
  elements (**buttons or links only** — the authoring rule that keeps keyboard access free).
  The engine navigates by click delegation.
- **Mock data:** plain objects in `data.js`. All user-ish content is interpolated through the
  engine-shipped `escapeHtml` helper (same XSS discipline as Wend, applied even to mock data
  so the habit transfers).
- **Flows:** `flows.js` registers `{ id, label, start: "screen@state", note? }`. The chrome
  lists flows; clicking one jumps to its start; the journey itself is hotspot-driven.
- **Script order** (listed explicitly in `index.html`): `engine/registry.js` → `data.js` →
  `screens/*.js` → `flows.js` → `engine/model.js` → `engine/view.js` →
  `engine/controller.js` → `engine/app.js`. Adding a screen = one file + one script tag.
- **Fail loud at load:** registering a duplicate screen id, a flow whose `start` doesn't
  resolve, or a screen with an empty `states` array throws immediately.
- **Id charset:** screen ids and state names must match `[a-z0-9-]+` (kebab-case).
  They travel in the URL hash and `@` is the target separator, so anything else breaks
  routing. Validated at registration; violations throw.

## 7. Engine

MVC trio, gallery-style:

- **Model** — current `{ screenId, stateId }`, registry access, subscribe/notify. Pure: no
  DOM, no `location` — testable in Node. Owns navigation resolution: unknown screen → first
  registered screen; unknown/omitted state → that screen's first state.
- **View** — renders chrome + viewport, no logic. Chrome: sidebar (screens list, flows
  list), top bar (current screen label + note + state-switcher pills), viewport where
  `render(state)` output lands. Exposes bind hooks for the controller.
- **Controller** — wiring plus the two DOM-flavored concerns:
  - **`data-goto` delegation** on the viewport (click → parse target → `model.setActive`).
  - **Hash routing:** the URL hash (`#board@empty`) is the single navigation source of
    truth. Navigation writes the hash; `hashchange` drives the model (guarded against
    echo loops by comparing before setting). Browser back/forward and deep links come free.
    A missing or unresolvable hash at load falls back to the first registered screen; on a
    later `hashchange` (hand-edited URLs) the storyboard **stays on the current screen** and
    restores its hash. Both paths **replace** the bad hash, so the Back button never traps
    the user on a broken entry. *(Amended 2026-07-13 at final review: mid-session fallback
    targets the current screen, not the first — better UX, same guarantees.)*

### Untrusted input & chrome escaping

- **The URL hash is untrusted input** — deep links are shareable by design. Hash values are
  parsed and matched against the registry only; they are **never interpolated into HTML**,
  not even in error output.
- The engine chrome escapes everything it interpolates (labels, notes, state names, error
  messages) through the same `escapeHtml` it ships to authors. The `#status` region is
  written via `textContent`, never `innerHTML`.

### Accessibility (chrome requirements)

- `aria-current` on the active screen nav item and active state pill.
- After every viewport swap, focus moves to the viewport container (`tabindex="-1"`) —
  **except the initial render**: page load never steals focus; focus management starts with
  the first user-initiated navigation.
- All chrome interactive targets (nav items, state pills) ≥ 24×24 px (the Wend Plan-8
  standard).
- A `#status` aria-live region **outside the viewport** announces
  "Showing {label}, {state} state" via `setTimeout` (not rAF — rAF drops in hidden tabs).
- Chrome fully keyboard-navigable; hotspot rule (buttons/links only) keeps screens navigable.
- Dark-mode-first via DS tokens; chrome uses DS classes wherever they exist.

### Error handling

- Unknown `data-goto` target at click time → stay on the current screen, announce
  "Unknown screen: {id}" in the status region, `console.warn`.
- A screen's `render()` throwing → viewport shows a DS error card naming the screen and the
  error message; the rest of the storyboard keeps working.
- Registration errors (duplicate id, bad flow start, empty states, bad id charset) → throw
  at load (see §6).
- **Empty registry** (a consumer copied the starter and gutted it before authoring) → the
  viewport shows a DS "no screens registered yet — add a file to `screens/`" card instead
  of crashing. This is the first thing every new consumer would otherwise hit.

## 8. Demo storyboard

A small fictional app (theme chosen at planning time). Coverage requirements — the demo is
also the reference documentation, so it must exercise every engine feature:

- 4 screens; at least 2 screens with 2+ states (one of them an error or empty state).
- Every screen reachable via hotspots; at least one hotspot targets `screen@state`.
- At least one flow entry in `flows.js`.
- Mock data interpolated from `data.js` through `escapeHtml`.

## 9. Dashboard & docs integration

- The dashboard's non-interactive "coming soon" Storyboard card becomes a real link to
  `libraries/storyboard/` (the demo).
- `tools/dashboard.test.mjs` updated: the test "disabled storyboard card is aria-disabled
  and has no href" is replaced by an assertion that the card links to
  `libraries/storyboard/`.
- Root `README.md` and `libraries/storyboard/README.md` updated: what a storyboard is,
  authoring guide, consumption steps (extract engine + copy starter files + sibling DS).
- The authoring guide warns: **the workbench is public** (repo + GitHub Pages), and
  per-project storyboards may be too — mock data must be fictional. Never real names,
  emails, or content lifted from real users.

## 10. Testing

`node:test`, matching the workbench's existing style (`tools/*.test.mjs`):

- **Loading mechanism:** engine and demo files are plain scripts, not modules — `import`
  can't reach them. Tests load them with `node:vm` (`vm.runInNewContext` with a shared
  context object standing in for the globals), then assert on the resulting registry and
  model. Shipped files stay clean: no CommonJS export footers.
- **Unit (pure):** registry validation (duplicate ids / bad flow start / empty states /
  bad id charset throw; states default to `["default"]`), hash parse/format round-trip
  (`"board@empty"` ↔ `{ screenId, stateId }`), navigation resolution fallbacks,
  model subscribe/notify.
- **Structural (demo integrity):** `index.html` references every file in `screens/` in the
  documented order; then the test executes `registry.js` + `data.js` + `screens/*.js` +
  `flows.js` in a vm context, calls every screen's `render()` for each declared state, and
  asserts that every `data-goto` target in the output and every flow `start` resolves to a
  registered screen and state (catches broken hotspots without a browser).
- **Manual acceptance checklist:** keyboard end-to-end (nav, state pills, hotspots, focus
  landing in the viewport), announce behavior, back/forward + deep-link entry, `file://`
  open, error card on a deliberately broken screen.

## 11. Versioning & release

- Storyboard `VERSION` starts at **1.0.0** (complete for its scope).
- Workbench releases **v2.2.0** — minor: new library, no paths move, nothing breaks.

## 12. Follow-on (explicitly out of scope, noted for later)

- First real consumer (Ignite v2 is the natural candidate) — proves the extract + starter
  path end to end.
- `project-init` skill learns to offer a storyboard (touches `.claude/` — gated, needs
  explicit go-ahead).
- C# `wwwroot` consumption walkthrough when a C# project wants one.
