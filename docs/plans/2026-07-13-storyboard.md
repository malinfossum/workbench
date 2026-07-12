# Storyboard (Spec B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Storyboard library — a no-build, clickable app-mock engine plus a demo storyboard — in `libraries/storyboard/`, per `docs/specs/2026-07-12-storyboard-design.md`.

**Architecture:** Plain-script MVC (gallery-style: no modules, no build, `file://`-safe). A registry global (`Storyboard`) collects screen/flow definitions from one-file-per-screen scripts; a pure model owns `{screenId, stateId}` + navigation resolution; the view renders chrome + viewport; the controller wires `data-goto` delegation and hash routing. Only `engine/` is extracted to consumers; the demo doubles as the starter.

**Tech Stack:** Vanilla JS (plain scripts), design-system CSS classes, `node:test` + `node:vm` for tests. No dependencies, no package.json.

## Global Constraints

- Working branch: `storyboard-spec` (already exists, holds the spec commit).
- **No AI attribution in commits** — no `Co-Authored-By`, no "Generated with Claude Code".
- Screen ids and state names must match `[a-z0-9-]+`; violations throw at registration.
- The URL hash is untrusted: parsed and matched against the registry only, **never interpolated into HTML**. `#status` written via `textContent` only.
- Engine chrome escapes everything it interpolates (labels, notes, state names, error messages) via `escapeHtml`.
- Hotspots (`data-goto`) go on `<button>` or `<a>` only.
- CSS is **mobile-first**: baseline = smallest screen, layer up with `@media (min-width: 768px)` / `(min-width: 1024px)`. No `max-width` queries.
- All chrome interactive targets ≥ 24×24 px.
- Initial render never steals focus; every later viewport swap focuses the viewport container.
- Design-system internals are read-only — the storyboard links `../design-system/…` stylesheets, never edits them.
- Shipped engine/demo files are plain scripts: no `import`/`export`, no CommonJS footers. Tests load them via `node:vm`.
- Tests run with: `node --test "tools/*.test.mjs"` (same command CI uses). There is no npm.
- Do NOT push. Merging/pushing is Malin's call.

## File Structure

```
libraries/storyboard/
├── README.md               (Task 7 — concept, authoring guide, consumption, public-data warning)
├── VERSION                 (Task 1 — "1.0.0")
├── extract.json            (Task 1 — {"versionFile":"VERSION","include":["engine"]})
├── index.html              (Task 5 — demo entry; documented script order)
├── data.js                 (Task 5 — DEMO_DATA mock objects, fictional only)
├── flows.js                (Task 5 — flow entry points)
├── screens/                (Task 5 — one plain-script file per demo screen)
│   ├── plants.js  ├── plant-detail.js  ├── add-plant.js  └── settings.js
└── engine/
    ├── index.css           (Task 3 — chrome styles only; version-header anchor for extract)
    ├── registry.js         (Task 1 — Storyboard global, escapeHtml, parseTarget/formatTarget)
    ├── model.js            (Task 2 — pure state + resolution, no DOM/location)
    ├── view.js             (Task 3 — chrome + viewport rendering, bind hooks, no logic)
    ├── controller.js       (Task 4 — data-goto delegation + hash routing)
    └── app.js              (Task 4 — boot)
tools/
├── storyboard-harness.mjs  (Task 1 — vm loader shared by storyboard tests)
├── storyboard.test.mjs     (Tasks 1/2/4 — engine unit tests)
├── storyboard.demo.test.mjs(Task 5 — demo structural integrity)
├── dashboard.test.mjs      (Task 6 — modify: storyboard card test)
└── extract.integration.test.mjs (Task 7 — modify: add storyboard extract test)
index.html                  (Task 6 — modify: coming-soon card → live link)
README.md                   (Task 7 — modify: storyboard section)
```

---

### Task 1: Skeleton, registry, vm test harness

**Files:**
- Create: `libraries/storyboard/VERSION`, `libraries/storyboard/extract.json`, `libraries/storyboard/engine/registry.js`
- Create: `tools/storyboard-harness.mjs`
- Test: `tools/storyboard.test.mjs`
- Delete: `libraries/storyboard/README.md` is NOT deleted — leave the stub; Task 7 rewrites it.

**Interfaces:**
- Consumes: nothing.
- Produces (globals defined by `engine/registry.js`, used by every later task):
  - `Storyboard` — `{ screens: [], flows: [], addScreen(def), addFlow(def) }`. Screen def: `{ id, label, states?, note?, render(state) }`; stored def always has non-empty `states` (defaults to `["default"]`). Flow def: `{ id, label, start, note? }`.
  - `escapeHtml(value) → string`
  - `parseTarget(raw) → { screenId, stateId|null } | null` (null for empty/malformed)
  - `formatTarget({ screenId, stateId }) → "screen@state"`
  - Harness: `loadScripts(relPaths: string[]) → { ctx, evalIn(expr) }` from `tools/storyboard-harness.mjs`; `evalIn("Storyboard")` returns the live in-context object.

- [ ] **Step 1: Create the skeleton files**

`libraries/storyboard/VERSION`:
```
1.0.0
```

`libraries/storyboard/extract.json`:
```json
{
  "versionFile": "VERSION",
  "include": ["engine"]
}
```

- [ ] **Step 2: Write the vm harness**

`tools/storyboard-harness.mjs`:
```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const LIB = resolve(import.meta.dirname, "..", "libraries", "storyboard");

// Engine/demo files are plain scripts (no modules) — run them in one shared
// vm context, in order, exactly like <script> tags. Top-level const/function
// bindings persist across runs in the same context; the host reads them by
// evaluating an expression in-context (evalIn returns live references).
export function loadScripts(relPaths) {
  const ctx = vm.createContext({ console });
  for (const rel of relPaths) {
    vm.runInContext(readFileSync(resolve(LIB, rel), "utf8"), ctx, { filename: rel });
  }
  return { ctx, evalIn: (expr) => vm.runInContext(expr, ctx) };
}

// vm objects live in a different realm — their prototypes differ from the
// host's, so strict deepEqual fails on structurally-equal values. Normalize
// vm-derived structures through JSON before deep comparison.
export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
```

- [ ] **Step 3: Write the failing registry tests**

