/* ======================================================================
   tests/guards.test.ts: things that must never appear in the source
   Each guard is a pattern over src/ (or a narrower scope) plus an inline
   fixture that must trip it, so a guard that stops matching fails the
   suite instead of passing quietly. The patterns come from the shadcn
   spec: a Tailwind palette class would paint a colour the design system
   does not own (the bridge resets the palette, so it renders nothing);
   `.dark` never exists (the theme is html[data-theme]); `outline-none`
   leaves forced-colours users without a focus indicator (use
   outline-hidden); `focus-visible:ring` is shadcn's ring where the DS
   draws its own (focus-visible:shadow-ring); dangerouslySetInnerHTML in
   a generated file is a registry change to look at; a stylesheet <link>
   in index.html means the cascade entry is bypassed.
   ====================================================================== */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SOURCE_EXT = new Set([".ts", ".tsx", ".css", ".html"])

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name)
		if (statSync(full).isDirectory()) return walk(full)
		return SOURCE_EXT.has(full.slice(full.lastIndexOf("."))) ? [full] : []
	})
}

interface Guard {
	name: string
	scope: string
	pattern: RegExp
	fixture: string
}

const GUARDS: Guard[] = [
	{
		name: "a Tailwind palette class",
		scope: "src",
		pattern:
			/\b(?:bg|text|border|ring|outline|shadow|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/,
		fixture: 'className="bg-red-500"',
	},
	{
		name: "the string .dark",
		scope: "src",
		pattern: /\.dark\b/,
		fixture: "@custom-variant dark (&:is(.dark *));",
	},
	{
		name: "outline-none",
		scope: "src",
		pattern: /\boutline-none\b/,
		fixture: 'className="outline-none"',
	},
	{
		name: "focus-visible:ring",
		scope: "src",
		pattern: /focus-visible:ring/,
		fixture: 'className="focus-visible:ring-3 focus-visible:ring-ring/50"',
	},
	{
		name: "dangerouslySetInnerHTML in a generated component",
		scope: "src/components/ui",
		pattern: /dangerouslySetInnerHTML/,
		fixture: "<div dangerouslySetInnerHTML={{ __html: html }} />",
	},
	{
		name: "a stylesheet link in index.html",
		scope: "index.html",
		pattern: /<link[^>]*rel="stylesheet"/,
		fixture: '<link rel="stylesheet" href="/src/styles/main.css" />',
	},
]

for (const guard of GUARDS) {
	test(`guard "${guard.name}" trips on its fixture`, () => {
		expect(guard.pattern.test(guard.fixture)).toBe(true)
	})

	test(`no ${guard.name} under ${guard.scope}`, () => {
		const target = join(ROOT, guard.scope)
		const files = statSync(target).isDirectory() ? walk(target) : [target]
		const hits = files
			.filter((file) => guard.pattern.test(readFileSync(file, "utf8")))
			.map((file) => relative(ROOT, file))
		expect(hits).toEqual([])
	})
}
