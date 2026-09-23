import type { Locale } from "./i18n/dictionaries"

/**
 * Mandatory advertising disclosure for public affiliate surfaces. The wording is
 * fixed: it states the advertising nature and the possible commission without
 * claiming that HORIZON is the insurer or that it advises individually.
 */
export const affiliateDisclosure: Record<Locale, string> = {
  bg: "Реклама / партньорски връзки. HORIZON by VZG може да получи възнаграждение, ако чрез партньорска връзка бъде сключен договор.",
  de: "Anzeige / Partnerlinks. HORIZON by VZG kann eine Vergütung erhalten, wenn über einen Partnerlink ein Vertrag abgeschlossen wird.",
}

export function affiliateDisclosureFor(locale: Locale) {
  return affiliateDisclosure[locale] ?? affiliateDisclosure.bg
}