`tools/storyboard.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScripts, plain } from "./storyboard-harness.mjs";

function freshRegistry() {
  const { evalIn } = loadScripts(["engine/registry.js"]);
  return {
    Storyboard: evalIn("Storyboard"),
    escapeHtml: evalIn("escapeHtml"),
    parseTarget: evalIn("parseTarget"),
    formatTarget: evalIn("formatTarget"),
  };
}

const SCREEN = (over = {}) => ({ id: "plants", label: "Plants", render: () => "<p>hi</p>", ...over });

test("addScreen registers and defaults states to ['default']", () => {
  const { Storyboard } = freshRegistry();
  Storyboard.addScreen(SCREEN());
  assert.equal(Storyboard.screens.length, 1);
  assert.deepEqual(plain(Storyboard.screens[0].states), ["default"]);
});

test("addScreen throws on duplicate id, bad id charset, empty states, missing render", () => {
  const { Storyboard } = freshRegistry();
  Storyboard.addScreen(SCREEN());
  assert.throws(() => Storyboard.addScreen(SCREEN()), /duplicate/);
  assert.throws(() => Storyboard.addScreen(SCREEN({ id: "Has Spaces" })), /\[a-z0-9-\]/);
  assert.throws(() => Storyboard.addScreen(SCREEN({ id: "a@b" })), /\[a-z0-9-\]/);
  assert.throws(() => Storyboard.addScreen(SCREEN({ id: "ok", states: [] })), /states/);
  assert.throws(() => Storyboard.addScreen(SCREEN({ id: "ok2", states: ["Bad State"] })), /\[a-z0-9-\]/);
  assert.throws(() => Storyboard.addScreen({ id: "ok3", label: "x" }), /render/);
});

test("addFlow validates start resolves against registered screens", () => {
  const { Storyboard } = freshRegistry();
  Storyboard.addScreen(SCREEN({ states: ["default", "empty"] }));
  Storyboard.addFlow({ id: "add-a-plant", label: "Add a plant", start: "plants@empty" });
  assert.equal(Storyboard.flows.length, 1);
  assert.throws(() => Storyboard.addFlow({ id: "bad", label: "x", start: "nope@default" }), /start/);
  assert.throws(() => Storyboard.addFlow({ id: "bad2", label: "x", start: "plants@nope" }), /start/);
  assert.throws(() => Storyboard.addFlow({ id: "add-a-plant", label: "dup", start: "plants" }), /duplicate/);
});

test("escapeHtml escapes the five specials", () => {
  const { escapeHtml } = freshRegistry();
  assert.equal(escapeHtml(`<img src="x" onerror='y'>&`), "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;");
});

test("parseTarget / formatTarget round-trip", () => {
  const { parseTarget, formatTarget } = freshRegistry();
  assert.deepEqual(plain(parseTarget("plants@empty")), { screenId: "plants", stateId: "empty" });
  assert.deepEqual(plain(parseTarget("plants")), { screenId: "plants", stateId: null });
  assert.equal(parseTarget(""), null);
  assert.equal(parseTarget("a@b@c"), null);
  assert.equal(formatTarget({ screenId: "plants", stateId: "empty" }), "plants@empty");
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `node --test tools/storyboard.test.mjs`
Expected: FAIL — `ENOENT … engine/registry.js` (file doesn't exist yet).

- [ ] **Step 5: Write `libraries/storyboard/engine/registry.js`**

```js
// Storyboard registry — loads FIRST. Screens/flows register here; the engine
// boots from it. Plain script by design: no modules, works from file://.

const STORYBOARD_ID_RE = /^[a-z0-9-]+$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// "plants@empty" → { screenId, stateId }; "plants" → { screenId, stateId: null }.
// Lenient parse (null on malformed) — strict matching happens against the registry.
function parseTarget(raw) {
  if (typeof raw !== "string" || raw === "") return null;
  const parts = raw.split("@");
  if (parts.length > 2 || parts[0] === "") return null;
  return { screenId: parts[0], stateId: parts.length === 2 && parts[1] !== "" ? parts[1] : null };
}

function formatTarget(target) {
  return `${target.screenId}@${target.stateId}`;
}

