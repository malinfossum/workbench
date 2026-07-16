import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(import.meta.dirname, "..", "index.html"), "utf8");

test("dashboard has one h1 and semantic structure", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok((html.match(/<h2[\s>]/g) || []).length >= 3, "one h2 per tier");
});

test("dashboard has a skip link and no div-click cards", () => {
  assert.match(html, /class="skip-link"/);
  assert.doesNotMatch(html, /<div[^>]*onclick/i);
});

test("dashboard links the key destinations", () => {
  for (const href of [
    "libraries/design-system/gallery/",
    "guide/#web-vite",
    "guide/#csharp-console",
    "guide/#csharp-layered",
    "guide/#csharp-wpf",
    "guide/#csharp-api",
    "docs/",
    "libraries/storyboard/",
  ]) assert.ok(html.includes(href), `missing link: ${href}`);
});

test("storyboard card links to the live demo", () => {
  assert.ok(html.includes('href="./libraries/storyboard/"'), "missing storyboard link");
  assert.doesNotMatch(html, /aria-disabled="true"/);
});

test("no-flash theme init and both-theme support present", () => {
  assert.match(html, /data-theme/);
  assert.match(html, /prefers-reduced-motion|design-system\/theme/);
});
