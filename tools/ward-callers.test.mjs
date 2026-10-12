// tools/ward-callers.test.mjs
// Every scaffold ships the Ward caller. Workbench's Dependabot scans only the
// root workflows, so nothing but this test would ever move the scaffold pins:
// they must match what Ward's own template pins, read from the sibling checkout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const WORKBENCH = resolve(import.meta.dirname, "..");
const WARD = resolve(WORKBENCH, "..", "ward");
const SCAFFOLDS = ["csharp-api", "csharp-console", "csharp-layered", "csharp-wpf", "web-react-ts", "web-vite"];
const CSHARP = SCAFFOLDS.filter((s) => s.startsWith("csharp-"));
const PIN = /dependabot-automerge\.yml@([0-9a-f]{40}) # (v[\d.]+)/;

const read = (...parts) => readFileSync(join(...parts), "utf8").replaceAll("\r\n", "\n");
const scaffold = (s, ...parts) => join(WORKBENCH, "scaffolds", s, ...parts);
const pinOf = (text) => {
  const m = text.match(PIN);
  assert.ok(m, "no pinned dependabot-automerge line");
  return `${m[1]} # ${m[2]}`;
};
const wardTemplate = join(WARD, "templates", "ward.yml");
const noWard = existsSync(wardTemplate) ? false : "no sibling Ward checkout at ../ward";

for (const s of SCAFFOLDS) {
  test(`scaffolds/${s} ships ward.yml, repo-hygiene.yml and dependabot.yml, and no ci.yml`, () => {
    const workflows = readdirSync(scaffold(s, ".github", "workflows")).sort();
    assert.deepEqual(workflows, ["repo-hygiene.yml", "ward.yml"]);
    assert.ok(existsSync(scaffold(s, ".github", "dependabot.yml")), "missing .github/dependabot.yml");
  });
}

test("every scaffold pins the same dependabot-automerge commit", () => {
  const pins = new Set(SCAFFOLDS.map((s) => pinOf(read(scaffold(s, ".github", "workflows", "ward.yml")))));
  assert.equal(pins.size, 1, `scaffold pins differ: ${[...pins].join(", ")}`);
});

test("scaffold automerge pins match Ward's templates/ward.yml", { skip: noWard }, () => {
  const expected = pinOf(read(wardTemplate));
  for (const s of SCAFFOLDS) {
    assert.equal(
      pinOf(read(scaffold(s, ".github", "workflows", "ward.yml"))),
      expected,
      `scaffolds/${s} pins a different automerge commit than Ward's template`,
    );
  }
});

test("C# scaffolds carry Ward's Directory.Build.props unchanged", { skip: noWard }, () => {
  const expected = read(WARD, "templates", "Directory.Build.props");
  for (const s of CSHARP) {
    assert.equal(read(scaffold(s, "Directory.Build.props")), expected, `scaffolds/${s}/Directory.Build.props drifted`);
  }
});

test("C# scaffolds keep .cs files CRLF and mark EF migrations as generated", () => {
  for (const s of CSHARP) {
    assert.match(read(scaffold(s, ".gitattributes")), /^\*\.cs text eol=crlf$/m, `scaffolds/${s}/.gitattributes`);
    assert.match(
      read(scaffold(s, ".editorconfig")),
      /^\[\*\*\/Migrations\/\*\.cs\]\ngenerated_code = true$/m,
      `scaffolds/${s}/.editorconfig`,
    );
  }
});

// The caller is what Ward's skill writes for the scaffold's inputs: every input
// the template knows, in its order, with its comment in the template's column.
// A scaffold may add comment-only note lines inside the with: block.
const INPUT = /^\s+([\w-]+):\s*("([^"]*)"|[^\s#]*)\s*(#.*)?$/;
const callerLines = (s) => read(scaffold(s, ".github", "workflows", "ward.yml")).split("\n");
const withRange = (lines) => {
  const start = lines.indexOf("    with:");
  const end = lines.findIndex((l, i) => i > start && l.trim() === "");
  return [start, end];
};
const inputsOf = (lines) => {
  const [start, end] = withRange(lines);
  const inputs = {};
  for (const line of lines.slice(start + 1, end)) {
    const m = line.match(INPUT);
    if (m) inputs[m[1]] = m[3] ?? m[2];
  }
  return inputs;
};
const withoutNotes = (lines) => {
  const [start, end] = withRange(lines);
  return lines.filter((l, i) => !(i > start && i < end && /^\s*#/.test(l)));
};

test("scaffold callers are Ward's template rendered with the scaffold's inputs", { skip: noWard }, async () => {
  const { renderCaller } = await import(pathToFileURL(join(WARD, "tools", "apply.mjs")));
  const template = read(wardTemplate);
  for (const s of SCAFFOLDS) {
    const lines = callerLines(s);
    assert.equal(
      withoutNotes(lines).join("\n"),
      renderCaller(template, inputsOf(lines)),
      `scaffolds/${s}/.github/workflows/ward.yml drifted from Ward's template`,
    );
  }
});