const Storyboard = {
  screens: [],
  flows: [],

  addScreen(def) {
    if (!def || !STORYBOARD_ID_RE.test(def.id ?? "")) {
      throw new Error(`Storyboard: screen id "${def?.id}" must match [a-z0-9-]+`);
    }
    if (this.screens.some((s) => s.id === def.id)) {
      throw new Error(`Storyboard: duplicate screen id "${def.id}"`);
    }
    const states = def.states === undefined ? ["default"] : def.states;
    if (!Array.isArray(states) || states.length === 0) {
      throw new Error(`Storyboard: screen "${def.id}" needs a non-empty states array`);
    }
    for (const state of states) {
      if (!STORYBOARD_ID_RE.test(state)) {
        throw new Error(`Storyboard: state "${state}" on "${def.id}" must match [a-z0-9-]+`);
      }
    }
    if (typeof def.render !== "function") {
      throw new Error(`Storyboard: screen "${def.id}" needs a render(state) function`);
    }
    this.screens.push({ ...def, states });
  },

  addFlow(def) {
    if (!def || !STORYBOARD_ID_RE.test(def.id ?? "")) {
      throw new Error(`Storyboard: flow id "${def?.id}" must match [a-z0-9-]+`);
    }
    if (this.flows.some((f) => f.id === def.id)) {
      throw new Error(`Storyboard: duplicate flow id "${def.id}"`);
    }
    const target = parseTarget(def.start);
    const screen = target && this.screens.find((s) => s.id === target.screenId);
    const stateOk = screen && (target.stateId === null || screen.states.includes(target.stateId));
    if (!stateOk) {
      throw new Error(`Storyboard: flow "${def.id}" start "${def.start}" does not resolve to a registered screen/state`);
    }
    this.flows.push({ ...def });
  },
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test tools/storyboard.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add libraries/storyboard/VERSION libraries/storyboard/extract.json libraries/storyboard/engine/registry.js tools/storyboard-harness.mjs tools/storyboard.test.mjs
git commit -m "Add storyboard skeleton, registry, and vm test harness"
```

---

### Task 2: Model

**Files:**
- Create: `libraries/storyboard/engine/model.js`
- Test: `tools/storyboard.test.mjs` (append)

**Interfaces:**
- Consumes: registered screen shape from Task 1 (`{ id, label, states, note?, render }`).
- Produces: global `createStoryboardModel(screens)` returning:
  - `getScreens() → screens[]`
  - `getCurrent() → { screenId, stateId } | null`
  - `getActiveScreen() → screen def`
  - `resolve({ screenId, stateId|null }) → { screenId, stateId } | null` (null = unknown screen; unknown/null state falls to the screen's first state)
  - `fallback() → { screenId, stateId }` (first screen, first state — callers guarantee non-empty registry; `app.js` gates the empty case before constructing the model)
  - `setActive(target) → boolean` (resolves internally; false = unknown screen; same-target = true, no notify)
  - `subscribe(fn)`

- [ ] **Step 1: Append the failing model tests to `tools/storyboard.test.mjs`**

```js
function freshModel() {
  const { evalIn } = loadScripts(["engine/registry.js", "engine/model.js"]);
  const Storyboard = evalIn("Storyboard");
  Storyboard.addScreen({ id: "plants", label: "Plants", states: ["default", "empty"], render: () => "" });
  Storyboard.addScreen({ id: "settings", label: "Settings", render: () => "" });
  const createStoryboardModel = evalIn("createStoryboardModel");
  return createStoryboardModel(Storyboard.screens);
}

test("model resolves unknown state to the screen's first state, unknown screen to null", () => {
  const model = freshModel();
  assert.deepEqual(plain(model.resolve({ screenId: "plants", stateId: "empty" })), { screenId: "plants", stateId: "empty" });
  assert.deepEqual(plain(model.resolve({ screenId: "plants", stateId: "nope" })), { screenId: "plants", stateId: "default" });
  assert.deepEqual(plain(model.resolve({ screenId: "plants", stateId: null })), { screenId: "plants", stateId: "default" });
  assert.equal(model.resolve({ screenId: "nope", stateId: null }), null);
  assert.deepEqual(plain(model.fallback()), { screenId: "plants", stateId: "default" });
});

test("model setActive notifies subscribers, no-ops on same target, rejects unknown", () => {
  const model = freshModel();
  let calls = 0;
  model.subscribe(() => { calls += 1; });
  assert.equal(model.setActive({ screenId: "plants", stateId: "empty" }), true);
  assert.equal(calls, 1);
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "empty" });
  assert.equal(model.setActive({ screenId: "plants", stateId: "empty" }), true);
  assert.equal(calls, 1, "same target must not notify");
  assert.equal(model.setActive({ screenId: "nope", stateId: null }), false);
  assert.equal(calls, 1);
  assert.equal(model.getActiveScreen().label, "Plants");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tools/storyboard.test.mjs`
Expected: FAIL — `createStoryboardModel is not defined`.

- [ ] **Step 3: Write `libraries/storyboard/engine/model.js`**

```js
// Pure state — no DOM, no location. The controller owns both of those.

function createStoryboardModel(screens) {
  let current = null;
  const subscribers = [];

  function resolve(target) {
    const screen = screens.find((s) => s.id === target?.screenId);
    if (!screen) return null;
    const stateId = screen.states.includes(target.stateId) ? target.stateId : screen.states[0];
    return { screenId: screen.id, stateId };
  }

  return {
    getScreens() {
      return screens;
    },
    getCurrent() {
      return current;
    },
    getActiveScreen() {
      return screens.find((s) => s.id === current.screenId);
    },
    resolve,
    fallback() {
      return { screenId: screens[0].id, stateId: screens[0].states[0] };
    },
    setActive(target) {
      const next = resolve(target);
      if (!next) return false;
      if (current && current.screenId === next.screenId && current.stateId === next.stateId) return true;
      current = next;
      subscribers.forEach((fn) => fn());
      return true;
    },
    subscribe(fn) {
      subscribers.push(fn);
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tools/storyboard.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add libraries/storyboard/engine/model.js tools/storyboard.test.mjs
git commit -m "Add storyboard model: resolution, fallback, subscribe/notify"
```

---

### Task 3: View and chrome CSS

**Files:**
- Create: `libraries/storyboard/engine/view.js`, `libraries/storyboard/engine/index.css`

No automated test in this task — the view is DOM-only (gallery precedent). It is exercised by Task 5's structural test (render output) and Task 8's acceptance checklist. Keep it logic-free: any conditional beyond "is there a note?" belongs in model or controller.

**Interfaces:**
- Consumes: `escapeHtml` (Task 1); model API (Task 2); flow defs (Task 1).
- Produces: global `createStoryboardView(root)` returning:
  - `renderChrome(model, flows)` — sidebar nav (screen buttons + flow buttons)
  - `renderScreen(model, { focus })` — top bar (title/note/state pills) + viewport; catches `render()` throw → error card
  - `markActive(model)` — `aria-current` sync on nav + pills
  - `renderEmpty()` — "no screens registered yet" card in the viewport
  - `announce(text)` — `#status` via `textContent` inside `setTimeout` (never rAF, never innerHTML)
  - `bindNav(fn(screenId))`, `bindState(fn(stateId))`, `bindFlow(fn(flowId))`, `bindGoto(fn(rawTarget))`
- Expects this shell inside `root` (Task 5 provides it):
  `#sb-nav`, `#sb-flows`, `#sb-screen-head`, `#sb-viewport` (with `tabindex="-1"`), and a sibling `#status` **outside** the viewport.

- [ ] **Step 1: Write `libraries/storyboard/engine/view.js`**

```js
function createStoryboardView(root) {
  const nav = root.querySelector("#sb-nav");
  const flowsNav = root.querySelector("#sb-flows");
  const head = root.querySelector("#sb-screen-head");
  const viewport = root.querySelector("#sb-viewport");
  const status = document.querySelector("#status");

  return {
    renderChrome(model, flows) {
      nav.innerHTML = model
        .getScreens()
        .map(
          (s) =>
            `<button class="sb-nav-item" data-action="nav" data-id="${escapeHtml(s.id)}" type="button">${escapeHtml(s.label)}</button>`,
        )
        .join("");
      flowsNav.innerHTML = flows
        .map(
          (f) =>
            `<button class="sb-nav-item" data-action="flow" data-id="${escapeHtml(f.id)}" type="button">${escapeHtml(f.label)}</button>`,
        )
        .join("");
    },

    renderScreen(model, { focus }) {
      const screen = model.getActiveScreen();
      const { stateId } = model.getCurrent();
      const pills = screen.states
        .map(
          (state) =>
            `<button class="sb-state-pill" data-action="state" data-id="${escapeHtml(state)}" type="button">${escapeHtml(state)}</button>`,
        )
        .join("");
      head.innerHTML = `
        <h1 class="sb-screen-title">${escapeHtml(screen.label)}</h1>
        ${screen.note ? `<p class="text-muted sb-screen-note">${escapeHtml(screen.note)}</p>` : ""}
        <div class="cluster cluster-sm sb-states" role="group" aria-label="States">${pills}</div>`;
      try {
        viewport.innerHTML = screen.render(stateId);
      } catch (err) {
        viewport.innerHTML = `
          <div class="alert alert-danger">
            <strong>Screen "${escapeHtml(screen.id)}" failed to render.</strong>
            <p>${escapeHtml(err.message)}</p>
          </div>`;
      }
      this.markActive(model);
      if (focus) viewport.focus();
    },

    markActive(model) {
      const { screenId, stateId } = model.getCurrent();
      nav.querySelectorAll("[data-action='nav']").forEach((el) => {
        el.setAttribute("aria-current", el.dataset.id === screenId ? "true" : "false");
      });
      head.querySelectorAll("[data-action='state']").forEach((el) => {
        el.setAttribute("aria-current", el.dataset.id === stateId ? "true" : "false");
      });
    },

    renderEmpty() {
      viewport.innerHTML = `
        <div class="empty-state stack stack-sm">
          <strong>No screens registered yet.</strong>
          <p class="text-muted">Add a file to <code>screens/</code> and list it in <code>index.html</code>.</p>
        </div>`;
    },

    announce(text) {
      status.textContent = "";
      setTimeout(() => {
        status.textContent = text;
      }, 0);
    },

    bindNav(handler) {
      nav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='nav']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindState(handler) {
      head.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='state']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindFlow(handler) {
      flowsNav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='flow']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindGoto(handler) {
      viewport.addEventListener("click", (e) => {
        const el = e.target.closest("[data-goto]");
        if (!el) return;
        e.preventDefault();
        handler(el.dataset.goto);
      });
    },
  };
}
```

- [ ] **Step 2: Write `libraries/storyboard/engine/index.css`**

Mobile-first: baseline stacks sidebar above main; ≥768px becomes a two-column grid. Uses DS tokens only — no hard-coded colors.

```css
/* Storyboard chrome. Screen content styles itself with design-system classes. */

.storyboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sb-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-2);
  border-bottom: 1px solid var(--surface-4);
}

.sb-brand {
  font-weight: 600;
}

.sb-nav,
.sb-flows {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sb-nav-item {
  min-height: 24px;
  min-width: 24px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.sb-nav-item:hover {
  background: var(--surface-3);
}

.sb-nav-item[aria-current="true"] {
  background: var(--surface-4);
}

.sb-group-label {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, inherit);
}

.sb-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.sb-screen-title {
  margin: 0;
}

.sb-screen-note {
  margin: 0;
}

.sb-state-pill {
  min-height: 24px;
  min-width: 24px;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--surface-4);
  border-radius: var(--radius-xl);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sb-state-pill[aria-current="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface-1, #000);
}

.sb-viewport {
  outline-offset: 4px;
}

@media (min-width: 768px) {
  .storyboard {
    display: grid;
    grid-template-columns: 240px 1fr;
  }

  .sb-sidebar {
    border-bottom: 0;
    border-right: 1px solid var(--surface-4);
  }

  .sb-nav,
  .sb-flows {
    flex-direction: column;
    flex-wrap: nowrap;
  }
}
```

Note: before relying on `--surface-1`/`--text-muted`, grep `libraries/design-system/tokens/` for the exact token names and use what exists (the DS is read-only; the chrome adapts to it, never the reverse). Adjust the two `var(...)` fallbacks above accordingly.

- [ ] **Step 3: Sanity-run existing tests (nothing should break)**

Run: `node --test "tools/*.test.mjs"`
Expected: PASS — all pre-existing tests plus Tasks 1–2 tests.

- [ ] **Step 4: Commit**

```bash
git add libraries/storyboard/engine/view.js libraries/storyboard/engine/index.css
git commit -m "Add storyboard view and mobile-first chrome styles"
```

---

### Task 4: Controller and boot

**Files:**
- Create: `libraries/storyboard/engine/controller.js`, `libraries/storyboard/engine/app.js`
- Test: `tools/storyboard.test.mjs` (append)

**Interfaces:**
- Consumes: `parseTarget`/`formatTarget` (Task 1), model API (Task 2), view API (Task 3).
- Produces:
  - `createStoryboardController(model, view, win, flows)` — `win` is injected (window in the browser, a fake in tests). Constructor renders chrome, resolves the initial hash, and performs the first render.
  - `app.js` boot: gates the empty registry (renderEmpty + stop), else builds model + controller.
- Hash contract: canonical hash is always `#screen@state`. Bad/partial hash → resolve or fall back, then `win.location.replace("#…")` (no history entry). User navigation → `win.location.hash = "…"` (history entry). `hashchange` with unresolvable value → restore current hash via `replace`, model untouched.

- [ ] **Step 1: Append failing controller tests to `tools/storyboard.test.mjs`**

```js
function fakeWindow(initialHash = "") {
  const listeners = {};
  const win = {
    location: {
      hash: initialHash,
      replace(h) {
        win.location.hash = h;
        win.replaced.push(h);
      },
    },
    replaced: [],
    addEventListener(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    fire(type) {
      (listeners[type] ?? []).forEach((fn) => fn());
    },
  };
  return win;
}

function fakeView() {
  return {
    calls: [],
    announced: [],
    handlers: {},
    renderChrome() { this.calls.push("chrome"); },
    renderScreen(model, opts) { this.calls.push(`screen:${opts.focus}`); },
    markActive() {},
    renderEmpty() { this.calls.push("empty"); },
    announce(text) { this.announced.push(text); },
    bindNav(fn) { this.handlers.nav = fn; },
    bindState(fn) { this.handlers.state = fn; },
    bindFlow(fn) { this.handlers.flow = fn; },
    bindGoto(fn) { this.handlers.goto = fn; },
  };
}

function freshController(initialHash) {
  const { evalIn } = loadScripts(["engine/registry.js", "engine/model.js", "engine/controller.js"]);
  const Storyboard = evalIn("Storyboard");
  Storyboard.addScreen({ id: "plants", label: "Plants", states: ["default", "empty"], render: () => "" });
  Storyboard.addScreen({ id: "settings", label: "Settings", render: () => "" });
  Storyboard.addFlow({ id: "add-a-plant", label: "Add a plant", start: "plants@empty" });
  const model = evalIn("createStoryboardModel")(Storyboard.screens);
  const win = fakeWindow(initialHash);
  const view = fakeView();
  evalIn("createStoryboardController")(model, view, win, Storyboard.flows);
  return { model, win, view };
}

test("boot with no hash lands on first screen and replaces the hash (no focus steal)", () => {
  const { model, win, view } = freshController("");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "default" });
  assert.equal(win.location.hash, "#plants@default");
  assert.deepEqual(win.replaced, ["#plants@default"]);
  assert.ok(view.calls.includes("screen:false"), "initial render must not focus");
});

test("boot with a valid deep link honors it; partial hash is canonicalized via replace", () => {
  const deep = freshController("#settings@default");
  assert.deepEqual(plain(deep.model.getCurrent()), { screenId: "settings", stateId: "default" });
  assert.equal(deep.win.replaced.length, 0, "exact hash needs no rewrite");
  const partial = freshController("#plants");
  assert.equal(partial.win.location.hash, "#plants@default");
  assert.equal(partial.win.replaced.length, 1);
});

test("boot with garbage hash falls back and replaces — Back is never trapped", () => {
  const { model, win } = freshController("#<img src=x>");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "default" });
  assert.equal(win.location.hash, "#plants@default");
});

test("hashchange drives the model; user navigation focuses the viewport", () => {
  const { model, win, view } = freshController("");
  win.location.hash = "#plants@empty";
  win.fire("hashchange");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "empty" });
  assert.ok(view.calls.includes("screen:true"), "post-boot renders focus the viewport");
});

test("hashchange to garbage restores the current hash and leaves the model alone", () => {
  const { model, win } = freshController("");
  win.location.hash = "#nope@nope";
  win.fire("hashchange");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "default" });
  assert.equal(win.location.hash, "#plants@default");
});

test("nav/state/flow/goto handlers navigate; unknown goto announces and stays", () => {
  const { model, view } = freshController("");
  view.handlers.state("empty");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "empty" });
  view.handlers.nav("settings");
  assert.equal(model.getCurrent().screenId, "settings");
  view.handlers.flow("add-a-plant");
  assert.deepEqual(plain(model.getCurrent()), { screenId: "plants", stateId: "empty" });
  view.handlers.goto("settings@default");
  assert.equal(model.getCurrent().screenId, "settings");
  view.handlers.goto("nope");
  assert.equal(model.getCurrent().screenId, "settings", "unknown goto must not navigate");
  assert.ok(view.announced.some((t) => t.includes("Unknown screen: nope")));
});

test("screen changes are announced", () => {
  const { view } = freshController("");
  assert.ok(view.announced.some((t) => t === "Showing Plants, default state"));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tools/storyboard.test.mjs`
Expected: FAIL — `createStoryboardController is not defined`.

- [ ] **Step 3: Write `libraries/storyboard/engine/controller.js`**

```js
// Owns the two DOM-flavored concerns the model must not know about:
// data-goto delegation and hash routing. The URL hash is UNTRUSTED input —
// it is parsed and matched against the registry, never rendered anywhere.

function createStoryboardController(model, view, win, flows) {
  let initial = true;

  function currentHash() {
    return win.location.hash.replace(/^#/, "");
  }

  model.subscribe(() => {
    view.renderScreen(model, { focus: !initial });
    const canonical = formatTarget(model.getCurrent());
    if (currentHash() !== canonical) {
      if (initial) win.location.replace(`#${canonical}`);
      else win.location.hash = canonical;
    }
    const screen = model.getActiveScreen();
    view.announce(`Showing ${screen.label}, ${model.getCurrent().stateId} state`);
    initial = false;
  });

  win.addEventListener("hashchange", () => {
    const next = model.resolve(parseTarget(currentHash()));
    if (!next) {
      win.location.replace(`#${formatTarget(model.getCurrent())}`);
      return;
    }
    model.setActive(next);
  });

  view.bindNav((screenId) => model.setActive({ screenId, stateId: null }));
  view.bindState((stateId) => model.setActive({ screenId: model.getCurrent().screenId, stateId }));
  view.bindFlow((flowId) => {
    const flow = flows.find((f) => f.id === flowId);
    if (flow) model.setActive(parseTarget(flow.start));
  });
  view.bindGoto((raw) => {
    const next = model.resolve(parseTarget(raw));
    if (!next) {
      view.announce(`Unknown screen: ${raw}`);
      console.warn(`storyboard: unknown data-goto "${raw}"`);
      return;
    }
    model.setActive(next);
  });

  view.renderChrome(model, flows);
  const requested = model.resolve(parseTarget(currentHash()));
  model.setActive(requested ?? model.fallback());
}
```

Note on the announce string: `view.announce` receives the label/state as plain text and the real view writes it with `textContent`, so no escaping is needed at this call site — but `Unknown screen: ${raw}` carries untrusted hash-derived input, which is exactly why `announce` must never switch to `innerHTML`.

- [ ] **Step 4: Write `libraries/storyboard/engine/app.js`**

```js
(function bootStoryboard() {
  const root = document.querySelector(".storyboard");
  const view = createStoryboardView(root);
  if (Storyboard.screens.length === 0) {
    view.renderEmpty();
    return;
  }
  const model = createStoryboardModel(Storyboard.screens);
  createStoryboardController(model, view, window, Storyboard.flows);
})();
```

- [ ] **Step 5: Run to verify pass**

Run: `node --test tools/storyboard.test.mjs`
Expected: PASS (14 tests).

- [ ] **Step 6: Commit**

```bash
git add libraries/storyboard/engine/controller.js libraries/storyboard/engine/app.js tools/storyboard.test.mjs
git commit -m "Add storyboard controller (hash routing, data-goto) and boot"
```

---

### Task 5: Demo storyboard + structural test

**Files:**
- Create: `libraries/storyboard/index.html`, `libraries/storyboard/data.js`, `libraries/storyboard/flows.js`, `libraries/storyboard/screens/plants.js`, `libraries/storyboard/screens/plant-detail.js`, `libraries/storyboard/screens/add-plant.js`, `libraries/storyboard/screens/settings.js`
- Test: `tools/storyboard.demo.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–4; DS classes (`card`, `btn btn-primary/btn-ghost`, `stack`/`stack-sm`, `cluster`/`cluster-sm`, `grid-2`, `empty-state`, `alert alert-danger`, `badge`, `field`/`label`/`input`).
- Produces: global `DEMO_DATA` (used only by demo screens); the demo is also the consumer starter, so its structure is the documented reference.

