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

test("resolveLang takes arrays in priority order, like navigator.languages", () => {
  assert.equal(i18n.resolveLang(["en-GB", "nb"]), "en");
  assert.equal(i18n.resolveLang(["xx", "nb-NO", "en"]), "nb");
  assert.equal(i18n.resolveLang(null, ["de-AT"], "uk"), "uk");
  assert.equal(i18n.resolveLang([]), "en");
});

test("resolveLang maps no and nn to nb by default", () => {
  assert.equal(i18n.resolveLang("no"), "nb");
  assert.equal(i18n.resolveLang("nn-NO"), "nb");
  assert.equal(i18n.resolveLang(["nn", "en"]), "nb");
});

test("resolveLang skips an alias when the plain tag has its own bundle", () => {
  const withNynorsk = createTranslator({ en: {}, nb: {}, nn: {} });
  assert.equal(withNynorsk.resolveLang("nn"), "nn");
  assert.equal(withNynorsk.resolveLang("no"), "nb");
});

test("resolveLang skips an alias whose target has no bundle", () => {
  const englishOnly = createTranslator({ en: {} });
  assert.equal(englishOnly.resolveLang("no", "en"), "en");
});

test("a project can extend or override the default aliases", () => {
  const custom = createTranslator({ en: {}, nb: {}, sv: {} }, { aliases: { da: "sv", no: "en" } });
  assert.equal(custom.resolveLang("da-DK"), "sv");
  assert.equal(custom.resolveLang("no"), "en");
  assert.equal(custom.resolveLang("nn"), "nb"); // the default survives an extension
});

test("displayName returns the autonym with an upper-cased first letter", () => {
  assert.equal(i18n.displayName("nb"), "Norsk bokmål");
  assert.equal(i18n.displayName("en"), "English");
  assert.equal(i18n.displayName("uk"), "Українська");
});

test("displayName can name a language in another language", () => {
  assert.equal(i18n.displayName("nb", "en"), "Norwegian Bokmål");
});

// Intl separates the amount and the symbol with a no-break space (U+00A0),
// so the spec's "949,00 kr" is this string, not one with a plain space.
test("money formats by the language's rules with the full symbol, never narrowSymbol", () => {
  assert.equal(i18n.money("nb", 949, "NOK"), "949,00 kr");
  assert.equal(i18n.money("en", 949, "NOK"), "NOK 949.00");
  assert.equal(i18n.money("nb", 949, "SEK"), "949,00 SEK");
});

test("languages lists every bundle; a fallback without a bundle throws", () => {
  assert.deepEqual(i18n.languages, ["en", "nb", "uk"]);
  assert.throws(() => createTranslator({ nb: {} }, { fallback: "en" }), /no bundle/);
});

test("money drops .00 from a whole amount with stripWhole, and keeps a real fraction", () => {
  assert.equal(i18n.money("nb", 949, "NOK", { stripWhole: true }), "949 kr");
  assert.equal(i18n.money("nb", 949.5, "NOK", { stripWhole: true }), "949,50 kr");
  assert.equal(i18n.money("en", 949, "NOK", { stripWhole: true }), "NOK 949");
});

test("money without options still shows the fraction digits", () => {
  assert.equal(i18n.money("nb", 949, "NOK", {}), "949,00 kr");
});
