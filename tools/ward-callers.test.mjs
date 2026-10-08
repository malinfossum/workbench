// tools/ward-callers.test.mjs
// Every scaffold ships the Ward caller. Workbench's Dependabot scans only the
// root workflows, so nothing but this test would ever move the scaffold pins:
// they must match what Ward's own template pins, read from the sibling checkout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
