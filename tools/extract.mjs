import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";

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
  return files;
}
