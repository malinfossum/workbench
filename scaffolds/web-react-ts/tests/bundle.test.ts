/* The layout audit is test-only: build the app and fail if it reached the bundle. */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build } from "vite"
import { afterAll, expect, test } from "vitest"

const outDir = mkdtempSync(join(tmpdir(), "bundle-"))
afterAll(() => rmSync(outDir, { recursive: true, force: true }))

test("the production bundle never ships the layout audit", { timeout: 120_000 }, async () => {
	await build({
		root: join(import.meta.dirname, ".."),
		logLevel: "silent",
		build: { outDir, emptyOutDir: true },
	})
	const files = readdirSync(outDir, { recursive: true, withFileTypes: true }).filter((entry) =>
		entry.isFile()
	)
	expect(files.length).toBeGreaterThan(0)
	for (const file of files) {
		const text = readFileSync(join(file.parentPath, file.name), "utf8")
		expect(text.includes("auditLayout"), `${file.name} carries auditLayout`).toBe(false)
	}
})
