import { Building2, Car } from "lucide-react"
import type { AffiliateOfferId } from "@/lib/affiliate-offers"
import type { Locale } from "@/lib/i18n/dictionaries"

type InsuranceOfferId = Extract<AffiliateOfferId, "business-insurance" | "kfz">

type InsuranceCopy = {
  name: string
  summary: string
  details: string[]
  cta: string
}

type InsuranceProductContent = {
  icon: typeof Building2
  href: string
  bg: InsuranceCopy
  de: InsuranceCopy
}

/**
 * Presentation copy for the two approved insurance partner products. Adding a
 * future insurance partner means adding a registry entry plus an entry here; the
 * hub and the offer route read from the registry so nothing else changes.
 */
export const insuranceProductContent: Record<InsuranceOfferId, InsuranceProductContent> = {
  "business-insurance": {
    icon: Building2,
    href: "/angebote/business-insurance",
    bg: {
      name: "Firmenversicherung",
      summary:
        "Застраховки за фирми и свободни професии: Betriebshaftpflicht, Inhaltsversicherung и Rechtsschutz. Подготви данните си и продължи директно при партньора.",
      details: [
        "Подготви бранш, правна форма и брой служители",
        "Сравни Betriebshaftpflicht, Inhaltsversicherung и Rechtsschutz",
        "Продължи директно при партньора за конкретна оферта",
      ],
      cta: "Weiter zum Partner",
    },
    de: {
      name: "Firmenversicherung",
      summary:
        "Versicherungen für Unternehmen und Freiberufler: Betriebshaftpflicht, Inhaltsversicherung und Rechtsschutz. Bereite deine Angaben vor und geh direkt zum Partner.",
      details: [
        "Branche, Rechtsform und Mitarbeitende vorbereiten",
        "Betriebshaftpflicht, Inhaltsversicherung und Rechtsschutz vergleichen",
        "Direkt beim Partner ein konkretes Angebot anfragen",
      ],
      cta: "Weiter zum Partner",
    },
  },
  kfz: {
    icon: Car,
    href: "/angebote/kfz",
    bg: {
      name: "Kfz-Versicherung",
      summary:
        "Автомобилна застраховка за твоето превозно средство. Подготви данните за колата и желаното покритие, после сравни при партньора.",
      details: [
        "Подготви HSN/TSN, Erstzulassung и SF клас",
        "Разбери разликата между Haftpflicht, Teilkasko и Vollkasko",
        "Сравни покритие и условия директно при партньора",
      ],
      cta: "Weiter zum Partner",
    },
    de: {
      name: "Kfz-Versicherung",
      summary:
        "Kfz-Versicherung für dein Fahrzeug. Bereite Fahrzeugdaten und gewünschten Schutz vor und vergleiche anschließend beim Partner.",
      details: [
        "HSN/TSN, Erstzulassung und SF-Klasse vorbereiten",
        "Haftpflicht, Teilkasko und Vollkasko unterscheiden",
        "Deckung und Bedingungen direkt beim Partner vergleichen",
      ],
      cta: "Weiter zum Partner",
    },
  },
}

export const insuranceHubCopy: Record<
  Locale,
  {
    eyebrow: string
    title: string
    intro: string
    productsTitle: string
    activeLabel: string
    plannedLabel: string
    plannedNote: string
    partnerNote: string
    notice: string
    contactCta: string
    contactHref: string
  }
> = {
  bg: {
    eyebrow: "HORIZON by VZG · Застраховки",
    title: "Застраховки",
    intro:
      "Избери застраховъчен продукт и подготви данните си, преди да продължиш към партньора. HORIZON by VZG не е застраховател и не дава индивидуална застрахователна консултация.",
    productsTitle: "Продукти",
    activeLabel: "Partnerlink",
    plannedLabel: "В подготовка",
    plannedNote: "Този продукт все още няма одобрен партньор и не се предлага.",
    partnerNote: "Продължаваш към партньора и сключваш договора директно с него. Anzeige / Partnerlink.",
    notice: "Тази страница само представя продукти и подготвя входните данни. Няма гарантирана премия, гарантирано приемане или „най-добър“ застраховател.",
    contactCta: "Свържи се с нас",
    contactHref: "/contact",
  },
  de: {
    eyebrow: "HORIZON by VZG · Versicherungen",
    title: "Versicherungen",
    intro:
      "Wähle ein Versicherungsprodukt und bereite deine Angaben vor, bevor du zum Partner gehst. HORIZON by VZG ist kein Versicherer und gibt keine individuelle Versicherungsberatung.",
    productsTitle: "Produkte",
    activeLabel: "Partnerlink",
    plannedLabel: "In Vorbereitung",
    plannedNote: "Für dieses Produkt gibt es noch keinen freigegebenen Partner; es wird nicht angeboten.",
    partnerNote: "Du gehst zum Partner und schließt den Vertrag direkt mit ihm. Anzeige / Partnerlink.",
    notice: "Diese Seite stellt nur Produkte dar und bereitet Eingabedaten vor. Es gibt keinen garantierten Beitrag, keine garantierte Annahme und keinen „besten“ Versicherer.",
    contactCta: "Kontakt aufnehmen",
    contactHref: "/contact",
  },
}
