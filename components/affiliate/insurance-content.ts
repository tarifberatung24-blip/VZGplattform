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
    documents: {
      eyebrow: string
      title: string
      lead: string
      items: Array<{ title: string; where: string; action?: { label: string; href: string; note?: string } }>
    }
    widget: {
      eyebrow: string
      title: string
      intro: string
      privacy: string
      loadCta: string
      fallbackCta: string
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
        title: "Какво е задължително",
        body: "В Германия всеки регистриран автомобил трябва да има Kfz-Haftpflicht, т.е. „Гражданска отговорност“. Без нея няма регистрация и колата не може да излезе на пътя.",
      },
      {
        title: "Кое покритие да избереш",
        body: "Haftpflicht плаща щетите, които причиняваш на другите. Teilkasko обикновено добавя кражба, пожар, градушка и стъкла. Vollkasko покрива и щети по твоята кола, когато вината е твоя. Точното покритие е в условията на всяка тарифа.",
      },
      {
        title: "Какво е eVB номерът",
        body: "eVB е електронното потвърждение, че колата е застрахована. Даваш го в Zulassungsstelle при регистрацията. Получаваш го от новия застраховател, обикновено веднага след онлайн заявката.",
      },
      {
        title: "Безщетният стаж от България",
        body: "Поискай от българския си застраховател удостоверение за щетимост (история на щетите). По правилата на ЕС той трябва да го издаде до 15 дни. Германският застраховател сам решава дали и как да го зачете за SF класа.",
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
    documents: {
      eyebrow: "Документите",
      title: "Откъде да вземеш всеки документ",
      lead: "Повечето неща вече са у теб. За останалите ето къде да ги поискаш и коя функция на HORIZON помага.",
      items: [
        {
          title: "Zulassungsbescheinigung Teil I (малкият талон)",
          where: "Носиш я в колата. HSN е в поле 2.1, TSN в поле 2.2; калкулаторът ги иска. При загуба нова издава Zulassungsstelle по адреса ти.",
          action: { label: "Качи я в документите си", href: "/documents", note: "Изисква вход." },
        },
        {
          title: "Полицата на сегашния застраховател (Versicherungsschein)",
          where: "В онлайн профила при застрахователя или в писмата от него. Там са застрахователната година, SF класът и вноската.",
          action: { label: "Качи полицата и следи срока", href: "/vertraege", note: "Изисква вход." },
        },
        {
          title: "Удостоверение за щетимост от българския застраховател",
          where: "Поискай го писмено, по имейл или в офис на застрахователя. Посочи номер на полицата, регистрационния номер и периода. Издава се до 15 дни.",
          action: { label: "Поискай помощ от VZG CONSULT", href: "/zayavka?service=kfz" },
        },
        {
          title: "Предизвестие към стария застраховател",
          where: "Изпраща се писмено, така че да пристигне преди срока. Пази потвърждението за получаване.",
          action: { label: "Подготви писмото за прекратяване", href: "/guide" },
        },
        {
          title: "eVB номер",
          where: "Дава го новият застраховател след заявката. Изчисли тарифата най-долу и продължи при партньора.",
          action: { label: "Към калкулатора", href: "#kfz-calculator" },
        },
        {
          title: "Документи за регистрацията",
          where: "Лична карта или паспорт, Zulassungsbescheinigung Teil I и II, eVB, протокол от последния HU (TÜV) и SEPA пълномощно за данъка върху МПС. Подаваш ги в Zulassungsstelle с час или онлайн през i-Kfz.",
          action: { label: "Напиши писмо до институция", href: "/email-generator" },
        },
      ],
    },
    widget: {
      eyebrow: "Тарифен калкулатор",
      title: "Изчисли и сравни цена",
      intro: "Калкулаторът е на нашия партньор и сравнява тарифи на германски застрахователи. Цената и приемането определя застрахователят, не HORIZON.",
      privacy: "Калкулаторът се зарежда от partner-versicherung.de (CHECK24) едва след като натиснеш бутона. Тогава партньорът може да използва бисквитки и получава данните, които въведеш в него.",
      loadCta: "Зареди калкулатора",
      fallbackCta: "Отвори сравнението в нов прозорец",
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
        title: "Was Pflicht ist",
        body: "Jedes zugelassene Auto in Deutschland braucht eine Kfz-Haftpflichtversicherung. Ohne sie gibt es keine Zulassung, und das Auto darf nicht auf die Straße.",
      },
      {
        title: "Welche Deckung passt",
        body: "Die Haftpflicht zahlt Schäden, die du anderen zufügst. Teilkasko umfasst meist Diebstahl, Brand, Hagel und Glas. Vollkasko zahlt auch Schäden am eigenen Auto, wenn du sie selbst verursacht hast. Was genau gilt, steht in den Bedingungen des Tarifs.",
      },
      {
        title: "Was die eVB-Nummer ist",
        body: "Die eVB ist die elektronische Versicherungsbestätigung. Du brauchst sie bei der Zulassungsstelle. Du bekommst sie vom neuen Versicherer, bei Onlineanträgen meist sofort.",
      },
      {
        title: "Schadenfreie Jahre aus dem Ausland",
        body: "Lass dir vom bisherigen Versicherer im Ausland eine Bescheinigung über den Schadenverlauf ausstellen. Nach EU-Recht muss er sie innerhalb von 15 Tagen liefern. Ob und wie der deutsche Versicherer sie für die SF-Klasse anrechnet, entscheidet er selbst.",
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
    documents: {
      eyebrow: "Unterlagen",
      title: "Wo du jedes Dokument bekommst",
      lead: "Das meiste hast du schon. Für den Rest steht hier, wo du es anforderst und welche HORIZON-Funktion hilft.",
      items: [
        {
          title: "Zulassungsbescheinigung Teil I",
          where: "Sie liegt im Auto. Die HSN steht in Feld 2.1, die TSN in Feld 2.2; der Rechner fragt danach. Bei Verlust stellt die Zulassungsstelle deines Wohnorts eine neue aus.",
          action: { label: "In deinen Dokumenten speichern", href: "/documents", note: "Anmeldung erforderlich." },
        },
        {
          title: "Versicherungsschein des aktuellen Versicherers",
          where: "Im Kundenportal oder in der Post deines Versicherers. Dort stehen Versicherungsjahr, SF-Klasse und Beitrag.",
          action: { label: "Police hochladen, Frist im Blick", href: "/vertraege", note: "Anmeldung erforderlich." },
        },
        {
          title: "Schadenverlaufsbescheinigung aus dem Ausland",
          where: "Schriftlich oder per E-Mail beim bisherigen Versicherer anfordern, mit Policennummer, Kennzeichen und Zeitraum. Sie muss innerhalb von 15 Tagen kommen.",
          action: { label: "Hilfe von VZG CONSULT anfragen", href: "/zayavka?service=kfz" },
        },
        {
          title: "Kündigung beim alten Versicherer",
          where: "Schriftlich und so, dass sie vor Fristende ankommt. Bewahre die Eingangsbestätigung auf.",
          action: { label: "Kündigungsschreiben vorbereiten", href: "/guide" },
        },
        {
          title: "eVB-Nummer",
          where: "Kommt vom neuen Versicherer nach dem Antrag. Berechne unten den Tarif und mach beim Partner weiter.",
          action: { label: "Zum Rechner", href: "#kfz-calculator" },
        },
        {
          title: "Unterlagen für die Zulassung",
          where: "Ausweis oder Reisepass, Zulassungsbescheinigung Teil I und II, eVB, Bericht der letzten HU und SEPA-Mandat für die Kfz-Steuer. Bei der Zulassungsstelle mit Termin oder online über i-Kfz.",
          action: { label: "Schreiben an eine Behörde aufsetzen", href: "/email-generator" },
        },
      ],
    },
    widget: {
      eyebrow: "Tarifrechner",
      title: "Beitrag berechnen und vergleichen",
      intro: "Der Rechner gehört unserem Partner und vergleicht Tarife deutscher Versicherer. Beitrag und Annahme legt der Versicherer fest, nicht HORIZON.",
      privacy: "Der Rechner wird erst nach Klick auf den Button von partner-versicherung.de (CHECK24) geladen. Dann kann der Partner Cookies setzen und erhält die Daten, die du dort eingibst.",
      loadCta: "Rechner laden",
      fallbackCta: "Vergleich in neuem Fenster öffnen",
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
