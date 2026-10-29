import { arbeitszeugnis } from "./templates/arbeitszeugnis"
import { mangelanzeige } from "./templates/mangelanzeige"
import { urlaubsantrag } from "./templates/urlaubsantrag"
import { widerspruch } from "./templates/widerspruch"
import type { VorlageCategory, VorlageCategoryId, VorlageTemplate } from "./types"

export type { VorlageCategory, VorlageCategoryId, VorlageFacts, VorlageField, VorlageLetter, VorlageTemplate } from "./types"

/**
 * Every letter template, in one list.
 *
 * The index is the single source of truth. The route, the sitemap, the proxy's
 * slug check and the guide cross-links all read this array, so a template becomes
 * reachable everywhere by being added here — there is no second list to update and
 * therefore none to forget.
 */
export const vorlagen: VorlageTemplate[] = [mangelanzeige, arbeitszeugnis, urlaubsantrag, widerspruch]

export const vorlageCategories: VorlageCategory[] = [
  {
    id: "housing",
    title: { bg: "Жилище", de: "Wohnen" },
    intro: {
      bg: "Писма до наемодателя, когато в жилището нещо не е наред.",
      de: "Schreiben an den Vermieter, wenn in der Wohnung etwas nicht stimmt.",
    },
  },
  {
    id: "work",
    title: { bg: "Работа", de: "Arbeit" },
    intro: {
      bg: "Писма до работодателя — отпуск и свидетелство за работа.",
      de: "Schreiben an den Arbeitgeber – Urlaub und Arbeitszeugnis.",
    },
  },
  {
    id: "authority",
    title: { bg: "Служби", de: "Behörden" },
    intro: {
      bg: "Възражение, когато решение на служба е срещу теб.",
      de: "Widerspruch, wenn ein Bescheid gegen dich ergangen ist.",
    },
  },
]

export function findVorlage(slug: string): VorlageTemplate | undefined {
  return vorlagen.find((template) => template.slug === slug)
}

export function vorlagenByCategory(category: VorlageCategoryId): VorlageTemplate[] {
  return vorlagen.filter((template) => template.category === category)
}

/** The path of a template page, without the locale prefix. */
export function vorlagePath(slug: string): string {
  return `/vorlagen/${slug}`
}

export const VORLAGE_INDEX_PATH = "/vorlagen"

/**
 * Which letter answers a guide page, by guide slug.
 *
 * A reader who has just finished reading about the Jobcenter or about their
 * tenancy is at the exact moment they need the letter, and asking them to find it
 * themselves loses them. This map is the bridge from reading to acting.
 *
 * It is deliberately explicit rather than derived: "which letter does this guide
 * need" is an editorial judgement, not something a rule can infer from the topic
 * name, and a wrong automatic match would offer the reader the wrong instrument
 * at the moment they trust the page.
 */
const guideToVorlage: Readonly<Record<string, string>> = {
  mietvertrag: "mangelanzeige",
  jobcenter: "widerspruch",
  finanzamt: "widerspruch",
  familienkasse: "widerspruch",
  "agentur-fuer-arbeit": "widerspruch",
  krankenkasse: "widerspruch",
  rentenversicherung: "widerspruch",
  auslaenderbehoerde: "widerspruch",
  rundfunkbeitrag: "widerspruch",
}

/** The template a guide page should offer, or undefined when none fits. */
export function vorlageForGuide(guideSlug: string): VorlageTemplate | undefined {
  const slug = guideToVorlage[guideSlug]
  return slug ? findVorlage(slug) : undefined
}

/** The guide-to-template map, exposed so a test can prove both ends exist. */
export const guideVorlageMap: Readonly<Record<string, string>> = guideToVorlage

/**
 * The guide that explains a template, where one does.
 *
 * The guide pages already offer the matching letter, so a reader arrives here from
 * a guide. Without the reverse link the traffic is one-way: the letter page is a
 * dead end for a search engine and for a reader who wants the rule behind the
 * letter before sending it. This closes the loop.
 *
 * It is a separate explicit map rather than a derivation of `guideToVorlage`,
 * because a guide can point at a letter while the letter's *best* reading is a
 * different guide. Only the two letters with a fitting guide appear; the other two
 * link to the guide index instead of a topic that would not answer them.
 */
const vorlageToGuide: Readonly<Record<string, string>> = {
  mangelanzeige: "mietvertrag",
  widerspruch: "jobcenter",
}

/** The guide slug that explains a template, or undefined when none fits. */
export function guideForVorlage(vorlageSlug: string): string | undefined {
  return vorlageToGuide[vorlageSlug]
}

/** The template-to-guide map, exposed so a test can prove the two maps agree. */
export const vorlageGuideMap: Readonly<Record<string, string>> = vorlageToGuide
