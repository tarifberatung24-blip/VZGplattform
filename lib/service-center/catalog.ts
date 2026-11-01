import type { Locale } from "@/lib/i18n/dictionaries"
import { horizonServiceCenterEntries } from "./horizon-services"

/**
 * The HORIZON Service Center catalogue.
 *
 * One list backs the public catalogue page: what HORIZON can actually do today,
 * what needs a login, what depends on a partner offer, and what is still only
 * planned. The distinction is the point of the page. A capability that does not
 * exist must not be reachable, so a roadmap entry carries no `href` at all — the
 * type makes an unreleased service impossible to link by construction, rather
 * than relying on a reviewer to notice a bad URL.
 *
 * The page's own copy lives here too, not in the component. The repository's
 * `i18n:hardcoded` check scans `app/` and `components/` for user-facing literals
 * and only `lib/` is exempt, so a bilingual page keeps its strings beside the
 * data it describes.
 */

export type ServiceAudience = "personal" | "business"

export type ServiceCategory =
  | "guide"
  | "documents"
  | "authorities"
  | "tax"
  | "contracts"
  | "learning"
  | "insurance"
  | "roadmap"

export type ServiceStatus = "available" | "login" | "partner" | "roadmap"

export type ServiceEntry = {
  id: string
  /** Every audience the capability genuinely serves today. */
  audience: readonly ServiceAudience[]
  category: ServiceCategory
  status: ServiceStatus
  /**
   * The unlocalized route, or absent when there is nothing to open.
   *
   * Only `available` and `login` entries carry one. A roadmap entry, and a
   * partner-dependent hub without a configured offer, have no page to send a
   * reader to; inventing one would be a fake destination.
   */
  href?: string
  name: Record<Locale, string>
  summary: Record<Locale, string>
  /** The concrete things the capability does, shown in the details dialog. */
  includes: Record<Locale, readonly string[]>
  /** Extra words a person would type, per locale, for search. */
  terms: Record<Locale, string>
}

export const SERVICE_CENTER_PATH = "/service-center"

export const serviceAudiences: readonly ServiceAudience[] = ["personal", "business"]

export const serviceCategories: readonly ServiceCategory[] = [
  "guide",
  "documents",
  "authorities",
  "tax",
  "contracts",
  "learning",
  "insurance",
  "roadmap",
]

export const serviceStatuses: readonly ServiceStatus[] = ["available", "login", "partner", "roadmap"]

