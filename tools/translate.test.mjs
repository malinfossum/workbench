import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hashValue, readProject, computeStatus, buildWorklist, buildStamps, formatStatus } from "./translate.mjs";

const TOOL = fileURLToPath(new URL("./translate.mjs", import.meta.url));
const WEB_VITE = fileURLToPath(new URL("../scaffolds/web-vite", import.meta.url));

function project(bundles, stamps) {
  const dir = mkdtempSync(join(tmpdir(), "wb-translate-"));
  const locales = join(dir, "src", "locales");
  mkdirSync(locales, { recursive: true });
  for (const [lang, data] of Object.entries(bundles)) {
    writeFileSync(join(locales, `${lang}.json`), JSON.stringify(data, null, "\t") + "\n");
  }
  if (stamps) writeFileSync(join(locales, ".translated.json"), JSON.stringify(stamps, null, "\t") + "\n");
  return dir;
}

const EN = { "app.title": "Project", "app.tagline": "A starter", "ok": "OK" };
const stamped = (data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, hashValue(v)]));
const EMPTY = { missing: [], changed: [], unstamped: [], identical: [] };

test("hashValue is SHA-256 hex of the English value", () => {
  assert.match(hashValue("OK"), /^[0-9a-f]{64}$/);
  assert.equal(hashValue("OK"), hashValue("OK"));
  assert.notEqual(hashValue("OK"), hashValue("Ok"));
});

test("a key missing from a target is listed and counts as a finding", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "ok": "Okej" } },
    { sv: stamped({ "app.title": "Project", "ok": "OK" }) });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv, { ...EMPTY, missing: ["app.tagline"] });
  assert.equal(status.hasFindings, true);
});

test("an empty target value counts as missing", () => {
  const dir = project({ en: EN, sv: { "app.title": "  ", "app.tagline": "En start", "ok": "Okej" } },
    { sv: stamped(EN) });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv.missing, ["app.title"]);
});

test("a key whose English source changed since it was stamped is listed", () => {
  const dir = project({ en: { ...EN, "app.tagline": "A better starter" }, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej" } },
    { sv: stamped(EN) });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv, { ...EMPTY, changed: ["app.tagline"] });
  assert.equal(status.hasFindings, true);
});

test("an unchanged, stamped, translated key is silent", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej" } },
    { sv: stamped(EN) });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv, EMPTY);
  assert.equal(status.hasFindings, false);
});

test("a translated key with no stamp is listed as unstamped and counts as a finding", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej" } });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv, { ...EMPTY, unstamped: ["app.tagline", "app.title", "ok"] });
  assert.equal(status.hasFindings, true);
});

test("a value identical to the English one is a warning, not a finding", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "OK" } },
    { sv: stamped(EN) });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.sv, { ...EMPTY, identical: ["ok"] });
  assert.equal(status.hasFindings, false);
});

test("nb is exempt from missing, changed and unstamped, but still gets the identical warning", () => {
  const dir = project({ en: EN, nb: { "app.title": "Prosjekt", "ok": "OK" } });
  const status = computeStatus(readProject(dir));
  assert.deepEqual(status.languages.nb, { ...EMPTY, identical: ["ok"] });
  assert.equal(status.hasFindings, false);
});

test("the worklist holds the English value for every missing, changed and unstamped key", () => {
  const dir = project({
    en: { ...EN, "app.tagline": "A better starter" },
    sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej" },
    nb: { "app.title": "Prosjekt" },
  }, { sv: { "app.title": hashValue("Project"), "app.tagline": hashValue("A starter") } });
  const p = readProject(dir);
  const list = buildWorklist(computeStatus(p), p);
  assert.deepEqual(list, { sv: { "app.tagline": "A better starter", "ok": "OK" } });
});

test("buildStamps records a hash for every non-empty target value and skips exempt languages", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "", "ok": "Okej" }, nb: { "app.title": "Prosjekt" } });
  const stamps = buildStamps(readProject(dir));
  assert.deepEqual(stamps, { sv: { "app.title": hashValue("Project"), "ok": hashValue("OK") } });
});

test("buildStamps drops stamps for keys that left the English bundle", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej", "gone": "Borta" } },
    { sv: { gone: hashValue("Gone") } });
  const stamps = buildStamps(readProject(dir));
  assert.equal("gone" in stamps.sv, false);
});

