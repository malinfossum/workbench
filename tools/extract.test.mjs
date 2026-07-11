import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifest, assertWithinRoot, planCopy } from "./extract.mjs";

function fixtureLib() {
  const dir = mkdtempSync(join(tmpdir(), "wb-lib-"));
  mkdirSync(join(dir, "tokens"));
  writeFileSync(join(dir, "tokens", "index.css"), "/* tokens */");
  mkdirSync(join(dir, "gallery"));
  writeFileSync(join(dir, "gallery", "index.html"), "<x>");
  writeFileSync(join(dir, "VERSION"), "1.3.0\n");
  writeFileSync(join(dir, "extract.json"), JSON.stringify({
    versionFile: "VERSION", include: ["tokens", "gallery"], exclude: ["gallery"],
  }));
  return dir;
}

test("loadManifest reads a valid manifest", () => {
  const dir = fixtureLib();
  const m = loadManifest(dir);
  assert.equal(m.versionFile, "VERSION");
  assert.deepEqual(m.include, ["tokens", "gallery"]);
  rmSync(dir, { recursive: true, force: true });
});

test("loadManifest throws when manifest is missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "wb-nom-"));
  assert.throws(() => loadManifest(dir), /No extract\.json/);
  rmSync(dir, { recursive: true, force: true });
});

test("loadManifest rejects dangerous keys", () => {
  const dir = mkdtempSync(join(tmpdir(), "wb-proto-"));
  writeFileSync(join(dir, "extract.json"), '{"__proto__":{"x":1},"include":["a"]}');
  assert.throws(() => loadManifest(dir), /dangerous key/);
  rmSync(dir, { recursive: true, force: true });
});

test("assertWithinRoot rejects escapes", () => {
  assert.throws(() => assertWithinRoot("/a/b", "../../etc"), /escapes/);
  assert.equal(assertWithinRoot("/a/b", "tokens").endsWith("tokens"), true);
});

test("planCopy includes tokens, excludes gallery", () => {
  const dir = fixtureLib();
  const files = planCopy(dir, loadManifest(dir));
  assert.deepEqual(files, [join("tokens", "index.css")]);
  rmSync(dir, { recursive: true, force: true });
});
