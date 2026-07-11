import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadManifest, assertWithinRoot, planCopy,
  readCanonicalVersion, anchorRel, readRecordedVersion, writeVersionHeader,
} from "./extract.mjs";
import { readFileSync } from "node:fs";

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

test("readCanonicalVersion trims the VERSION file", () => {
  const dir = fixtureLib();
  assert.equal(readCanonicalVersion(dir, loadManifest(dir)), "1.3.0");
  rmSync(dir, { recursive: true, force: true });
});

test("version header round-trips through the anchor CSS", () => {
  const target = mkdtempSync(join(tmpdir(), "wb-tgt-"));
  mkdirSync(join(target, "tokens"));
  writeFileSync(join(target, "tokens", "index.css"), "/* tokens */\n.a{}");
  const anchor = "tokens/index.css";
  assert.equal(readRecordedVersion(target, anchor), null);
  writeVersionHeader(target, anchor, "design-system", "1.3.0");
  assert.equal(readRecordedVersion(target, anchor), "1.3.0");
  // original content preserved below the header
  assert.match(readFileSync(join(target, "tokens", "index.css"), "utf8"), /\.a\{\}/);
  // re-writing replaces, does not stack, the header
  writeVersionHeader(target, anchor, "design-system", "1.4.0");
  const lines = readFileSync(join(target, "tokens", "index.css"), "utf8").split("\n");
  assert.equal(lines.filter((l) => l.includes("workbench-lib")).length, 1);
  assert.equal(readRecordedVersion(target, anchor), "1.4.0");
  rmSync(target, { recursive: true, force: true });
});