test("formatStatus names the language, the group and the key", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "ok": "OK" } }, { sv: stamped({ "app.title": "Project", "ok": "OK" }) });
  const text = formatStatus(computeStatus(readProject(dir)));
  assert.match(text, /sv/);
  assert.match(text, /missing \(1\)/);
  assert.match(text, /app\.tagline/);
  assert.match(text, /same as English \(1\)/);
});

test("readProject refuses a project without src/locales/en.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "wb-translate-empty-"));
  assert.throws(() => readProject(dir), /en\.json/);
});

test("readProject ignores non-bundle files and the stamps file", () => {
  const dir = project({ en: EN, sv: { ...EN } }, { sv: stamped(EN) });
  writeFileSync(join(dir, "src", "locales", "index.js"), "export const bundles = {}\n");
  const p = readProject(dir);
  assert.deepEqual(Object.keys(p.targets).sort(), ["sv"]);
});

test("readProject refuses a bundle with a dangerous key", () => {
  const dir = project({ en: EN });
  writeFileSync(join(dir, "src", "locales", "sv.json"), '{ "__proto__": "x", "ok": "Okej" }\n');
  assert.throws(() => readProject(dir), /__proto__/);
});

test("CLI: --status exits 1 on findings and 0 on warnings only", () => {
  const red = project({ en: EN, sv: { "app.title": "Projekt", "ok": "Okej" } }, { sv: stamped({ "app.title": "Project", "ok": "OK" }) });
  const r1 = spawnSync(process.execPath, [TOOL, red, "--status"], { encoding: "utf8" });
  assert.equal(r1.status, 1, r1.stdout + r1.stderr);
  assert.match(r1.stdout, /app\.tagline/);

  const amber = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "OK" } }, { sv: stamped(EN) });
  const r2 = spawnSync(process.execPath, [TOOL, amber], { encoding: "utf8" });
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout, /same as English/);
});

test("CLI: --worklist writes the JSON file", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "ok": "Okej" } }, { sv: stamped({ "app.title": "Project", "ok": "OK" }) });
  const out = join(dir, "work.json");
  execFileSync(process.execPath, [TOOL, dir, "--worklist", out], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), { sv: { "app.tagline": "A starter" } });
});

test("CLI: --stamp writes .translated.json and a following --status is green", () => {
  const dir = project({ en: EN, sv: { "app.title": "Projekt", "app.tagline": "En start", "ok": "Okej" } });
  const before = spawnSync(process.execPath, [TOOL, dir], { encoding: "utf8" });
  assert.equal(before.status, 1);
  execFileSync(process.execPath, [TOOL, dir, "--stamp"], { encoding: "utf8" });
  const stampsPath = join(dir, "src", "locales", ".translated.json");
  assert.ok(existsSync(stampsPath));
  const stamps = JSON.parse(readFileSync(stampsPath, "utf8"));
  assert.equal(stamps.sv["app.title"], hashValue("Project"));
  assert.ok(readFileSync(stampsPath, "utf8").endsWith("}\n"));
  const after = spawnSync(process.execPath, [TOOL, dir], { encoding: "utf8" });
  assert.equal(after.status, 0, after.stdout + after.stderr);
});

test("CLI: usage error without a project dir, and on a worklist flag without a path", () => {
  const r = spawnSync(process.execPath, [TOOL], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage/);
  const r2 = spawnSync(process.execPath, [TOOL, tmpdir(), "--worklist"], { encoding: "utf8" });
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /usage/);
});

test("acceptance: web-vite copy with sv added and one key removed names the key", () => {
  const dir = mkdtempSync(join(tmpdir(), "wb-translate-vite-"));
  cpSync(join(WEB_VITE, "src", "locales"), join(dir, "src", "locales"), { recursive: true });
  const en = JSON.parse(readFileSync(join(dir, "src", "locales", "en.json"), "utf8"));
  const sv = { ...en, "app.title": "Projekt" };
  delete sv["picker.currency"];
  writeFileSync(join(dir, "src", "locales", "sv.json"), JSON.stringify(sv, null, "\t") + "\n");
  const stamps = { sv: Object.fromEntries(Object.keys(sv).map((k) => [k, hashValue(en[k])])) };
  writeFileSync(join(dir, "src", "locales", ".translated.json"), JSON.stringify(stamps, null, "\t") + "\n");
  const r = spawnSync(process.execPath, [TOOL, dir], { encoding: "utf8" });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /sv[\s\S]*missing \(1\)[\s\S]*picker\.currency/);
  rmSync(dir, { recursive: true, force: true });
});