The demo app is **Frond**, a fictional plant-care tracker. Spec coverage (§8): 4 screens; `plants` (default/empty) and `plant-detail` (default/error) are multi-state; `add-plant`'s Save and `plant-detail`'s Retry are `@state` hotspots; one flow starting at `plants@empty`; all mock data fictional and interpolated via `escapeHtml`.

- [ ] **Step 1: Write the failing structural test**

`tools/storyboard.demo.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadScripts } from "./storyboard-harness.mjs";

const LIB = resolve(import.meta.dirname, "..", "libraries", "storyboard");
const html = readFileSync(resolve(LIB, "index.html"), "utf8");
const screenFiles = readdirSync(resolve(LIB, "screens")).filter((f) => f.endsWith(".js"));

test("index.html loads every screen file, in the documented order", () => {
  // Storyboard-local scripts only — the design-system theme-toggle tag
  // (../design-system/…) loads first and is not part of the documented order.
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map((m) => m[1])
    .filter((s) => !s.startsWith("../"));
  for (const f of screenFiles) {
    assert.ok(srcs.includes(`screens/${f}`), `index.html missing screens/${f}`);
  }
  const pos = (s) => srcs.findIndex((x) => x.includes(s));
  assert.ok(pos("engine/registry.js") === 0, "registry.js must load first");
  assert.ok(pos("data.js") < pos("screens/"), "data before screens");
  assert.ok(pos("screens/") < pos("flows.js"), "screens before flows");
  assert.ok(pos("flows.js") < pos("engine/model.js"), "flows before engine");
  assert.ok(pos("engine/app.js") === srcs.length - 1, "app.js must load last");
});

function loadDemo() {
  const { evalIn } = loadScripts([
    "engine/registry.js",
    "data.js",
    ...screenFiles.map((f) => `screens/${f}`),
    "flows.js",
  ]);
  return evalIn("Storyboard");
}

test("demo meets the spec's coverage floor", () => {
  const sb = loadDemo();
  assert.ok(sb.screens.length >= 4, "at least 4 screens");
  assert.ok(sb.screens.filter((s) => s.states.length >= 2).length >= 2, "at least 2 multi-state screens");
  assert.ok(sb.flows.length >= 1, "at least one flow");
});

test("every data-goto in every rendered state resolves; every screen is reachable; at least one @state target", () => {
  const sb = loadDemo();
  const targets = [];
  for (const screen of sb.screens) {
    for (const state of screen.states) {
      const out = screen.render(state);
      for (const m of out.matchAll(/data-goto="([^"]+)"/g)) targets.push(m[1]);
    }
  }
  const reachable = new Set(sb.flows.map((f) => f.start.split("@")[0]));
  for (const raw of targets) {
    const [screenId, stateId] = raw.split("@");
    const screen = sb.screens.find((s) => s.id === screenId);
    assert.ok(screen, `data-goto "${raw}": unknown screen`);
    if (stateId) assert.ok(screen.states.includes(stateId), `data-goto "${raw}": unknown state`);
    reachable.add(screenId);
  }
  for (const s of sb.screens) assert.ok(reachable.has(s.id), `screen "${s.id}" unreachable by hotspot/flow`);
  assert.ok(targets.some((t) => t.includes("@")), "at least one hotspot must target screen@state");
});

test("demo screens route all mock-data interpolation through escapeHtml", () => {
  for (const f of screenFiles) {
    const src = readFileSync(resolve(LIB, "screens", f), "utf8");
    if (src.includes("DEMO_DATA")) {
      assert.ok(src.includes("escapeHtml("), `${f} uses DEMO_DATA but never calls escapeHtml`);
    }
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tools/storyboard.demo.test.mjs`
Expected: FAIL — `ENOENT … index.html`.

