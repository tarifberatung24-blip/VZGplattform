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

/**
 * Marketing copy for the Kfz landing page. Every claim here must stay
 * verifiable: no customer counts, no ratings, no guaranteed saving. Facts that
 * belong to the catalogue product (name, summary, details) are read from
 * `insuranceProductContent`, not repeated here.
 */
export const kfzLandingCopy: Record<
  Locale,
  {
    nav: { plate: string; coverage: string; insured: string; blog: string; contact: string }
    hero: {
      eyebrow: string
      titleLead: string
      titleAccent: string
      lead: string
      bullets: string[]
      phoneBadgeTitle: string
      phoneBadgeHint: string
      cta: string
    }
    tiles: Array<{ title: string; body: string }>
    cta: string
    processHref: string
  }
> = {
  bg: {
    nav: {
      plate: "Номер",
      coverage: "Покритие",
      insured: "Застрахован",
      blog: "Блог",
      contact: "Контакти",
    },
    hero: {
      eyebrow: "Автозастраховка",
      titleLead: "Автозастраховка,",
      titleAccent: "обяснена на български",
      lead: "Ясни условия. Честни цени. Бързо сключване. Подготвяш данните за автомобила и сравняваш покритието, преди да продължиш към партньора.",
      bullets: [
        "Сигурно и дискретно",
        "Спестяваш време",
        "Поддръжка от екипа",
      ],
      phoneBadgeTitle: "Помощ по телефона",
      phoneBadgeHint: "Обади се — екипът помага",
      cta: "Сравни при партньора",
    },
    tiles: [
      {
        title: "Ясни и прозрачни условия",
        body: "Без дребен шрифт и скрити такси. Всичко е обяснено на разбираем език.",
      },
      {
        title: "Сравни и спести",
        body: "Сравняваме оферти от водещи застрахователи, за да намериш подходящото покритие.",
      },
      {
        title: "Бързо и лесно онлайн",
        body: "Попълни данните веднъж и продължи към партньора за своята застраховка.",
      },
      {
        title: "Истинска подкрепа",
        body: "Нашият екип е тук за теб — по телефона, в чат или по имейл.",
      },
    ],
    cta: "Започни сравнението",
    processHref: "/how-it-works",
  },
  de: {
    nav: {
      plate: "Kennzeichen",
      coverage: "Deckung",
      insured: "Versichert",
      blog: "Blog",
      contact: "Kontakt",
    },
    hero: {
      eyebrow: "Kfz-Versicherung",
      titleLead: "Kfz-Versicherung,",
      titleAccent: "klar erklärt",
      lead: "Klare Bedingungen. Faire Preise. Schneller Abschluss. Du bereitest die Fahrzeugdaten vor und vergleichst die Deckung, bevor du zum Partner gehst.",
      bullets: [
        "Sicher und diskret",
        "Du sparst Zeit",
        "Unterstützung vom Team",
      ],
      phoneBadgeTitle: "Hilfe am Telefon",
      phoneBadgeHint: "Ruf an — das Team hilft",
      cta: "Beim Partner vergleichen",
    },
    tiles: [
      {
        title: "Klare und transparente Bedingungen",
        body: "Kein Kleingedrucktes und keine versteckten Gebühren. Alles verständlich erklärt.",
      },
      {
        title: "Vergleichen und sparen",
        body: "Wir stellen Angebote führender Versicherer gegenüber, damit du die passende Deckung findest.",
      },
      {
        title: "Schnell und einfach online",
        body: "Daten einmal eingeben und beim Partner für deine Versicherung fortfahren.",
      },
      {
        title: "Echte Unterstützung",
        body: "Unser Team ist für dich da — telefonisch, im Chat oder per E-Mail.",
      },
    ],
    cta: "Vergleich starten",
    processHref: "/how-it-works",
  },
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
        "Застраховки за фирми и свободни професии: Betriebshaftpflicht, Inhaltsversicherung и Rechtsschutz. Подготви данните си и прегледай видовете покритие директно при партньора.",
      details: [
        "Подготви бранш, правна форма и брой служители",
        "Прегледай Betriebshaftpflicht, Inhaltsversicherung и Rechtsschutz при партньора",
        "Продължи директно при партньора за конкретна оферта",
      ],
      cta: "Продължи към партньора",
    },
    de: {
      name: "Firmenversicherung",
      summary:
        "Versicherungen für Unternehmen und Freiberufler: Betriebshaftpflicht, Inhaltsversicherung und Rechtsschutz. Bereite deine Angaben vor und sieh dir die Deckungsarten direkt beim Partner an.",
      details: [
        "Branche, Rechtsform und Mitarbeitende vorbereiten",
        "Betriebshaftpflicht, Inhaltsversicherung und Rechtsschutz beim Partner ansehen",
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
        "Автомобилна застраховка за твоето превозно средство. Подготви данните за колата и прегледай предлаганите видове покритие при партньора.",
      details: [
        "Подготви HSN/TSN, Erstzulassung и SF клас",
        "Разбери разликата между Haftpflicht, Teilkasko и Vollkasko",
        "Сравни покритие и условия директно при партньора",
      ],
      cta: "Продължи към партньора",
    },
    de: {
      name: "Kfz-Versicherung",
      summary:
        "Kfz-Versicherung für dein Fahrzeug. Bereite die Fahrzeugdaten vor und sieh dir die angebotenen Deckungsarten anschließend beim Partner an.",
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
