import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const LIB = resolve(import.meta.dirname, "..", "libraries", "storyboard");

// Engine/demo files are plain scripts (no modules) — run them in one shared
// vm context, in order, exactly like <script> tags. Top-level const/function
// bindings persist across runs in the same context; the host reads them by
// evaluating an expression in-context (evalIn returns live references).
export function loadScripts(relPaths) {
  const ctx = vm.createContext({ console });
  for (const rel of relPaths) {
    vm.runInContext(readFileSync(resolve(LIB, rel), "utf8"), ctx, { filename: rel });
  }
  return { ctx, evalIn: (expr) => vm.runInContext(expr, ctx) };
}