- [ ] **Step 3: Write `libraries/storyboard/data.js`**

```js
// Mock data for the Frond demo. FICTIONAL ONLY — the workbench repo and its
// Pages site are public. Never real names, emails, or user content.

const DEMO_DATA = {
  plants: [
    { id: "monstera", name: "Monstera", species: "Monstera deliciosa", lastWatered: "3 days ago", thirsty: false },
    { id: "fiddle", name: "Fiddle-leaf fig", species: "Ficus lyrata", lastWatered: "8 days ago", thirsty: true },
    { id: "pothos", name: "Golden pothos", species: "Epipremnum aureum", lastWatered: "yesterday", thirsty: false },
  ],
  log: [
    { date: "Mon", note: "Watered 200 ml" },
    { date: "Thu", note: "Rotated toward the window" },
    { date: "Sun", note: "Wiped leaves" },
  ],
};
```

- [ ] **Step 4: Write the four screens**

`libraries/storyboard/screens/plants.js`:
```js
Storyboard.addScreen({
  id: "plants",
  label: "Plants",
  states: ["default", "empty"],
  note: "Home screen. Empty state is the first-run experience.",
  render(state) {
    const toolbar = `
      <div class="cluster cluster-between">
        <button class="btn btn-primary" data-goto="add-plant" type="button">Add plant</button>
        <button class="btn btn-ghost" data-goto="settings" type="button">Settings</button>
      </div>`;
    if (state === "empty") {
      return `
        <div class="stack">
          ${toolbar}
          <div class="empty-state stack stack-sm">
            <strong>No plants yet.</strong>
            <p class="text-muted">Add your first plant and Frond will remind you when it's thirsty.</p>
            <button class="btn btn-primary" data-goto="add-plant" type="button">Add your first plant</button>
          </div>
        </div>`;
    }
    const cards = DEMO_DATA.plants
      .map(
        (p) => `
        <button class="card card-hover stack stack-sm" data-goto="plant-detail" type="button">
          <strong>${escapeHtml(p.name)}</strong>
          <span class="text-muted">${escapeHtml(p.species)}</span>
          <span class="cluster cluster-sm">
            <span class="badge ${p.thirsty ? "badge-warning" : "badge-success"}">${p.thirsty ? "Thirsty" : "Happy"}</span>
            <span class="text-muted">Watered ${escapeHtml(p.lastWatered)}</span>
          </span>
        </button>`,
      )
      .join("");
    return `<div class="stack">${toolbar}<div class="grid grid-2">${cards}</div></div>`;
  },
});
```

