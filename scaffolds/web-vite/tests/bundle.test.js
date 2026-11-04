/* The layout audit is test-only: build the app and fail if it reached the bundle. */
import assert from "node:assert/strict"
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { after, test } from "node:test"
import { build } from "vite"

const outDir = mkdtempSync(join(tmpdir(), "bundle-"))
after(() => rmSync(outDir, { recursive: true, force: true }))

test("the production bundle never ships the layout audit", { timeout: 120_000 }, async () => {
	await build({
		root: resolve(import.meta.dirname, ".."),
		logLevel: "silent",
		build: { outDir, emptyOutDir: true },
	})
	const files = readdirSync(outDir, { recursive: true, withFileTypes: true }).filter((entry) =>
		entry.isFile()
	)
	assert.ok(files.length > 0)
	for (const file of files) {
		assert.ok(
			!readFileSync(join(file.parentPath, file.name), "utf8").includes("auditLayout"),
			`${file.name} carries auditLayout`
		)
	}
})
