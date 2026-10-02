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

test("every data-toggle is one button: two values, text matches aria-pressed, described by the setting text, inside a labelled group", () => {
  const sb = loadDemo();
  let toggles = 0;
  for (const screen of sb.screens) {
    for (const state of screen.states) {
      const out = screen.render(state);
      for (const m of out.matchAll(/<button\b[^>]*\bdata-toggle="([^"]*)"[^>]*>([^<]*)<\/button>/g)) {
        const [tag, values, text] = m;
        const where = `${screen.id}@${state}: data-toggle "${values}"`;
        const [on, off, extra] = values.split("|");
        assert.ok(on && off && extra === undefined, `${where}: must list exactly two values as "On|Off"`);
        const pressed = /\baria-pressed="(true|false)"/.exec(tag);
        assert.ok(pressed, `${where}: missing aria-pressed`);
        assert.equal(text.trim(), pressed[1] === "true" ? on : off, `${where}: button text must show the value aria-pressed points to`);
        const desc = /\baria-describedby="([^"]+)"/.exec(tag);
        assert.ok(desc && out.includes(`id="${desc[1]}"`), `${where}: aria-describedby must point at the setting text`);
        // The button's nearest enclosing tag must be a role="group" labelled by the setting name.
        const before = out.slice(0, m.index);
        const open = before.lastIndexOf("<div");
        const groupTag = before.slice(open, before.indexOf(">", open) + 1);
        const label = /\baria-labelledby="([^"]+)"/.exec(groupTag);
        assert.ok(before.lastIndexOf("</div>") < open && / role="group"/.test(groupTag) && label, `${where}: not inside a labelled role="group"`);
        assert.ok(out.includes(`id="${label[1]}"`), `${where}: group label id "${label[1]}" not in the screen`);
        toggles += 1;
      }
    }
  }
  assert.ok(toggles >= 1, "the demo must ship at least one data-toggle (Settings)");
});