`libraries/storyboard/screens/plant-detail.js`:
```js
Storyboard.addScreen({
  id: "plant-detail",
  label: "Plant detail",
  states: ["default", "error"],
  note: "One plant's care view. Error state: the watering log failed to load.",
  render(state) {
    const back = `<button class="btn btn-ghost" data-goto="plants" type="button">Back to plants</button>`;
    const plant = DEMO_DATA.plants[1];
    const header = `
      <div class="stack stack-sm">
        <h2>${escapeHtml(plant.name)}</h2>
        <p class="text-muted">${escapeHtml(plant.species)} — watered ${escapeHtml(plant.lastWatered)}</p>
        <span class="badge badge-warning">Thirsty</span>
      </div>`;
    if (state === "error") {
      return `
        <div class="stack">
          ${back}
          ${header}
          <div class="alert alert-danger stack stack-sm">
            <strong>Couldn't load the watering log.</strong>
            <button class="btn btn-secondary" data-goto="plant-detail@default" type="button">Retry</button>
          </div>
        </div>`;
    }
    const log = DEMO_DATA.log
      .map((entry) => `<li><strong>${escapeHtml(entry.date)}</strong> — ${escapeHtml(entry.note)}</li>`)
      .join("");
    return `
      <div class="stack">
        ${back}
        ${header}
        <div class="card stack stack-sm">
          <strong>Watering log</strong>
          <ul class="stack stack-sm">${log}</ul>
          <button class="btn btn-primary" data-goto="plant-detail" type="button">Water now</button>
        </div>
      </div>`;
  },
});
```

