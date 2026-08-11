import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadManifest, assertWithinRoot, planCopy,
  readCanonicalVersion, anchorRel, readRecordedVersion, writeVersionHeader,
  extract,
} from "./extract.mjs";
import { readFileSync, existsSync as exists } from "node:fs";

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

test("planCopy includes tokens and the version file, excludes gallery", () => {
  const dir = fixtureLib();
  const files = planCopy(dir, loadManifest(dir));
  assert.deepEqual(files, [join("tokens", "index.css"), "VERSION"]);
  rmSync(dir, { recursive: true, force: true });
});

// Build a fixture workbench with libraries/design-system + a fresh target dir.
function fixtureWorkbench() {
  const root = mkdtempSync(join(tmpdir(), "wb-root-"));
  const lib = join(root, "libraries", "design-system");
  mkdirSync(join(lib, "tokens"), { recursive: true });
  writeFileSync(join(lib, "tokens", "index.css"), "/* tokens */\n.t{}");
  mkdirSync(join(lib, "gallery"), { recursive: true });
  writeFileSync(join(lib, "gallery", "index.html"), "<x>");
  writeFileSync(join(lib, "VERSION"), "1.3.0\n");
  writeFileSync(join(lib, "extract.json"), JSON.stringify({
    versionFile: "VERSION", include: ["tokens", "gallery"], exclude: ["gallery"],
  }));
  const target = mkdtempSync(join(tmpdir(), "wb-consumer-"));
  return { root, target };
}

test("extract copies lean parts and records version, excludes gallery", () => {
  const { root, target } = fixtureWorkbench();
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  assert.equal(r.status, "copied-fresh");
  assert.ok(exists(join(target, "design-system", "tokens", "index.css")));
  assert.ok(!exists(join(target, "design-system", "gallery")));
  assert.equal(r.canonical, "1.3.0");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("extract copies the VERSION file so the consumer tree is self-describing", () => {
  const { root, target } = fixtureWorkbench();
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  const copied = join(target, "design-system", "VERSION");
  assert.ok(exists(copied), "VERSION should be copied into the consumer");
  assert.equal(readFileSync(copied, "utf8").trim(), "1.3.0");
  assert.ok(r.files.includes("VERSION"), "planCopy should list the version file");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("second run is a noop when up to date", () => {
  const { root, target } = fixtureWorkbench();
  extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  assert.equal(r.status, "noop");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("--check reports stale when target is behind", () => {
  const { root, target } = fixtureWorkbench();
  extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  writeFileSync(join(root, "libraries", "design-system", "VERSION"), "1.4.0\n");
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target, check: true });
  assert.equal(r.status, "stale");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("--check reports drifted when contents differ within the same version", () => {
  const { root, target } = fixtureWorkbench();
  extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  writeFileSync(join(target, "design-system", "tokens", "index.css"), "/* workbench-lib: design-system v1.3.0 — x */\n.DRIFT{}");
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target, check: true });
  assert.equal(r.status, "drifted");
  assert.deepEqual(r.conflicts, [join("tokens", "index.css")]);
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("--check reports current when contents match", () => {
  const { root, target } = fixtureWorkbench();
  extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  const r = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target, check: true });
  assert.equal(r.status, "current");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("halts on a locally-modified up-to-date copy, --force overrides", () => {
  const { root, target } = fixtureWorkbench();
  extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  writeFileSync(join(target, "design-system", "tokens", "index.css"), "/* workbench-lib: design-system v1.3.0 — x */\n.HAND_EDIT{}");
  const halted = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target });
  assert.equal(halted.status, "halted-modified");
  assert.ok(halted.conflicts.length >= 1);
  const forced = extract({ libraryName: "design-system", workbenchRoot: root, targetDir: target, force: true });
  assert.equal(forced.status, "synced");
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
});

test("unknown library is a hard error", () => {
  const { root, target } = fixtureWorkbench();
  assert.throws(() => extract({ libraryName: "nope", workbenchRoot: root, targetDir: target }), /Unknown library/);
  rmSync(root, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true });
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
