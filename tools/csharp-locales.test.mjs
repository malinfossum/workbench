// tools/csharp-locales.test.mjs
// The C# scaffolds' locale bundles follow the same rules as the web scaffolds'
// (locale standard § 7.2, § 8, § 10): one key set per scaffold, flat strings,
// no empty values, no hard-coded prices. CI runs no dotnet, so this is the
// guard that sees a bundle edit on every pull request.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FALLBACK = "en";

const SCAFFOLDS = [
  { name: "csharp-api", dir: "scaffolds/csharp-api/App.Api/Locales", required: ["problem.400", "problem.500"] },
  { name: "csharp-wpf", dir: "scaffolds/csharp-wpf/MyApp/Locales", required: ["picker.language", "picker.system"] },
];

// Same pattern as scaffolds/web-vite/tests/locales.test.js.
const CURRENCY = "(?:kr|€|\\$|£|zł|₴|NOK|SEK|DKK|EUR|USD|GBP|PLN|UAH|CHF|ISK)";
const PRICE_PATTERN = new RegExp(`\\d\\s?${CURRENCY}(?!\\p{L})|${CURRENCY}\\s?\\d`, "iu");

function loadBundles(dir) {
  const bundles = {};
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json"))) {
    bundles[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(ROOT, dir, file), "utf8"));
  }
  return bundles;
}

for (const { name, dir, required } of SCAFFOLDS) {
  const bundles = loadBundles(dir);
  const reference = Object.keys(bundles[FALLBACK]).sort();

  test(`${name}: ships en and nb bundles`, () => {
    assert.ok(reference.length > 0, "en.json is empty");
    assert.ok("nb" in bundles, "nb.json missing");
  });

  for (const [lang, bundle] of Object.entries(bundles)) {
    test(`${name}/${lang}.json has exactly the ${FALLBACK} keys`, () => {
      assert.deepEqual(Object.keys(bundle).sort(), reference);
    });

    test(`${name}/${lang}.json is flat with no empty strings`, () => {
      const bad = Object.entries(bundle).filter(([, v]) => typeof v !== "string" || v.trim() === "");
      assert.deepEqual(bad, []);
    });

    test(`${name}/${lang}.json has no hard-coded prices`, () => {
      const prices = Object.entries(bundle).filter(([, v]) => PRICE_PATTERN.test(v));
      assert.deepEqual(prices, []);
    });

    test(`${name}/${lang}.json carries the keys its reader renders`, () => {
      assert.deepEqual(required.filter((key) => !(key in bundle)), []);
    });
  }
}
