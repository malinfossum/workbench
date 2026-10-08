/* ======================================================================
   tests/tailwind-collisions.test.ts: Tailwind never redefines a DS class
   Tailwind generates a utility for any class name it finds in the source,
   and the utilities layer beats the design-system layer. So a DS class
   whose name Tailwind also knows (text-muted, container, grid, table,
   sr-only) would silently change meaning the moment it is used in a
   component. src/styles/index.css lists those names in
   `@source not inline(...)`. This test compiles the real entry CSS with
   every DS class name as a candidate and fails when Tailwind generates
   any of them, which is how the list stays complete as the DS and the
   bridge grow.
   ====================================================================== */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "@tailwindcss/node"
import { expect, test } from "vitest"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SHIPPED = ["tokens", "base", "primitives", "components", "compositions", "utilities"]
const CLASS = /(?<![\w-])\.([a-zA-Z][\w-]*)/g

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name)
		if (statSync(full).isDirectory()) return walk(full)
		return full.endsWith(".css") ? [full] : []
	})
}

function designSystemClassNames(): string[] {
	const names = new Set<string>()
	for (const dir of SHIPPED) {
		for (const file of walk(join(ROOT, "design-system", dir))) {
			for (const match of readFileSync(file, "utf8").matchAll(CLASS)) names.add(match[1] as string)
		}
	}
	return [...names].sort()
}

// The class selectors inside the utilities layer of a Tailwind build.
function utilityClassNames(css: string): Set<string> {
	const open = css.search(/@layer utilities\s*\{/)
	if (open < 0) return new Set()
	let depth = 0
	let i = css.indexOf("{", open)
	const start = i
	for (; i < css.length; i++) {
		if (css[i] === "{") depth++
		else if (css[i] === "}" && --depth === 0) break
	}
	const names = new Set<string>()
	for (const match of css.slice(start, i).matchAll(CLASS)) names.add(match[1] as string)
	return names
}

test("Tailwind generates none of the design-system class names", async () => {
	const names = designSystemClassNames()
	expect(names.length).toBeGreaterThan(50)

	const entry = resolve(ROOT, "src/styles/index.css")
	const compiler = await compile(readFileSync(entry, "utf8"), {
		base: resolve(ROOT, "src/styles"),
		onDependency: () => {},
	})
	// mt-4 proves the detection: a real utility shows up in the layer.
	const generated = utilityClassNames(compiler.build([...names, "mt-4"]))
	expect(generated.has("mt-4")).toBe(true)

	const collisions = names.filter((name) => generated.has(name))
	expect(collisions, "add these to @source not inline() in src/styles/index.css").toEqual([])
})