`libraries/storyboard/screens/add-plant.js`:
```js
Storyboard.addScreen({
  id: "add-plant",
  label: "Add plant",
  note: "Mock form — fields are visual only; Save jumps to the populated list.",
  render() {
    return `
      <form class="stack" onsubmit="return false">
        <div class="field">
          <label class="label" for="frond-name">Name</label>
          <input class="input" id="frond-name" type="text" placeholder="e.g. Monstera" />
        </div>
        <div class="field">
          <label class="label" for="frond-species">Species</label>
          <input class="input" id="frond-species" type="text" placeholder="e.g. Monstera deliciosa" />
        </div>
        <div class="field">
          <label class="label" for="frond-interval">Watering interval</label>
          <select class="select" id="frond-interval">
            <option>Every 3 days</option>
            <option>Weekly</option>
            <option>Fortnightly</option>
          </select>
        </div>
        <div class="cluster cluster-sm">
          <button class="btn btn-primary" data-goto="plants@default" type="button">Save plant</button>
          <button class="btn btn-ghost" data-goto="plants" type="button">Cancel</button>
        </div>
      </form>`;
  },
});
```

`libraries/storyboard/screens/settings.js`:
```js
Storyboard.addScreen({
  id: "settings",
  label: "Settings",
  note: "App preferences — mock toggles.",
  render() {
    return `
      <div class="stack">
        <button class="btn btn-ghost" data-goto="plants" type="button">Back to plants</button>
        <div class="card stack stack-sm">
          <strong>Reminders</strong>
          <p class="text-muted">Notify me when a plant is thirsty.</p>
          <button class="btn btn-secondary" type="button" aria-pressed="true">On</button>
        </div>
        <div class="card stack stack-sm">
          <strong>Units</strong>
          <p class="text-muted">Water amounts in millilitres.</p>
          <button class="btn btn-secondary" type="button" aria-pressed="true">Metric</button>
        </div>
      </div>`;
  },
});
```

- [ ] **Step 5: Write `libraries/storyboard/flows.js`**

```js
Storyboard.addFlow({
  id: "add-a-plant",
  label: "Add a plant",
  start: "plants@empty",
  note: "First-run: from the empty state to a populated list.",
});
```

- [ ] **Step 6: Write `libraries/storyboard/index.html`**

Mirror the gallery's head (no-flash theme init, DS links via sibling path, theme toggle). The `#status` region sits **outside** `.storyboard`, before it, per spec §7.

```html
<!doctype html>
<html lang="en" data-theme="dark" data-palette="default">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script>
      (function () {
        var root = document.documentElement;
        root.dataset.theme = localStorage.getItem("theme") || "dark";
        root.dataset.palette = localStorage.getItem("palette") || "default";
      })();
    </script>
    <title>Frond — Storyboard demo</title>
    <link rel="stylesheet" href="../design-system/tokens/index.css" />
    <link rel="stylesheet" href="../design-system/base/reset.css" />
    <link rel="stylesheet" href="../design-system/base/base.css" />
    <link rel="stylesheet" href="../design-system/primitives/index.css" />
    <link rel="stylesheet" href="../design-system/components/index.css" />
    <link rel="stylesheet" href="../design-system/compositions/index.css" />
    <link rel="stylesheet" href="../design-system/utilities/index.css" />
    <link rel="stylesheet" href="./engine/index.css" />
  </head>
  <body>
    <div id="status" class="sr-only" role="status" aria-live="polite"></div>
    <div class="storyboard">
      <aside class="sb-sidebar">
        <span class="sb-brand">Frond <span class="text-muted">— storyboard</span></span>
        <button class="btn btn-ghost" data-theme-toggle type="button">Theme</button>
        <span class="sb-group-label" id="sb-nav-label">Screens</span>
        <nav id="sb-nav" class="sb-nav" aria-labelledby="sb-nav-label"></nav>
        <span class="sb-group-label" id="sb-flows-label">Flows</span>
        <nav id="sb-flows" class="sb-flows" aria-labelledby="sb-flows-label"></nav>
      </aside>
      <main class="sb-main">
        <header id="sb-screen-head" class="stack stack-sm"></header>
        <div id="sb-viewport" class="sb-viewport" tabindex="-1"></div>
      </main>
    </div>
    <script src="../design-system/theme/theme-toggle.js"></script>
    <script src="engine/registry.js"></script>
    <script src="data.js"></script>
    <script src="screens/plants.js"></script>
    <script src="screens/plant-detail.js"></script>
    <script src="screens/add-plant.js"></script>
    <script src="screens/settings.js"></script>
    <script src="flows.js"></script>
    <script src="engine/model.js"></script>
    <script src="engine/view.js"></script>
    <script src="engine/controller.js"></script>
    <script src="engine/app.js"></script>
  </body>
</html>
```

Note: the structural test scopes its order assertions to storyboard-local scripts (it filters out `../design-system/…` sources), so the theme-toggle tag loading first is expected and fine.

- [ ] **Step 7: Run to verify pass**

Run: `node --test tools/storyboard.demo.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 8: Open the demo in a real browser and click through**

Open `libraries/storyboard/index.html` directly from disk (`file://`). Verify: lands on `#plants@default`, sidebar nav works, state pills flip Plants to empty, the flow jumps to `plants@empty`, hotspots navigate, Back button retraces, a hand-typed garbage hash falls back cleanly.

- [ ] **Step 9: Commit**

