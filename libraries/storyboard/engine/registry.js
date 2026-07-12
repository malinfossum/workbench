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