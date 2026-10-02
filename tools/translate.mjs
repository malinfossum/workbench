// translate.mjs: which UI strings still need a translator's eyes?
//
// Reads <project>/src/locales/en.json as the source and every other
// <tag>.json next to it as a target. A hidden stamps file,
// src/locales/.translated.json, remembers for each language the SHA-256 of
// the English value at the time the translation was written, so a later
// edit to en.json shows up as a stale translation instead of silently
// shipping the old sentence. Spec: docs/specs/2026-10-01-locale-standard.md § 9.
//
//   node tools/translate.mjs <project-dir>                 status (default), exit 1 on findings
//   node tools/translate.mjs <project-dir> --worklist out.json
//   node tools/translate.mjs <project-dir> --stamp

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SOURCE_LANG = "en";
export const STAMPS_FILE = ".translated.json";
// nb is written alongside en and the scaffolds' key-drift test proves it complete,
// so it skips staleness tracking. The identical-value warning still applies.
export const EXEMPT_LANGS = new Set(["nb"]);

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const BUNDLE_NAME = /^([a-z]{2,3})\.json$/;

export function hashValue(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function readJson(path, label) {
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Malformed ${label}: ${e.message}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  for (const key of Object.keys(data)) {
    if (DANGEROUS_KEYS.has(key)) throw new Error(`Refusing ${label} with dangerous key "${key}".`);
  }
  return data;
}

function readBundle(path, label) {
  const data = readJson(path, label);
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string") throw new Error(`${label}: "${key}" is not a string.`);
  }
  return data;
}

export function readProject(projectDir) {
  const localesDir = join(resolve(projectDir), "src", "locales");
  const sourcePath = join(localesDir, `${SOURCE_LANG}.json`);
  if (!existsSync(sourcePath)) {
    throw new Error(`No src/locales/${SOURCE_LANG}.json under ${projectDir}.`);
  }
  const source = readBundle(sourcePath, `${SOURCE_LANG}.json`);

  const targets = {};
  for (const name of readdirSync(localesDir).sort()) {
    const m = BUNDLE_NAME.exec(name);
    if (!m || m[1] === SOURCE_LANG) continue;
    targets[m[1]] = readBundle(join(localesDir, name), name);
  }

  const stampsPath = join(localesDir, STAMPS_FILE);
  let stamps = {};
  if (existsSync(stampsPath)) {
    stamps = readJson(stampsPath, STAMPS_FILE);
    for (const [lang, entry] of Object.entries(stamps)) {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`${STAMPS_FILE}: "${lang}" must be an object of key → hash.`);
      }
      for (const key of Object.keys(entry)) {
        if (DANGEROUS_KEYS.has(key)) throw new Error(`Refusing ${STAMPS_FILE} with dangerous key "${key}".`);
      }
    }
  }

  return { localesDir, stampsPath, source, targets, stamps };
}

const isBlank = (value) => typeof value !== "string" || value.trim() === "";

export function computeStatus({ source, targets, stamps }) {
  const languages = {};
  let hasFindings = false;

  for (const [lang, bundle] of Object.entries(targets)) {
    const report = { missing: [], changed: [], unstamped: [], identical: [] };
    const tracked = !EXEMPT_LANGS.has(lang);
    const langStamps = stamps[lang] ?? {};

    for (const key of Object.keys(source).sort()) {
      const value = bundle[key];
      if (isBlank(value)) {
        if (tracked) report.missing.push(key);
        continue;
      }
      if (value === source[key]) report.identical.push(key);
      if (!tracked) continue;
      const recorded = langStamps[key];
      if (recorded === undefined) report.unstamped.push(key);
      else if (recorded !== hashValue(source[key])) report.changed.push(key);
    }

    if (report.missing.length || report.changed.length || report.unstamped.length) hasFindings = true;
    languages[lang] = report;
  }

  return { languages, hasFindings };
}

export function buildWorklist(status, { source }) {
  const list = {};
  for (const [lang, report] of Object.entries(status.languages)) {
    const keys = [...report.missing, ...report.changed, ...report.unstamped].sort();
    if (!keys.length) continue;
    list[lang] = Object.fromEntries(keys.map((key) => [key, source[key]]));
  }
  return list;
}

export function buildStamps({ source, targets }) {
  const stamps = {};
  for (const [lang, bundle] of Object.entries(targets)) {
    if (EXEMPT_LANGS.has(lang)) continue;
    const entry = {};
    for (const key of Object.keys(source).sort()) {
      if (!isBlank(bundle[key])) entry[key] = hashValue(source[key]);
    }
    stamps[lang] = entry;
  }
  return stamps;
}

const GROUPS = [
  ["missing", "missing"],
  ["changed", "changed since translated"],
  ["unstamped", "never stamped (run --stamp after reviewing)"],
  ["identical", "warning, same as English"],
];

export function formatStatus(status) {
  const lines = [];
  for (const [lang, report] of Object.entries(status.languages)) {
    const total = GROUPS.reduce((n, [group]) => n + report[group].length, 0);
    lines.push(`${lang}: ${total ? "" : "up to date"}`.trimEnd());
    for (const [group, label] of GROUPS) {
      if (!report[group].length) continue;
      lines.push(`  ${label} (${report[group].length}):`);
      for (const key of report[group]) lines.push(`    ${key}`);
    }
  }
  if (!lines.length) lines.push(`no target bundles next to ${SOURCE_LANG}.json`);
  return lines.join("\n");
}

const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, "\t") + "\n");

// ---- CLI ----
function usage() {
  console.error("usage: node tools/translate.mjs <project-dir> [--status | --worklist <out.json> | --stamp]");
  process.exit(1);
}

function main(argv) {
  const positional = [];
  let mode = "status";
  let worklistPath = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--status") mode = "status";
    else if (arg === "--stamp") mode = "stamp";
    else if (arg === "--worklist") {
      mode = "worklist";
      worklistPath = argv[++i];
      if (!worklistPath || worklistPath.startsWith("--")) usage();
    } else if (arg.startsWith("--")) usage();
    else positional.push(arg);
  }
  const [projectDir] = positional;
  if (!projectDir || positional.length > 1) usage();

  let project;
  try {
    project = readProject(projectDir);
  } catch (e) {
    console.error(`translate: ${e.message}`);
    process.exit(1);
  }

  if (mode === "stamp") {
    const stamps = buildStamps(project);
    writeJson(project.stampsPath, stamps);
    const n = Object.values(stamps).reduce((sum, entry) => sum + Object.keys(entry).length, 0);
    console.log(`translate: stamped ${n} translations in ${Object.keys(stamps).length} language(s) → ${project.stampsPath}`);
    return;
  }

  const status = computeStatus(project);
  if (mode === "worklist") {
    const list = buildWorklist(status, project);
    writeJson(resolve(worklistPath), list);
    const n = Object.values(list).reduce((sum, entry) => sum + Object.keys(entry).length, 0);
    console.log(`translate: ${n} string(s) to translate in ${Object.keys(list).length} language(s) → ${worklistPath}`);
    return;
  }

  console.log(formatStatus(status));
  process.exit(status.hasFindings ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
