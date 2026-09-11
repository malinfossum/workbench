import { test } from "node:test";
import assert from "node:assert/strict";
import { createTranslator } from "../libraries/i18n/index.js";

const bundles = {
  en: {
    "app.title": "Timer",
    "greeting": "Hi, {name}",
    "items.one": "{count} item",
    "items.other": "{count} items",
    "only.en": "English only",
  },
  nb: {
    "app.title": "Tidtaker",
    "greeting": "Hei, {name}",
    "items.one": "{count} element",
    "items.other": "{count} elementer",
  },
  uk: {
    "items.one": "{count} елемент",
    "items.few": "{count} елементи",
    "items.many": "{count} елементів",
  },
};

const i18n = createTranslator(bundles);

test("t looks up the active language", () => {
  assert.equal(i18n.t("nb", "app.title"), "Tidtaker");
  assert.equal(i18n.t("en", "app.title"), "Timer");
});

test("t interpolates {vars} and leaves unknown placeholders visible", () => {
  assert.equal(i18n.t("nb", "greeting", { name: "Malin" }), "Hei, Malin");
  assert.equal(i18n.t("en", "greeting"), "Hi, {name}");
});

test("t falls back to the fallback bundle, then to the key", () => {
  assert.equal(i18n.t("nb", "only.en"), "English only");
  assert.equal(i18n.t("nb", "does.not.exist"), "does.not.exist");
});

test("plural picks the form by the language's own rules", () => {
  assert.equal(i18n.plural("en", "items", 1), "1 item");
  assert.equal(i18n.plural("en", "items", 5), "5 items");
  assert.equal(i18n.plural("nb", "items", 0), "0 elementer");
  assert.equal(i18n.plural("uk", "items", 1), "1 елемент");
  assert.equal(i18n.plural("uk", "items", 3), "3 елементи");
  assert.equal(i18n.plural("uk", "items", 11), "11 елементів");
});

test("plural falls back to .other when a form is missing", () => {
  // uk has no items.other; 0.5 selects "other" in Ukrainian → fallback bundle's other
  assert.equal(i18n.plural("uk", "items", 0.5), "0.5 items");
});

test("resolveLang maps region tags and case, skips unknowns, ends at fallback", () => {
  assert.equal(i18n.resolveLang("nb-NO"), "nb");
  assert.equal(i18n.resolveLang("EN"), "en");
  assert.equal(i18n.resolveLang(null, "de-AT", "nb"), "nb");
  assert.equal(i18n.resolveLang("de", undefined), "en");
});

test("languages lists every bundle; a fallback without a bundle throws", () => {
  assert.deepEqual(i18n.languages, ["en", "nb", "uk"]);
  assert.throws(() => createTranslator({ nb: {} }, { fallback: "en" }), /no bundle/);
});
