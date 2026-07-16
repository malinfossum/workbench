// tools/csharp-api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAFFOLD = join(ROOT, "scaffolds", "csharp-api");
const read = (p) => readFileSync(join(SCAFFOLD, p), "utf8").replaceAll("\r\n", "\n");

test("scaffold ships every load-bearing file", () => {
  for (const p of [
    "App.slnx", "global.json", ".editorconfig", ".gitignore", ".gitattributes",
    ".config/dotnet-tools.json", "README.md",
    "App.Api/Program.cs", "App.Api/Controllers/NotesController.cs", "App.Api/App.Api.http",
    "App.Core/Models/Note.cs", "App.Core/Dtos/NoteDtos.cs",
    "App.Core/Interfaces/INoteRepository.cs", "App.Core/Services/NoteService.cs",
    "App.Data/AppDbContext.cs", "App.Data/Repositories/NoteRepository.cs",
    "App.Tests/Unit/NoteServiceTests.cs", "App.Tests/Integration/NotesApiTests.cs",
  ]) assert.ok(existsSync(join(SCAFFOLD, p)), `missing ${p}`);
});

test("App.Core stays dependency-free", () => {
  const csproj = read("App.Core/App.Core.csproj");
  assert.doesNotMatch(csproj, /<(Package|Project)Reference/, "App.Core must reference nothing");
});

test("gitignore blocks database files", () => {
  assert.match(read(".gitignore"), /^\*\.db$/m);
});

test("Program stays visible to WebApplicationFactory and never EnsureCreates", () => {
  const program = read("App.Api/Program.cs");
  assert.match(program, /public partial class Program \{ \}/);
  assert.doesNotMatch(program, /EnsureCreated/);
});

test("README pins the exact EF commands with both flags", () => {
  const readme = read("README.md");
  assert.match(readme, /--project <YourName>\.Data --startup-project <YourName>\.Api/);
  assert.match(readme, /user-secrets/);
});

test("SDK pin matches csharp-layered", () => {
  const ours = JSON.parse(read("global.json"));
  const theirs = JSON.parse(readFileSync(join(ROOT, "scaffolds", "csharp-layered", "global.json"), "utf8"));
  assert.deepEqual(ours.sdk, theirs.sdk);
});

test("dashboard and guide surface the scaffold", () => {
  const dashboard = readFileSync(join(ROOT, "index.html"), "utf8");
  const guide = readFileSync(join(ROOT, "guide", "index.html"), "utf8");
  assert.ok(dashboard.includes('guide/#csharp-api'), "dashboard card missing");
  assert.ok(guide.includes('id="csharp-api"'), "guide section missing");
});
