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