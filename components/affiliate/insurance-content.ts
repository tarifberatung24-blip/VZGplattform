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
    meta: { title: string; description: string }
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
    noticeLesson: {
      eyebrow: string
      title: string
      lead: string
      paragraphs: string[]
      checklist: string[]
      documentCta: string
      documentHint: string
      sourceNote: string
      disclaimer: string
    }
    cta: string
    processHref: string
  }
> = {
  bg: {
    meta: {
      title: "Автозастраховка",
      description:
        "Автозастраховка на български: подготви данните за автомобила и сравни покритието при партньора. HORIZON by VZG.",
    },
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
      lead: "Ясни условия. Честни цени. Бързо сключване. Подготвяш данните за автомобила и избираш покритие, преди да продължиш към партньора.",
      bullets: [
        "Сигурно и дискретно",
        "Спестяваш време",
        "Поддръжка от екипа",
      ],
      phoneBadgeTitle: "Помощ по телефона",
      phoneBadgeHint: "Обади се, екипът помага",
      cta: "Сравни при партньора",
    },
    tiles: [
      {
        title: "Сравни и спести",
        body: "Сравняваме индивидуално оферти според нуждите ти и търсим подходящото покритие сред водещи застрахователи в Германия.",
      },
      {
        title: "Разбери какво е задължително",
        body: "Ако караш кола в Германия, законът изисква поне застраховка „Гражданска отговорност“ (Kfz-Haftpflicht). Без нея не можеш да регистрираш и да управляваш превозното средство.",
      },
      {
        title: "Разграничи покритията",
        body: "Haftpflicht покрива щетите, които причиняваш на другите. Teilkasko добавя кражба, пожар и градушка. Vollkasko включва и щети при твоя вина.",
      },
      {
        title: "Подготви се за смяна",
        body: "За смяна ти трябват HSN/TSN от Zulassungsbescheinigung Teil I, Erstzulassung и твоят SF-клас. Проверяваш и кога изтича предизвестието.",
      },
    ],
    noticeLesson: {
      eyebrow: "Преди да смениш застрахователя",
      title: "Кога тече предизвестието (Kündigungsfrist)?",
      lead: "Когато сменяш Kfz застрахователя си, трябва да знаеш кога започва да тече предизвестието при сегашния ти застраховател. Ако го пропуснеш, договорът се подновява и плащаш още една година.",
      paragraphs: [
        "При Kfz застраховка предизвестието е 1 месец към края на застрахователната година (Versicherungsjahr). Решаващо е кога писмото ти пристига при застрахователя, а не когато го изпращаш. Законът позволява срок между 1 и 3 месеца (§ 11 Abs. 3 VVG), затова провери своя договор.",
        "Застрахователната година не винаги съвпада с календарната. Ако договорът ти е стар, тя често приключва на 31 декември, но много застрахователи използват друга дата. Точната дата пише в полицата (Versicherungsschein).",
        "Ако не знаеш кога изтича договорът ти, качи снимка или файл на полицата си в HORIZON и разбери край на срока, начина на плащане и условията за предизвестие.",
      ],
      checklist: [
        "Намери застрахователната година (Versicherungsjahr) в полицата си.",
        "Изчисли кога изтича 1-месечният срок преди края на годината.",
        "Изпрати предизвестието така, че да пристигне навреме, и поискай потвърждение за получаване.",
      ],
      documentCta: "Качи полицата и разбери договора си",
      documentHint: "Функцията за преглед на документ изисква вход.",
      sourceNote:
        "Източници: § 11 Abs. 3 VVG (gesetze-im-internet.de) и Verbraucherzentrale.de. Точната дата и срокът са в твоята полица; HORIZON не ги определя.",
      disclaimer: "HORIZON by VZG не е застраховател и не дава индивидуална правна консултация.",
    },
    cta: "Започни сравнението",
    processHref: "/how-it-works",
  },
  de: {
    meta: {
      title: "Kfz-Versicherung",
      description:
        "Kfz-Versicherung vorbereiten und beim Partner vergleichen. HORIZON by VZG.",
    },
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
      lead: "Klare Bedingungen. Faire Preise. Schneller Abschluss. Du bereitest die Fahrzeugdaten vor und wählst die Deckung, bevor du zum Partner gehst.",
      bullets: [
        "Sicher und diskret",
        "Du sparst Zeit",
        "Unterstützung vom Team",
      ],
      phoneBadgeTitle: "Hilfe am Telefon",
      phoneBadgeHint: "Ruf an, das Team hilft",
      cta: "Beim Partner vergleichen",
    },
    tiles: [
      {
        title: "Vergleichen und sparen",
        body: "Wir vergleichen Angebote individuell nach deinem Bedarf und suchen die passende Deckung unter führenden Versicherern in Deutschland.",
      },
      {
        title: "Verstehe, was Pflicht ist",
        body: "Wer in Deutschland ein Auto fährt, braucht mindestens eine Kfz-Haftpflichtversicherung. Ohne sie kannst du dein Fahrzeug nicht zulassen und nicht fahren.",
      },
      {
        title: "Unterscheide die Deckungen",
        body: "Haftpflicht zahlt Schäden, die du anderen zufügst. Teilkasko ergänzt Diebstahl, Brand und Hagel. Vollkasko deckt auch Schäden bei eigener Schuld.",
      },
      {
        title: "Bereite den Wechsel vor",
        body: "Für den Wechsel brauchst du HSN/TSN aus der Zulassungsbescheinigung Teil I, die Erstzulassung und deine SF-Klasse. Prüfe auch das Ende der Kündigungsfrist.",
      },
    ],
    noticeLesson: {
      eyebrow: "Bevor du den Versicherer wechselst",
      title: "Wann läuft die Kündigungsfrist?",
      lead: "Wenn du deine Kfz-Versicherung wechselst, musst du wissen, wann die Kündigungsfrist bei deinem aktuellen Versicherer beginnt. Verpasst du sie, verlängert sich der Vertrag und du zahlst ein weiteres Jahr.",
      paragraphs: [
        "Bei einer Kfz-Versicherung beträgt die Kündigungsfrist 1 Monat zum Ende des Versicherungsjahres. Entscheidend ist, wann dein Schreiben beim Versicherer eingeht, nicht wann du es absendest. Das Gesetz erlaubt eine Frist zwischen 1 und 3 Monaten (§ 11 Abs. 3 VVG), deshalb prüfe deinen Vertrag.",
        "Das Versicherungsjahr ist nicht immer das Kalenderjahr. Bei älteren Verträgen endet es oft am 31. Dezember, aber viele Versicherer nutzen einen anderen Stichtag. Das genaue Datum steht im Versicherungsschein.",
        "Wenn du nicht weißt, wann dein Vertrag endet, lade ein Foto oder eine Datei deiner Police in HORIZON hoch und finde Laufzeitende, Zahlungsweise und Kündigungsbedingungen.",
      ],
      checklist: [
        "Versicherungsjahr im Versicherungsschein finden.",
        "Berechnen, wann die 1-Monats-Frist vor Jahresende endet.",
        "Kündigung so absenden, dass sie rechtzeitig eingeht, und den Eingang bestätigen lassen.",
      ],
      documentCta: "Police hochladen und Vertrag verstehen",
      documentHint: "Die Dokumentenprüfung erfordert eine Anmeldung.",
      sourceNote:
        "Quellen: § 11 Abs. 3 VVG (gesetze-im-internet.de) und Verbraucherzentrale.de. Das genaue Datum und die Frist stehen in deiner Police; HORIZON legt sie nicht fest.",
      disclaimer: "HORIZON by VZG ist kein Versicherer und gibt keine individuelle Rechtsberatung.",
    },
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
