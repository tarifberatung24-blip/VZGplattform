/**
 * The guide slugs, as plain strings.
 *
 * The proxy needs to know which `/ratgeber/<slug>` paths exist so it can answer an
 * unknown one with a real 404. It cannot read the corpus to find out: the corpus is
 * thousands of words of prose, and importing it would pull all of it into the
 * middleware bundle for the sake of a dozen identifiers.
 *
 * `guide-corpus.test.ts` asserts that this list and the topics are the same set, so
 * the two cannot drift — a topic added without its slug here fails the suite rather
 * than silently becoming a 404.
 */
export const GUIDE_SLUGS = [
  "anmeldung",
  "jobcenter",
  "finanzamt",
  "krankenkasse",
  "auslaenderbehoerde",
  "familienkasse",
  "agentur-fuer-arbeit",
  "rentenversicherung",
  "buergeramt",
  "rundfunkbeitrag",
  "mietvertrag",
  "bankkonto",
] as const

export type GuideSlug = (typeof GUIDE_SLUGS)[number]

export function isGuideSlug(value: string | undefined): boolean {
  return value !== undefined && (GUIDE_SLUGS as readonly string[]).includes(value)
}
