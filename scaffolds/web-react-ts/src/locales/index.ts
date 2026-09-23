/* ======================================================================
   src/locales/index.ts — UI STRINGS
   One JSON bundle per language, flat "section.key" → string. Every bundle
   carries the same keys (tests/locales.test.ts enforces it), and t() only
   accepts keys they share, so a typo is a type error. To add a language:
   copy en.json, translate every value, register it below.
   ====================================================================== */

import { createTranslator } from "../../i18n/index.js"
import en from "./en.json"
import nb from "./nb.json"

export const bundles = { en, nb }
export const FALLBACK_LANG = "en"

export const i18n = createTranslator(bundles, { fallback: FALLBACK_LANG })

export type Lang = (typeof i18n.languages)[number]
export type MessageKey = Parameters<typeof i18n.t>[1]