export const serviceCenterEntries: readonly ServiceEntry[] = [
  {
    id: "guide",
    audience: ["personal"],
    category: "guide",
    status: "available",
    href: "/guide",
    name: { bg: "HORIZON Guide", de: "HORIZON Guide" },
    summary: {
      bg: "Пет входа за твоя случай: обясни документ, отговори на институция, подготви формуляр, прекрати договор или „не съм сигурен“.",
      de: "Fünf Einstiege für deinen Vorgang: ein Dokument erklären, einer Behörde antworten, ein Formular vorbereiten, einen Vertrag kündigen oder „ich bin unsicher“.",
    },
    includes: {
      bg: [
        "Обяснение на документ с цитати",
        "Отговор до институция",
        "Подготовка на официален формуляр",
        "Прекратяване на договор",
        "Вход „не съм сигурен“",
      ],
      de: [
        "Ein Dokument mit Belegzitaten erklären",
        "Antwort an eine Behörde",
        "Amtliches Formular vorbereiten",
        "Einen Vertrag kündigen",
        "Einstieg „ich bin unsicher“",
      ],
    },
    terms: {
      bg: "помощ случай писмо отговор срок формуляр документ",
      de: "hilfe fall brief antwort frist formular dokument",
    },
  },
  {
    id: "learning-center",
    audience: ["personal", "business"],
    category: "learning",
    status: "available",
    href: "/learning-center",
    name: { bg: "Учебен център", de: "Lernzentrum" },
    summary: {
      bg: "Функции, наръчник, готови писма и обучение за таблото, подредени по пътеки.",
      de: "Funktionen, Ratgeber, fertige Briefe und Dashboard-Schulung, in Lernpfaden geordnet.",
    },
    includes: {
      bg: [
        "Какво може HORIZON днес",
        "Наръчник за институциите в Германия",
        "Готови писма и шаблони",
        "Обучение за таблото (предстои)",
      ],
      de: [
        "Was HORIZON heute kann",
        "Ratgeber zu Behörden in Deutschland",
        "Fertige Briefe und Vorlagen",
        "Dashboard-Schulung (folgt)",
      ],
    },
    terms: {
      bg: "учене обучение наръчник готови писма институции",
      de: "lernen ratgeber briefe behörden vorlagen",
    },
  },
  {
    id: "insurance",
    audience: ["personal", "business"],
    category: "insurance",
    status: "partner",
    href: "/versicherungen",
    name: { bg: "Застраховки", de: "Versicherungen" },
    summary: {
      bg: "Публичен преглед на застраховките за живота в Германия. Конкретните оферти зависят от одобрените партньорски предложения.",
      de: "Öffentlicher Überblick zu Versicherungen für das Leben in Deutschland. Konkrete Angebote hängen von freigegebenen Partnerangeboten ab.",
    },
    includes: {
      bg: [
        "Фирмена и автомобилна застраховка",
        "Преглед с ясно посочен партньор",
        "Заявка само при налично предложение",
        "Партньорските връзки са означени",
      ],
      de: [
        "Firmen- und Kfz-Versicherung",
        "Überblick mit klar benanntem Partner",
        "Anfrage nur bei vorliegendem Angebot",
        "Partnerlinks sind gekennzeichnet",
      ],
    },
    terms: {
      bg: "застраховка фирмена автомобил kfz оферта партньор",
      de: "versicherung firmen kfz angebot partner",
    },
  },
  {
    id: "documents",
    audience: ["personal"],
    category: "documents",
    status: "login",
    href: "/documents",
    name: { bg: "Документи и OCR", de: "Dokumente und OCR" },
    summary: {
      bg: "Качи PDF, снимка или скрийншот, извлечи текста и го прегледай, преди да го използваш.",
      de: "PDF, Foto oder Screenshot hochladen, Text extrahieren und prüfen, bevor du ihn verwendest.",
    },
    includes: {
      bg: [
        "Качване на PDF, снимка или скрийншот",
        "Извличане на текста",
        "Преглед на извлечения текст",
        "Документът остава в твоя профил",
      ],
      de: [
        "PDF, Foto oder Screenshot hochladen",
        "Text extrahieren",
        "Extrahierten Text prüfen",
        "Das Dokument bleibt in deinem Konto",
      ],
    },
    terms: {
      bg: "документ качи pdf снимка скрийншот ocr текст",
      de: "dokument hochladen pdf foto screenshot ocr text",
    },
  },
  {
    id: "letter-explanation",
    audience: ["personal"],
    category: "authorities",
    status: "login",
    href: "/guide",
    name: { bg: "Обяснение на официални писма", de: "Amtliche Briefe erklären" },
    summary: {
      bg: "Обяснение, подкрепено с източници и цитати, със срок и следваща стъпка. Това не е правен съвет.",
      de: "Quellengestützte Erklärung mit Belegzitaten, Frist und nächstem Schritt. Das ist keine Rechtsberatung.",
    },
    includes: {
      bg: [
        "Обяснение, основано на самия документ",
        "Цитати от писмото",
        "Разпознат срок",
        "Предложена следваща стъпка",
      ],
      de: [
        "Erklärung auf Grundlage des Dokuments",
        "Belegzitate aus dem Brief",
        "Erkannte Frist",
        "Vorgeschlagener nächster Schritt",
      ],
    },
    terms: {
      bg: "писмо институция обяснение срок цитат източник",
      de: "brief behörde erklärung frist zitat quelle",
    },
  },
  {
    id: "jobcenter",
    audience: ["personal"],
    category: "authorities",
    status: "login",
    href: "/dashboard",
    name: { bg: "Jobcenter — работни процеси", de: "Jobcenter — Arbeitsabläufe" },
    summary: {
      bg: "Три поддържани задачи. Ти преглеждаш и одобряваш всяка чернова, преди да продължиш.",
      de: "Drei unterstützte Aufgaben. Du prüfst und bestätigst jeden Entwurf, bevor es weitergeht.",
    },
    includes: {
      bg: [
        "Три поддържани задачи",
        "Чернова за преглед",
        "Твоето одобрение преди всеки следващ ход",
        "Вход през таблото",
      ],
      de: [
        "Drei unterstützte Aufgaben",
        "Entwurf zur Prüfung",
        "Deine Bestätigung vor jedem Schritt",
        "Einstieg über das Dashboard",
      ],
    },
    terms: {
      bg: "jobcenter граждански помощи табло",
      de: "jobcenter bürgergeld leistungen dashboard",
    },
  },
  {
    id: "agentur",
    audience: ["personal"],
    category: "authorities",
    status: "login",
    href: "/dashboard",
    name: { bg: "Agentur für Arbeit — работни процеси", de: "Agentur für Arbeit — Arbeitsabläufe" },
    summary: {
      bg: "Четири поддържани задачи. Ти преглеждаш и одобряваш всяка чернова, преди да продължиш.",
      de: "Vier unterstützte Aufgaben. Du prüfst und bestätigst jeden Entwurf, bevor es weitergeht.",
    },
    includes: {
      bg: [
        "Четири поддържани задачи",
        "Чернова за преглед",
        "Твоето одобрение преди всеки следващ ход",
        "Вход през таблото",
      ],
      de: [
        "Vier unterstützte Aufgaben",
        "Entwurf zur Prüfung",
        "Deine Bestätigung vor jedem Schritt",
        "Einstieg über das Dashboard",
      ],
    },
    terms: {
      bg: "agentur arbeit arbeitslosengeld безработица",
      de: "agentur arbeit arbeitslosengeld arbeitslos",
    },
  },
  {
    id: "tax",
    audience: ["personal"],
    category: "tax",
    status: "login",
    href: "/steuer",
    name: { bg: "Данъчни документи 2025", de: "Steuerunterlagen 2025" },
    summary: {
      bg: "Подготовка и официален PDF, който ти преглеждаш и одобряваш. Без подаване през ELSTER и без данъчен съвет.",
      de: "Vorbereitung und amtliches PDF, das du prüfst und bestätigst. Ohne ELSTER-Übermittlung und ohne Steuerberatung.",
    },
    includes: {
      bg: [
        "Подготовка на документите",
        "Официален PDF",
        "Твоето одобрение преди изтегляне",
        "Без подаване през ELSTER",
      ],
      de: [
        "Unterlagen vorbereiten",
        "Amtliches PDF",
        "Deine Bestätigung vor dem Download",
        "Ohne ELSTER-Übermittlung",
      ],
    },
    terms: {
      bg: "данък данъци декларация finanzamt elster pdf",
      de: "steuer steuern steuererklärung finanzamt elster pdf",
    },
  },
  {
    id: "contracts",
    audience: ["personal", "business"],
    category: "contracts",
    status: "login",
    href: "/vertraege",
    name: { bg: "Управление на договори", de: "Vertragsverwaltung" },
    summary: {
      bg: "Архив на договорите с документирани данни и срокове, за да не изпуснеш прекратяване.",
      de: "Archiv deiner Verträge mit belegten Angaben und Fristen, damit du keine Kündigung verpasst.",
    },
    includes: {
      bg: [
        "Архив на договори",
        "Документирани данни за всеки договор",
        "Срокове за прекратяване",
        "Преглед на месечните разходи",
      ],
      de: [
        "Vertragsarchiv",
        "Belegte Angaben je Vertrag",
        "Kündigungsfristen",
        "Überblick über monatliche Kosten",
      ],
    },
    terms: {
      bg: "договор прекратяване срок разход архив",
      de: "vertrag kündigung frist kosten archiv",
    },
  },
  {
    id: "cancellation",
    audience: ["personal"],
    category: "contracts",
    status: "login",
    href: "/vertraege",
    name: { bg: "Подготовка на прекратяване", de: "Kündigung vorbereiten" },
    summary: {
      bg: "Чернова, преглед и PDF за изтегляне. Изпращането остава твое решение — HORIZON не изпраща автоматично.",
      de: "Entwurf, Prüfung und PDF zum Download. Das Versenden bleibt deine Entscheidung — HORIZON versendet nicht automatisch.",
    },
    includes: {
      bg: [
        "Чернова за прекратяване",
        "Твоят преглед и одобрение",
        "PDF за изтегляне",
        "Без автоматично изпращане",
      ],
      de: [
        "Kündigungsentwurf",
        "Deine Prüfung und Bestätigung",
        "PDF zum Download",
        "Ohne automatischen Versand",
      ],
    },
    terms: {
      bg: "прекратяване договор писмо pdf изтегляне",
      de: "kündigung vertrag brief pdf download",
    },
  },
  {
    id: "ai-assistant",
    audience: ["personal"],
    category: "roadmap",
    status: "roadmap",
    name: { bg: "HORIZON AI асистент", de: "HORIZON KI-Assistent" },
    summary: {
      bg: "Асистент, който отговаря по твоите потвърдени данни. Още не е активен — конфигурацията на доставчика предстои.",
      de: "Ein Assistent, der auf Grundlage deiner bestätigten Daten antwortet. Noch nicht aktiv — die Anbieterkonfiguration steht aus.",
    },
    includes: {
      bg: ["Отговори по потвърдените ти данни", "Още не е активиран"],
      de: ["Antworten zu deinen bestätigten Daten", "Noch nicht aktiviert"],
    },
    terms: {
      bg: "асистент ai чатбот въпрос предстои",
      de: "assistent ki chatbot frage geplant",
    },
  },
  {
    id: "business-consultant",
    audience: ["business"],
    category: "roadmap",
    status: "roadmap",
    name: { bg: "HORIZON бизнес консултант", de: "HORIZON Unternehmensberater" },
    summary: {
      bg: "Планиран модул за фирмени въпроси. Още не е издаден и не може да се използва.",
      de: "Geplantes Modul für betriebliche Fragen. Noch nicht veröffentlicht und nicht nutzbar.",
    },
    includes: {
      bg: ["Фирмени въпроси", "Планиран, още не е издаден"],
      de: ["Betriebliche Fragen", "Geplant, noch nicht veröffentlicht"],
    },
    terms: {
      bg: "фирма бизнес консултант планиран",
      de: "firma business unternehmen beratung geplant",
    },
  },
  {
    id: "business-admin",
    audience: ["business"],
    category: "roadmap",
    status: "roadmap",
    name: { bg: "Бизнес администрация и E-Rechnung", de: "Betriebsverwaltung und E-Rechnung" },
    summary: {
      bg: "Планирана администрация за фирми, включително електронни фактури. Още не е издадена.",
      de: "Geplante Verwaltung für Betriebe, einschließlich elektronischer Rechnungen. Noch nicht veröffentlicht.",
    },
    includes: {
      bg: ["Фирмена администрация", "Електронни фактури", "Планиран, още не е издаден"],
      de: ["Betriebsverwaltung", "Elektronische Rechnungen", "Geplant, noch nicht veröffentlicht"],
    },
    terms: {
      bg: "бизнес администрация фактура планиран",
      de: "betrieb verwaltung rechnung e-rechnung geplant",
    },
  },
  {
    id: "institutional-integrations",
    audience: ["personal", "business"],
    category: "roadmap",
    status: "roadmap",
    name: { bg: "Интеграции с институции и доставчици", de: "Integrationen mit Stellen und Anbietern" },
    summary: {
      bg: "По-дълбоки връзки с институции и доставчици. Планирани, още не са издадени.",
      de: "Tiefergehende Anbindungen an Stellen und Anbieter. Geplant, noch nicht veröffentlicht.",
    },
    includes: {
      bg: ["Връзки с институции", "Връзки с доставчици", "Планирани, още не са издадени"],
      de: ["Anbindungen an Stellen", "Anbindungen an Anbieter", "Geplant, noch nicht veröffentlicht"],
    },
    terms: {
      bg: "интеграция институция доставчик планиран",
      de: "integration stelle anbieter geplant",
    },
  },
  ...horizonServiceCenterEntries,
]

