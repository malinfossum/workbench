import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { extract } from "./extract.mjs";

const WORKBENCH = resolve(import.meta.dirname, "..");

// Every scaffold folder that bundles a library copy. A library bump without a
// re-sync of each of these must fail CI, not ship silently.
const BUNDLES = {
  "design-system": [["web-vite", "."], ["web-react-ts", "."]],
  i18n: [["web-vite", "."], ["web-react-ts", "."]],
  "layout-audit": [["web-react-ts", "e2e"], ["web-vite", "tests/e2e"]],
};

for (const [library, targets] of Object.entries(BUNDLES)) {
  for (const [scaffold, dir] of targets) {
    const target = join("scaffolds", scaffold, dir).replaceAll("\\", "/");
    test(`${target} bundles the current ${library}`, () => {
      const r = extract({
        libraryName: library,
        workbenchRoot: WORKBENCH,
        targetDir: join(WORKBENCH, target),
        check: true,
      });
      assert.equal(
        r.status,
        "current",
        `${target}/${library} is ${r.status}. Re-run: node tools/extract.mjs ${library} ${target}`,
      );
    });
  }
}

// The Modern Web Guidance skill is vendored into both web scaffolds by its own
// installer, not by extract. Both copies and their lock must stay identical, so
// an update re-run in one scaffold only fails CI instead of drifting.
const SKILL_SCAFFOLDS = ["web-vite", "web-react-ts"];
const SKILL_FILES = [".claude/skills/modern-web-guidance", "skills-lock.json"];

function listFiles(root) {
  if (!statSync(root).isDirectory()) return [""];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(root, join(e.parentPath, e.name)).replaceAll("\\", "/"))
    .sort();
}

test("both web scaffolds vendor the same Modern Web Guidance skill", () => {
  const [a, b] = SKILL_SCAFFOLDS.map((s) => join(WORKBENCH, "scaffolds", s));
  for (const item of SKILL_FILES) {
    const filesA = listFiles(join(a, item));
    assert.deepEqual(listFiles(join(b, item)), filesA, `${item}: file lists differ`);
    assert.ok(filesA.length > 0, `${item} is empty`);
    for (const f of filesA) {
      assert.equal(
        readFileSync(join(b, item, f), "utf8").replaceAll("\r\n", "\n"),
        readFileSync(join(a, item, f), "utf8").replaceAll("\r\n", "\n"),
        `${item}/${f} differs. Re-run the install command from the scaffold README in both scaffolds.`,
      );
    }
  }
});
