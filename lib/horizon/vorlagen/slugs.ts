/**
 * The template slugs, as plain strings.
 *
 * The proxy needs to know which `/vorlagen/<slug>` paths exist so it can answer an
 * unknown one with a real 404. It cannot read the templates to find out: a template
 * carries both languages of prose, and importing it would pull all of that into the
 * middleware bundle for the sake of a handful of identifiers.
 *
 * `vorlagen.test.ts` asserts that this list and the templates are the same set, so
 * the two cannot drift — a template added without its slug here fails the suite
 * rather than silently becoming a 404.
 */
export const VORLAGE_SLUGS = ["mangelanzeige", "arbeitszeugnis-anfordern", "urlaubsantrag", "widerspruch"] as const

export type VorlageSlug = (typeof VORLAGE_SLUGS)[number]

export function isVorlageSlug(value: string | undefined): boolean {
  return value !== undefined && (VORLAGE_SLUGS as readonly string[]).includes(value)
}