export type ServiceCenterCopy = {
  back: string
  eyebrow: string
  title: string
  intro: string
  searchLabel: string
  searchPlaceholder: string
  audienceLabel: string
  audience: Record<ServiceAudience | "all", string>
  categoryLabel: string
  category: Record<ServiceCategory | "all", string>
  status: Record<ServiceStatus, string>
  statusHint: Record<ServiceStatus, string>
  includesLabel: string
  detailsLabel: string
  openLabel: string
  closeLabel: string
  emptyTitle: string
  emptyBody: string
  resetLabel: string
  resultsLabel: (count: number) => string
  processTitle: string
  processIntro: string
  process: readonly string[]
  limitsTitle: string
  limits: readonly string[]
  noticeTitle: string
  notice: string
}

export const serviceCenterCopy: Record<Locale, ServiceCenterCopy> = {
  bg: {
    back: "Към началото",
    eyebrow: "HORIZON Service Center",
    title: "Какво може HORIZON",
    intro:
      "Всички услуги на едно място: какво работи веднага, какво иска вход, какво зависи от партньор и какво тепърва предстои. Филтрирай по категория или търси по име.",
    searchLabel: "Търси услуга",
    searchPlaceholder: "Например: договор, данъци, писмо",
    audienceLabel: "За кого",
    audience: { all: "Всички", personal: "Лично", business: "За фирма" },
    categoryLabel: "Категория",
    category: {
      all: "Всички",
      guide: "Guide",
      documents: "Документи",
      authorities: "Институции",
      tax: "Данъци",
      contracts: "Договори",
      learning: "Обучение",
      insurance: "Застраховки",
      roadmap: "Предстои",
    },
    status: {
      available: "Достъпно",
      login: "Изисква вход",
      partner: "Зависи от партньор",
      roadmap: "В разработка",
    },
    statusHint: {
      available: "Отваря се веднага, без вход.",
      login: "Нужен е профил, за да работиш с данните си.",
      partner: "Офертите зависят от одобрени партньорски предложения.",
      roadmap: "Планирано. Още не е активно и не може да се отвори.",
    },
    includesLabel: "Какво включва",
    detailsLabel: "Детайли",
    openLabel: "Отвори",
    closeLabel: "Затвори",
    emptyTitle: "Няма съвпадение",
    emptyBody: "Промени търсенето или махни филтъра, за да видиш повече услуги.",
    resetLabel: "Изчисти филтрите",
    resultsLabel: (count: number) => (count === 1 ? "1 услуга" : `${count} услуги`),
    processTitle: "Как минава всеки случай",
    processIntro: "Един и същ ред за всяка услуга, за да остане решението твое.",
    process: [
      "Разбираме какво пише в документа.",
      "Анализираме го спрямо твоята ситуация.",
      "Обясняваме го разбираемо, с източници.",
      "Ти преглеждаш резултата.",
      "Ти одобряваш всеки следващ ход.",
      "Изпълнението минава само по одобрен канал и статусът се връща към теб.",
    ],
    limitsTitle: "Какво HORIZON не прави",
    limits: [
      "Не подава автоматично до институции.",
      "Не изпраща писма автоматично.",
      "Не подава през ELSTER.",
      "Не обещава спестяване или одобрение.",
      "Не дава правен, данъчен или застрахователен съвет.",
    ],
    noticeTitle: "Важно",
    notice:
      "HORIZON подрежда, обяснява и подготвя. Не взема автоматични решения. Не заменя данъчна, правна или социална консултация. HORIZON не е застраховател и не обещава цена, спестяване или одобрение. Партньорските връзки са означени.",
  },
  de: {
    back: "Zur Startseite",
    eyebrow: "HORIZON Service Center",
    title: "Was HORIZON kann",
    intro:
      "Alle Leistungen an einem Ort: was sofort funktioniert, was eine Anmeldung braucht, was von einem Partner abhängt und was erst geplant ist. Filtere nach Kategorie oder suche nach Namen.",
    searchLabel: "Leistung suchen",
    searchPlaceholder: "Zum Beispiel: Vertrag, Steuern, Brief",
    audienceLabel: "Für wen",
    audience: { all: "Alle", personal: "Privat", business: "Für Betriebe" },
    categoryLabel: "Kategorie",
    category: {
      all: "Alle",
      guide: "Guide",
      documents: "Dokumente",
      authorities: "Behörden",
      tax: "Steuern",
      contracts: "Verträge",
      learning: "Lernen",
      insurance: "Versicherungen",
      roadmap: "Geplant",
    },
    status: {
      available: "Verfügbar",
      login: "Anmeldung nötig",
      partner: "Partnerabhängig",
      roadmap: "In Entwicklung",
    },
    statusHint: {
      available: "Öffnet sich sofort, ohne Anmeldung.",
      login: "Ein Konto ist nötig, um mit deinen Daten zu arbeiten.",
      partner: "Angebote hängen von freigegebenen Partnerangeboten ab.",
      roadmap: "Geplant. Noch nicht aktiv und nicht zu öffnen.",
    },
    includesLabel: "Was enthalten ist",
    detailsLabel: "Details",
    openLabel: "Öffnen",
    closeLabel: "Schließen",
    emptyTitle: "Kein Treffer",
    emptyBody: "Ändere die Suche oder entferne den Filter, um mehr Leistungen zu sehen.",
    resetLabel: "Filter zurücksetzen",
    resultsLabel: (count: number) => (count === 1 ? "1 Leistung" : `${count} Leistungen`),
    processTitle: "So läuft jeder Vorgang",
    processIntro: "Derselbe Ablauf für jede Leistung, damit die Entscheidung bei dir bleibt.",
    process: [
      "Wir erfassen, was im Dokument steht.",
      "Wir prüfen es gegen deine Situation.",
      "Wir erklären es verständlich, mit Quellen.",
      "Du siehst dir das Ergebnis an.",
      "Du bestätigst jeden nächsten Schritt.",
      "Ausgeführt wird nur über einen freigegebenen Kanal, und der Status kommt zu dir zurück.",
    ],
    limitsTitle: "Was HORIZON nicht tut",
    limits: [
      "Keine automatische Übermittlung an Behörden.",
      "Kein automatischer Briefversand.",
      "Keine Übermittlung über ELSTER.",
      "Kein Versprechen von Ersparnis oder Genehmigung.",
      "Keine Rechts-, Steuer- oder Versicherungsberatung.",
    ],
    noticeTitle: "Wichtig",
    notice:
      "HORIZON ordnet, erklärt und bereitet vor. Es trifft keine automatischen Entscheidungen und ersetzt keine Steuer-, Rechts- oder Sozialberatung. HORIZON ist kein Versicherer und verspricht keinen Preis, keine Ersparnis und keine Genehmigung. Partnerlinks sind gekennzeichnet.",
  },
}

/** Whether an entry should be offered to the selected audience. */
export function servesAudience(entry: ServiceEntry, audience: ServiceAudience | "all"): boolean {
  return audience === "all" || entry.audience.includes(audience)
}

/**
 * Substring filter over the entry's name, summary and search terms in one locale.
 *
 * The name and summary are what the requirement asks to match; the terms carry the
 * synonyms a person actually types ("Kündigung" for the contract tools), so the
 * search finds a service by the word in the user's head rather than the one the
 * catalogue happens to use.
 */
export function filterServiceCenter(options: {
  locale: Locale
  query?: string
  audience?: ServiceAudience | "all"
  category?: ServiceCategory | "all"
}): ServiceEntry[] {
  const { locale, query = "", audience = "all", category = "all" } = options
  const term = query.trim().toLocaleLowerCase(locale)
  return serviceCenterEntries.filter((entry) => {
    if (!servesAudience(entry, audience)) return false
    if (category !== "all" && entry.category !== category) return false
    if (!term) return true
    const haystack = `${entry.name[locale]} ${entry.summary[locale]} ${entry.terms[locale]}`.toLocaleLowerCase(locale)
    return haystack.includes(term)
  })
}
