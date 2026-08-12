import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, cpSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function loadManifest(libraryDir) {
  const manifestPath = join(libraryDir, "extract.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`No extract.json in ${libraryDir} — refusing to copy.`);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    throw new Error(`Malformed extract.json in ${libraryDir}: ${e.message}`);
  }
  for (const key of Object.keys(data)) {
    if (DANGEROUS_KEYS.has(key)) throw new Error(`Refusing manifest with dangerous key "${key}".`);
  }
  const include = Array.isArray(data.include) ? data.include : null;
  if (!include || include.length === 0) {
    throw new Error(`extract.json in ${libraryDir} needs a non-empty "include" array.`);
  }
  return {
    versionFile: typeof data.versionFile === "string" ? data.versionFile : "VERSION",
    include,
    exclude: Array.isArray(data.exclude) ? data.exclude : [],
  };
}

export function assertWithinRoot(root, entry) {
  const abs = resolve(root, entry);
  const rel = relative(resolve(root), abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path "${entry}" escapes ${root} — refusing.`);
  }
  return abs;
}

function walkFiles(absDir, base) {
  const out = [];
  for (const name of readdirSync(absDir)) {
    const abs = join(absDir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs, base));
    else out.push(relative(base, abs));
  }
  return out;
}

export function planCopy(libraryDir, manifest) {
  const exclude = new Set(manifest.exclude);
  const files = [];
  for (const entry of manifest.include) {
    if (exclude.has(entry)) continue;
    const abs = assertWithinRoot(libraryDir, entry);
    if (!existsSync(abs)) continue;
    if (statSync(abs).isDirectory()) {
      for (const rel of walkFiles(abs, libraryDir)) files.push(rel);
    } else {
      files.push(entry);
    }
  }
  // The version file always travels with the copy so the consumer tree is self-describing (#8).
  const vf = manifest.versionFile;
  if (existsSync(assertWithinRoot(libraryDir, vf)) && !files.includes(vf)) files.push(vf);
  return files;
}

export function readCanonicalVersion(libraryDir, manifest) {
  return readFileSync(assertWithinRoot(libraryDir, manifest.versionFile), "utf8").trim();
}

export function anchorRel(manifest) {
  return join(manifest.include[0], "index.css");
}

const HEADER_LINE_RE = /^\/\* workbench-lib:.*\*\/\r?\n?/;
const HEADER_READ_RE = /^\/\* workbench-lib:\s*\S+\s+v(\S+?)\s*(?:—|-).*\*\//;

export function readRecordedVersion(targetLibDir, anchor) {
  const file = join(targetLibDir, anchor);
  if (!existsSync(file)) return null;
  const firstLine = readFileSync(file, "utf8").split("\n", 1)[0];
  const m = firstLine.match(HEADER_READ_RE);
  return m ? m[1] : null;
}

export function writeVersionHeader(targetLibDir, anchor, libraryName, version) {
  const file = join(targetLibDir, anchor);
  const header = `/* workbench-lib: ${libraryName} v${version} — extracted; edit in the workbench, not here */`;
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  writeFileSync(file, `${header}\n${existing.replace(HEADER_LINE_RE, "")}`);
}

// Text compares must ignore CRLF/LF: a Windows working tree can hold CRLF for a
// file git stores as LF, and that is not content drift. Binary stays byte-exact.
const TEXT_FILE_RE = /\.(css|js|mjs|html|md|json|txt)$/i;

function normalizeEol(buffer) {
  return buffer.toString("utf8").replaceAll("\r\n", "\n");
}

function filesDiffer(a, b) {
  if (!existsSync(a) || !existsSync(b)) return true;
  const bufA = readFileSync(a);
  const bufB = readFileSync(b);
  if (TEXT_FILE_RE.test(a)) return normalizeEol(bufA) !== normalizeEol(bufB);
  return !bufA.equals(bufB);
}

// Files whose target copy differs from canonical (anchor compared without its version header).
function findDrift(libraryDir, targetLibDir, manifest, anchor, { requirePresent = false } = {}) {
  return planCopy(libraryDir, manifest).filter((rel) => {
    const targetFile = join(targetLibDir, rel);
    if (!existsSync(targetFile)) return requirePresent;
    if (rel === anchor) {
      // the anchor legitimately carries the version header — compare without it
      const src = normalizeEol(readFileSync(join(libraryDir, rel)));
      const tgt = normalizeEol(readFileSync(targetFile)).replace(HEADER_LINE_RE, "");
      return src !== tgt;
    }
    return filesDiffer(join(libraryDir, rel), targetFile);
  });
}

function doCopy(libraryDir, targetLibDir, manifest) {
  const exclude = new Set(manifest.exclude);
  mkdirSync(targetLibDir, { recursive: true });
  for (const entry of manifest.include) {
    if (exclude.has(entry)) continue;
    const src = assertWithinRoot(libraryDir, entry);
    if (!existsSync(src)) continue;
    cpSync(src, join(targetLibDir, entry), { recursive: true });
  }
  const vf = assertWithinRoot(libraryDir, manifest.versionFile);
  if (existsSync(vf)) cpSync(vf, join(targetLibDir, manifest.versionFile));
}

export function extract({ libraryName, workbenchRoot, targetDir, check = false, force = false }) {
  const librariesDir = assertWithinRoot(workbenchRoot, "libraries");
  const libraryDir = assertWithinRoot(librariesDir, libraryName); // rejects "../x"
  if (!existsSync(libraryDir)) throw new Error(`Unknown library "${libraryName}".`);

  const manifest = loadManifest(libraryDir);
  const canonical = readCanonicalVersion(libraryDir, manifest);
  const anchor = anchorRel(manifest);
  const targetLibDir = join(resolve(targetDir), libraryName);
  const recorded = readRecordedVersion(targetLibDir, anchor);

  if (check) {
    if (recorded !== canonical) return { status: "stale", canonical, recorded };
    // Same version string can still hide content drift — compare the files themselves.
    const conflicts = findDrift(libraryDir, targetLibDir, manifest, anchor, { requirePresent: true });
    if (conflicts.length) return { status: "drifted", canonical, recorded, conflicts };
    return { status: "current", canonical, recorded };
  }

  if (!existsSync(targetLibDir)) {
    doCopy(libraryDir, targetLibDir, manifest);
    writeVersionHeader(targetLibDir, anchor, libraryName, canonical);
    return { status: "copied-fresh", canonical, files: planCopy(libraryDir, manifest) };
  }

  if (recorded === canonical && !force) {
    const conflicts = findDrift(libraryDir, targetLibDir, manifest, anchor);
    if (conflicts.length) return { status: "halted-modified", canonical, conflicts };
    return { status: "noop", canonical };
  }

  if (recorded === null && readdirSync(targetLibDir).length && !force) {
    return { status: "halted-unknown", canonical };
  }

  doCopy(libraryDir, targetLibDir, manifest);
  writeVersionHeader(targetLibDir, anchor, libraryName, canonical);
  return { status: "synced", canonical, recorded, files: planCopy(libraryDir, manifest) };
}

// ---- CLI ----
function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const [library, target] = argv.filter((a) => !a.startsWith("--"));
  if (!library || !target) {
    console.error("usage: node tools/extract.mjs <library> <target-dir> [--check] [--force]");
    process.exit(1);
  }
  const workbenchRoot = fileURLToPath(new URL("..", import.meta.url));
  let r;
  try {
    r = extract({ libraryName: library, workbenchRoot, targetDir: target,
                  check: flags.has("--check"), force: flags.has("--force") });
  } catch (e) {
    console.error(`extract: ${e.message}`);
    process.exit(1);
  }
  const okStatuses = new Set(["current", "copied-fresh", "noop", "synced"]);
  console.log(`extract: ${library} → ${target}  [${r.status}${r.canonical ? " v" + r.canonical : ""}]`);
  if (r.conflicts?.length) {
    const hint = r.status === "drifted" ? "content drift within the same version (re-run extract to sync)" : "locally-modified files (pass --force to overwrite)";
    console.error(`${hint}:\n  ` + r.conflicts.join("\n  "));
  }
  process.exit(okStatuses.has(r.status) ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