```bash
git add libraries/storyboard/index.html libraries/storyboard/data.js libraries/storyboard/flows.js libraries/storyboard/screens/ tools/storyboard.demo.test.mjs
git commit -m "Add Frond demo storyboard and structural integrity test"
```

---

### Task 6: Dashboard card goes live

**Files:**
- Modify: `index.html` (repo root, lines ~170-173 — the aria-disabled storyboard card)
- Modify: `tools/dashboard.test.mjs` (the "disabled storyboard card" test)

**Interfaces:**
- Consumes: `libraries/storyboard/index.html` existing (Task 5).
- Produces: nothing downstream.

- [ ] **Step 1: Update the failing test first**

In `tools/dashboard.test.mjs`, replace:
```js
test("disabled storyboard card is aria-disabled and has no href", () => {
  assert.match(html, /aria-disabled="true"/);
});
```
with:
```js
test("storyboard card links to the live demo", () => {
  assert.ok(html.includes('href="./libraries/storyboard/"'), "missing storyboard link");
  assert.doesNotMatch(html, /aria-disabled="true"/);
});
```
Also add `"libraries/storyboard/"` to the href list in the "dashboard links the key destinations" test.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tools/dashboard.test.mjs`
Expected: FAIL — storyboard link missing, `aria-disabled` still present.

- [ ] **Step 3: Replace the card in root `index.html`**

Replace:
```html
<span class="wb-card" role="note" aria-disabled="true">
  <strong>Storyboard</strong>
  <p>Screens, flows &amp; states — coming soon.</p>
</span>
```
with (mirroring the Design System card's anchor pattern directly above it):
```html
<a class="wb-card" href="./libraries/storyboard/">
  <strong>Storyboard</strong>
  <p>Screens, flows &amp; states — clickable app mocks, designed before the build.</p>
  <span class="wb-cue">Open the demo</span>
</a>
```
Keep the file's existing indentation (tabs).

- [ ] **Step 4: Run tests + link check**

Run: `node --test tools/dashboard.test.mjs` → Expected: PASS.
Run: `node tools/check-links.mjs` → Expected: exit 0 (the new `libraries/storyboard/` target resolves because Task 5 created its `index.html`).

- [ ] **Step 5: Commit**

```bash
git add index.html tools/dashboard.test.mjs
git commit -m "Replace storyboard coming-soon card with live demo link"
```

---

### Task 7: Extraction proof + documentation

**Files:**
- Modify: `tools/extract.integration.test.mjs` (add storyboard test)
- Modify: `libraries/storyboard/README.md` (replace the reserved stub)
- Modify: `README.md` (repo root — storyboard entry in the libraries section)

**Interfaces:**
- Consumes: `extract.json` + `VERSION` (Task 1), `engine/index.css` as version-header anchor (Task 3).
- Produces: the documented consumption contract.

- [ ] **Step 1: Add the failing extract integration test**

Append to `tools/extract.integration.test.mjs` (mirrors the design-system test above it):
```js
test("real storyboard extract copies engine only and records version in engine/index.css", () => {
  const target = mkdtempSync(join(tmpdir(), "wb-int-"));
  const r = extract({ libraryName: "storyboard", workbenchRoot: WORKBENCH, targetDir: target });
  assert.equal(r.status, "copied-fresh");
  assert.ok(existsSync(join(target, "storyboard", "engine", "registry.js")));
  assert.ok(!existsSync(join(target, "storyboard", "screens")), "demo screens must NOT be copied");
  assert.ok(!existsSync(join(target, "storyboard", "index.html")), "demo index must NOT be copied");
  const anchor = readFileSync(join(target, "storyboard", "engine", "index.css"), "utf8");
  assert.match(anchor, /workbench-lib: storyboard v1\.0\.0/);
  rmSync(target, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run it**

Run: `node --test tools/extract.integration.test.mjs`
Expected: PASS immediately — Tasks 1 and 3 already satisfy it. If it fails, the extract contract is broken: fix `extract.json`/file layout, **not** `extract.mjs` (the tool is out of scope).

- [ ] **Step 3: Rewrite `libraries/storyboard/README.md`**

Replace the reserved stub with (English, short, no marketing — her README standard):
```markdown
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
```

- [ ] **Step 4: Add the storyboard entry to the root `README.md`**

Find the libraries list/section in the root README and update the storyboard line (it currently says reserved/coming soon) to:
```markdown
- `libraries/storyboard/` — clickable app mocks (screens, flows, states); design-first planning. Demo doubles as the starter.
```
Match the surrounding list style exactly.

- [ ] **Step 5: Run the full suite**

Run: `node --test "tools/*.test.mjs"` → Expected: PASS, all files.
Run: `node tools/check-links.mjs` → Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/extract.integration.test.mjs libraries/storyboard/README.md README.md
git commit -m "Prove storyboard extraction, write authoring and consumption docs"
```

---

### Task 8: Acceptance sweep

**Files:** none created — verification only. Fixes discovered here are small follow-up commits on the branch.

- [ ] **Step 1: Full automated suite one last time**

Run: `node --test "tools/*.test.mjs"` and `node tools/check-links.mjs`
Expected: everything green.

- [ ] **Step 2: Manual/browser acceptance checklist (spec §10)**

In a real browser (both `file://` and via a static server if available):

- [ ] Keyboard end-to-end: Tab reaches every nav item, state pill, and hotspot; Enter activates.
- [ ] Focus lands on the viewport after every navigation — but NOT on initial page load.
- [ ] `#status` announces "Showing …, … state" on each change (inspect the element's textContent).
- [ ] Browser Back/Forward retrace the click path; a shared deep link (`#plant-detail@error`) opens directly.
- [ ] Hand-typed garbage hash (`#nope` and `#<img src=x>`) falls back to Plants, hash corrected, nothing rendered from the hash.
- [ ] Temporarily break a screen (`throw new Error("boom")` in `render`) → error card appears, rest of the storyboard still works. Revert.
- [ ] Temporarily comment out all screen script tags → "No screens registered yet" card. Revert.
- [ ] Narrow window (<768px): sidebar stacks on top, everything still reachable; ≥768px: two-column layout.
- [ ] Theme toggle: light mode holds up (dark-first, light works).

- [ ] **Step 3: Report**

Summarize results against spec §10's checklist. Anything failing gets fixed and committed before declaring the plan complete. Merging, pushing, tagging workbench **v2.2.0**, and updating the `project-init` skill (gated — touches `.claude/`) are all Malin's calls, outside this plan.
