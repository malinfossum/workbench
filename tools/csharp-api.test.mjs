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
    "App.Api/Localization/JsonStringLocalizer.cs", "App.Api/Localization/AliasRequestCultureProvider.cs",
    "App.Api/Locales/en.json", "App.Api/Locales/nb.json",
    "App.Tests/Unit/JsonStringLocalizerTests.cs", "App.Tests/Integration/LocalizationTests.cs",
    "CLAUDE.md", "App.Core/Authorization/Policy.cs",
    "App.Core/Interfaces/ICurrentUser.cs", "App.Core/Interfaces/ITenantProvider.cs",
    "App.Core/Models/NoteMember.cs", "App.Data/AuthEntities.cs",
    "App.Api/Auth/Sessions.cs", "App.Api/Auth/Context.cs", "App.Api/Auth/Passwords.cs",
    "App.Api/Auth/Tokens.cs", "App.Api/Auth/AccountService.cs", "App.Api/Auth/DevFileAuthEmail.cs",
    "App.Api/Auth/StartupGuard.cs", "App.Api/Auth/Http/AuthEndpoints.cs",
    "App.Api/Auth/Http/AppEndpoints.cs", "App.Api/Auth/Http/Web.cs",
    "App.Api/wwwroot/passkeys.js", "App.Api/DevPages/index.html", "App.Api/DevPages/auth-check.js",
    "App.Api/appsettings.Development.json",
    "App.Tests/Auth/TestUsers.cs", "App.Tests/Auth/TestDb.cs", "App.Tests/Auth/TestApp.cs",
    "App.Tests/Auth/MatrixTests.cs", "App.Tests/Auth/AgreementTests.cs", "App.Tests/Auth/GuardTests.cs",
    "App.Tests/Auth/HttpTests.cs", "App.Tests/Auth/ConfigTests.cs", "App.Tests/Auth/PrivacyTests.cs",
    "App.Tests/Auth/CopyTests.cs", "App.Tests/Auth/DevTests.cs",
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

test("scaffold CLAUDE.md carries the auth skill line", () => {
  assert.match(read("CLAUDE.md"), /Permissions live in `App\.Core\/Authorization\/`\. Follow the loadout `auth` skill; never check a role outside that folder\./);
});

test("README names the recipe it was synced from, and the pins match it", () => {
  const sync = read("README.md").match(/Synced from loadout auth v(\d+\.\d+\.\d+), recipe verified (\d{2}\.\d{2}\.\d{4}) on packages (\d+\.\d+\.\d+)/);
  assert.ok(sync, "sync line missing");
  const version = sync[3].replaceAll(".", "\\.");
  for (const [file, pkg] of [
    ["App.Data/App.Data.csproj", "Microsoft.AspNetCore.Identity.EntityFrameworkCore"],
    ["App.Data/App.Data.csproj", "Microsoft.EntityFrameworkCore.Sqlite"],
    ["App.Api/App.Api.csproj", "Microsoft.EntityFrameworkCore.Design"],
    ["App.Tests/App.Tests.csproj", "Microsoft.AspNetCore.Mvc.Testing"],
  ]) assert.match(read(file), new RegExp(`Include="${pkg.replaceAll(".", "\\.")}" Version="${version}"`), `${pkg} is not on ${sync[3]}`);
  const tool = JSON.parse(read(".config/dotnet-tools.json")).tools["dotnet-ef"];
  assert.equal(tool.version, sync[3], "dotnet-ef is not on the sync-line version");
});

test("gitignore keeps keys and the dev mailbox out", () => {
  const gitignore = read(".gitignore");
  assert.match(gitignore, /^keys\/$/m);
  assert.match(gitignore, /^\.dev-mail\/$/m);
});
