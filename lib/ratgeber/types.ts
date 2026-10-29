import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * A guide page about one German authority or procedure.
 *
 * Every field exists because a reader arriving from a search engine needs it: what
 * the office is, what to bring, the order of the steps, and where the official
 * page is. `sources` is required rather than optional — a claim about a deadline
 * or a fee that cannot be traced to an authority is worse than no claim, because
 * the reader acts on it.
 *
 * Figures that change annually (rates, thresholds, contribution ceilings) are
 * deliberately absent. The authoritative number lives on the linked official page
 * and stating a stale one here would mislead the reader who trusts it.
 */
export type GuideLocaleContent = {
  title: string
  /** Used as the meta description, so it must read as a complete sentence. */
  summary: string
  /** One paragraph naming the office and what it decides. */
  intro: string
  /** What this office or procedure is responsible for. */
  scope: string[]
  /** The order of the steps, as a reader performs them. */
  steps: { title: string; body: string }[]
  /** Documents a reader is typically asked for. */
  documents: string[]
  /** Mistakes that cost time or money, each phrased as a warning. */
  pitfalls: string[]
  faq: { question: string; answer: string }[]
}

export type GuideSource = {
  label: string
  url: string
}

export type GuideTopic = {
  slug: string
  /** Grouping on the index page; keys into `guideCategoryCopy`. */
  category: GuideCategoryId
  /** The German name, shown untranslated because it is what appears on the letter. */
  germanName: string
  /** Search terms a reader would actually type, per locale. */
  keywords: Record<Locale, string[]>
  content: Record<Locale, GuideLocaleContent>
  sources: GuideSource[]
}

export type GuideCategoryId = "authorities" | "money" | "everyday"

export type GuideCategory = {
  id: GuideCategoryId
  title: Record<Locale, string>
  intro: Record<Locale, string>
}
