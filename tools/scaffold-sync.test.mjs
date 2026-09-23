import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { extract } from "./extract.mjs";

const WORKBENCH = resolve(import.meta.dirname, "..");

// Every scaffold that bundles a library copy. A library bump without a
// re-sync of each of these must fail CI, not ship silently.
const BUNDLES = {
  "design-system": ["web-vite", "web-react-ts"],
  i18n: ["web-vite", "web-react-ts"],
};

for (const [library, scaffolds] of Object.entries(BUNDLES)) {
  for (const scaffold of scaffolds) {
    test(`scaffolds/${scaffold} bundles the current ${library}`, () => {
      const r = extract({
        libraryName: library,
        workbenchRoot: WORKBENCH,
        targetDir: join(WORKBENCH, "scaffolds", scaffold),
        check: true,
      });
      assert.equal(
        r.status,
        "current",
        `scaffolds/${scaffold}/${library} is ${r.status} — re-run: node tools/extract.mjs ${library} scaffolds/${scaffold}`,
      );
    });
  }
}
