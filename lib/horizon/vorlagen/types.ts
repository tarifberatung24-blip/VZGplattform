/**
 * The shape of a public letter template ("Vorlage").
 *
 * These are the letters a reader needs after finishing a guide page: the
 * Mängelanzeige the landlord is owed, the Arbeitszeugnis the employer must write,
 * the Urlaubsantrag, the Widerspruch against a Bescheid. A competitor offers the
 * same letters as blank PDFs to download; a blank form leaves the reader to
 * invent the wording, in German, alone. Here the reader answers a few questions
 * and gets the letter already written, with their own data in it.
 *
 * Two rules carry over from the Kündigung module, because both letters leave the
 * user's hands and reach someone with authority over them:
 *
 * 1. A builder is deterministic. The same facts produce the same bytes, so a
 *    preview can be trusted to equal the download.
 * 2. A builder never invents a value. Where a fact is absent the sentence that
 *    would have carried it is dropped, and the key is reported in
 *    `omittedFactKeys` so the page can say what is missing rather than print a
 *    plausible-looking placeholder the user might post by accident.
 */

import type { Locale } from "@/lib/i18n/dictionaries"

export type VorlageFieldKind = "text" | "date" | "multiline"

/**
 * One question on the form, and one slot in the letter.
 *
 * `required` drives the form's validation, not the builder's behaviour: a builder
 * still omits an absent required fact rather than printing an empty label. The
 * distinction matters because a half-filled letter is more useful to the reader
 * than no letter, as long as the gap is visible.
 */
export type VorlageField = {
  key: string
  kind: VorlageFieldKind
  required: boolean
  label: Record<Locale, string>
  /** Where the value ends up, so the reader knows why it is asked for. */
  hint?: Record<Locale, string>
  placeholder?: Record<Locale, string>
}

export type VorlageFaq = { question: string; answer: string }

export type VorlageContent = {
  /** Used as the page `h1` and the metadata title. */
  title: string
  /** Used as the meta description, so it must read as a complete sentence. */
  summary: string
  intro: string
  /** Situations in which this letter is the right instrument. */
  useWhen: string[]
  /** What the letter does not do, and what the reader must still check. */
  caveats: string[]
  faq: VorlageFaq[]
}

/** The facts a builder reads: a flat map of field key to value or null. */
export type VorlageFacts = Record<string, string | null>

export type VorlageLetter = {
  subject: string
  body: string
  /** The addressee, from the reader's own input only. */
  recipient: string | null
  /** Keys the reader left empty, in the order the letter would have used them. */
  omittedFactKeys: readonly string[]
}

export type VorlageCategoryId = "housing" | "work" | "authority"

export type VorlageCategory = {
  id: VorlageCategoryId
  title: Record<Locale, string>
  intro: Record<Locale, string>
}

export type VorlageSource = { label: string; url: string }

export type VorlageTemplate = {
  slug: string
  category: VorlageCategoryId
  /** The German name of the letter, shown untranslated because that is what it is called. */
  germanName: string
  fields: readonly VorlageField[]
  content: Record<Locale, VorlageContent>
  keywords: Record<Locale, string[]>
  /** Where the reader can read the rule the letter relies on. */
  sources: readonly VorlageSource[]
  /**
   * Builds the German letter from the facts. Pure: no clock, no I/O, no model, so
   * the browser preview and any server render produce identical text.
   */
  build: (facts: VorlageFacts) => VorlageLetter
}
