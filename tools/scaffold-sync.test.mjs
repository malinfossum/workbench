import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { extract } from "./extract.mjs";

const WORKBENCH = resolve(import.meta.dirname, "..");

// Every scaffold that bundles a design-system copy. A design-system bump
// without a re-sync of each of these must fail CI, not ship silently.
const BUNDLING_SCAFFOLDS = ["web-vite", "web-react-ts"];

for (const scaffold of BUNDLING_SCAFFOLDS) {
  test(`scaffolds/${scaffold} bundles the current design-system`, () => {
    const r = extract({
      libraryName: "design-system",
      workbenchRoot: WORKBENCH,
      targetDir: join(WORKBENCH, "scaffolds", scaffold),
      check: true,
    });
    assert.equal(
      r.status,
      "current",
      `scaffolds/${scaffold}/design-system is ${r.status} — re-run: node tools/extract.mjs design-system scaffolds/${scaffold}`,
    );
  });
}
