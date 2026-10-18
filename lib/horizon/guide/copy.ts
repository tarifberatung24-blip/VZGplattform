import type { Locale } from "@/lib/i18n/dictionaries"
import type { GuideIntent } from "./intents"

export type GuideCopy = {
  brand: string
  brandNote: string
  title: string
  intro: string
  chooseLabel: string
  chooseHint: string
  benefitsLabel: string
  benefitsText: string
  jobcenterCta: string
  arbeitsagenturCta: string
  readinessTitle: string
  readinessHint: string
  profileReady: string
  profileNeedsData: string
  documentsReady: string
  documentsEmpty: string
  profileCta: string
  documentsCta: string
  openCasesTitle: string
  openCasesEmpty: string
  openCasesHint: string
  continueLabel: string
  starting: string
  startError: string
  moduleLabel: string
  createdLabel: string
  backToGuide: string
  statusLabel: string
  intents: Record<GuideIntent, { title: string; text: string }>
}

export const guideModules: Record<Locale, Record<string, string>> = {
  bg: {
    agentur_fuer_arbeit: "Агенция по заетостта",
    jobcenter: "Джобцентър",
    kuendigung: "Прекратяване на договор",
    steuererklaerung: "Данъчна декларация",
    unterlagen_erklaeren: "Обяснение на документи",
    contract_management: "Управление на договори",
    general: "Общо запитване",
  },
  de: {
    agentur_fuer_arbeit: "Agentur für Arbeit",
    jobcenter: "Jobcenter",
    kuendigung: "Kündigung",
    steuererklaerung: "Steuererklärung",
    unterlagen_erklaeren: "Unterlagen erklären",
    contract_management: "Vertragsverwaltung",
    general: "Allgemeines Anliegen",
  },
}

const copies: Record<Locale, GuideCopy> = {
  bg: {
    brand: "HORIZON by VZG",
    brandNote: "VZG CONSULT",
    title: "Здравейте, с какво да помогна?",
    intro: "Избери ситуацията, която е най-близо до твоята. HORIZON ще отвори правилния път и ще те води стъпка по стъпка.",
    chooseLabel: "Какво искаш да направиш?",
    chooseHint: "Не е нужно да познаваш функциите на HORIZON.",
    benefitsLabel: "Имаш въпрос към Jobcenter или Arbeitsagentur?",
    benefitsText: "Избери институцията. HORIZON ще те насочи към подходяща задача, официален път и нужните документи.",
    jobcenterCta: "Отвори Jobcenter",
    arbeitsagenturCta: "Отвори Arbeitsagentur",
    readinessTitle: "Какво HORIZON вече може да използва",
    readinessHint: "Това е ориентир за подготовка, не потвърждение за право на помощ.",
    profileReady: "Има основни данни за домакинството и дохода.",
    profileNeedsData: "Липсват основни данни за домакинството или дохода.",
    documentsReady: "Има качени документи, които можеш да прегледаш.",
    documentsEmpty: "Все още няма качени документи.",
    profileCta: "Отвори профила",
    documentsCta: "Отвори документи",
    openCasesTitle: "Твоите случаи",
    openCasesEmpty: "Още няма започнати случаи.",
    openCasesHint: "Всеки избор създава случай, който можеш да продължиш по-късно.",
    continueLabel: "Продължи",
    starting: "Отваряне…",
    startError: "Случаят не можа да бъде отворен. Опитай отново.",
    moduleLabel: "Област",
    createdLabel: "Създаден",
    backToGuide: "Назад към водача",
    statusLabel: "Състояние",
    intents: {
      understand_document: {
        title: "Получих писмо или документ",
        text: "Качи го или постави текста. Ще видиш какво означава, има ли срок и каква е следващата стъпка.",
      },
      reply_to_authority: {
        title: "Имам срок или трябва да отговоря",
        text: "Подготви отговор и го прегледай, преди да решиш дали да го изпратиш.",
      },
      fill_official_form: {
        title: "Искам да кандидатствам за помощ",
        text: "Ще уточним каква е ситуацията ти, какви документи може да са нужни и откъде да започнеш.",
      },
      cancel_contract: {
        title: "Искам да прекратя договор",
        text: "Провери данните от договора и подготви предизвестие за свой преглед.",
      },
      unsure: {
        title: "Не знам какво да правя",
        text: "Започни с няколко думи за ситуацията. Не избирай институция или формуляр на сляпо.",
      },
    },
  },
  de: {
    brand: "HORIZON by VZG",
    brandNote: "VZG CONSULT",
    title: "Hallo, wie kann ich helfen?",
    intro: "Wähle die Situation, die deiner am nächsten kommt. HORIZON öffnet den passenden Weg und führt dich Schritt für Schritt.",
    chooseLabel: "Was möchtest du tun?",
    chooseHint: "Du musst die Funktionen von HORIZON nicht kennen.",
    benefitsLabel: "Hast du ein Anliegen beim Jobcenter oder bei der Arbeitsagentur?",
    benefitsText: "Wähle die Institution. HORIZON führt dich zur passenden Aufgabe, zum offiziellen Weg und zu möglichen Unterlagen.",
    jobcenterCta: "Jobcenter öffnen",
    arbeitsagenturCta: "Arbeitsagentur öffnen",
    readinessTitle: "Was HORIZON bereits verwenden kann",
    readinessHint: "Dies ist eine Orientierung für die Vorbereitung, keine Bestätigung eines Leistungsanspruchs.",
    profileReady: "Grunddaten zu Haushalt und Einkommen sind vorhanden.",
    profileNeedsData: "Grunddaten zu Haushalt oder Einkommen fehlen noch.",
    documentsReady: "Es gibt hochgeladene Dokumente, die du prüfen kannst.",
    documentsEmpty: "Es wurden noch keine Dokumente hochgeladen.",
    profileCta: "Profil öffnen",
    documentsCta: "Dokumente öffnen",
    openCasesTitle: "Deine Vorgänge",
    openCasesEmpty: "Noch keine Vorgänge begonnen.",
    openCasesHint: "Jede Auswahl legt einen Vorgang an, den du später fortsetzen kannst.",
    continueLabel: "Fortsetzen",
    starting: "Wird geöffnet…",
    startError: "Der Vorgang konnte nicht geöffnet werden. Bitte erneut versuchen.",
    moduleLabel: "Bereich",
    createdLabel: "Erstellt",
    backToGuide: "Zurück zur Übersicht",
    statusLabel: "Status",
    intents: {
      understand_document: {
        title: "Ich habe einen Brief oder ein Dokument bekommen",
        text: "Lade es hoch oder füge den Text ein. Du siehst, was es bedeutet, ob es eine Frist gibt und was als Nächstes ansteht.",
      },
      reply_to_authority: {
        title: "Ich habe eine Frist oder muss antworten",
        text: "Bereite eine Antwort vor und prüfe sie, bevor du entscheidest, ob du sie versendest.",
      },
      fill_official_form: {
        title: "Ich möchte eine Hilfe beantragen",
        text: "Wir klären deine Situation, welche Unterlagen nötig sein können und wo du anfangen kannst.",
      },
      cancel_contract: {
        title: "Ich möchte einen Vertrag kündigen",
        text: "Prüfe die Vertragsdaten und bereite eine Kündigung für deine Prüfung vor.",
      },
      unsure: {
        title: "Ich weiß nicht weiter",
        text: "Beginne mit ein paar Worten zu deiner Situation. Wähle keine Behörde oder kein Formular auf Verdacht.",
      },
    },
  },
}

export function getGuideCopy(locale: Locale): GuideCopy {
  return copies[locale] ?? copies.bg
}

/**
 * "not started" marker and the counted case label.
 *
 * The count is rendered as a numeric badge beside an inflected noun, never as
 * a slash-joined pair: Bulgarian uses the counted form "случая" for any count
 * other than one, while German inflects the noun itself (Vorgang/Vorgänge).
 */
export function caseCountNoun(locale: Locale, count: number): string {
  if (locale === "de") return count === 1 ? "Vorgang" : "Vorgänge"
  return count === 1 ? "случай" : "случая"
}

export function notStartedLabel(locale: Locale): string {
  return locale === "de" ? "Noch nicht begonnen" : "Още не е започнат"
}

export function caseCountLabel(locale: Locale, count: number): string {
  if (count <= 0) return notStartedLabel(locale)
  return `${count} ${caseCountNoun(locale, count)}`
}

export function guideModuleLabel(locale: Locale, module: string): string {
  return (guideModules[locale] ?? guideModules.bg)[module] ?? module
}

/**
 * Human labels for the canonical HORIZON case lifecycle.
 *
 * The case header used to print the stored enum verbatim, so a German interface
 * showed a bare `draft`. Keys are exactly `HORIZON_CASE_STATUSES`; an unknown
 * value falls back to the raw string rather than inventing a state.
 */
const caseStatusLabels: Record<Locale, Record<string, string>> = {
  de: {
    draft: "Entwurf",
    collecting_data: "Angaben werden gesammelt",
    waiting_for_user: "Wartet auf dich",
    processing: "Wird verarbeitet",
    draft_ready: "Entwurf bereit",
    review: "In Prüfung",
    approved: "Freigegeben",
    action_ready: "Versandbereit",
    completed: "Abgeschlossen",
    cancelled: "Abgebrochen",
  },
  bg: {
    draft: "Чернова",
    collecting_data: "Събират се данни",
    waiting_for_user: "Чака теб",
    processing: "Обработва се",
    draft_ready: "Черновата е готова",
    review: "В преглед",
    approved: "Одобрен",
    action_ready: "Готов за изпращане",
    completed: "Завършен",
    cancelled: "Отказан",
  },
}

/** Status of a stored source document (`source_documents.status`). */
const documentStatusLabels: Record<Locale, Record<string, string>> = {
  de: {
    UPLOADED: "Hochgeladen",
    EXTRACTING: "Text wird gelesen",
    READY: "Gelesen",
    NEEDS_CONFIRMATION: "Prüfung nötig",
    FAILED: "Fehlgeschlagen",
  },
  bg: {
    UPLOADED: "Качен",
    EXTRACTING: "Текстът се чете",
    READY: "Прочетен",
    NEEDS_CONFIRMATION: "Нужна е проверка",
    FAILED: "Неуспешно",
  },
}

/** Status of a case task (`tasks.status`). */
const taskStatusLabels: Record<Locale, Record<string, string>> = {
  de: {
    pending: "Offen",
    running: "Läuft",
    completed: "Erledigt",
    failed: "Fehlgeschlagen",
    cancelled: "Abgebrochen",
  },
  bg: {
    pending: "Отворена",
    running: "В ход",
    completed: "Изпълнена",
    failed: "Неуспешна",
    cancelled: "Отказана",
  },
}

/** Kind of a case task (`tasks.type`). */
const taskTypeLabels: Record<Locale, Record<string, string>> = {
  de: { reminder: "Erinnerung", human_review: "Manuelle Prüfung" },
  bg: { reminder: "Напомняне", human_review: "Ръчна проверка" },
}

/** Outcome of a draft review (`correspondence_drafts.review_status`). */
const draftReviewStatusLabels: Record<Locale, Record<string, string>> = {
  de: { pending: "Prüfung offen", pass: "Prüfung bestanden", revise: "Überarbeiten", block: "Blockiert" },
  bg: { pending: "Чака проверка", pass: "Проверката е успешна", revise: "За преработка", block: "Блокиран" },
}

function label(
  table: Record<Locale, Record<string, string>>,
  locale: Locale,
  value: string,
): string {
  return (table[locale] ?? table.bg)[value] ?? value
}

export const caseStatusLabel = (locale: Locale, status: string) =>
  label(caseStatusLabels, locale, status)
export const documentStatusLabel = (locale: Locale, status: string) =>
  label(documentStatusLabels, locale, status)
export const taskStatusLabel = (locale: Locale, status: string) =>
  label(taskStatusLabels, locale, status)
export const taskTypeLabel = (locale: Locale, type: string) =>
  label(taskTypeLabels, locale, type)
export const draftReviewStatusLabel = (locale: Locale, status: string) =>
  label(draftReviewStatusLabels, locale, status)

/**
 * Human labels for the required-fact keys the engine reports as missing.
 *
 * The missing-information panel printed the raw key, so a German user saw
 * `recipient_institution`. Keys mirror `REQUIRED_FACT_KEYS`; an unknown key
 * falls back to the raw key.
 */
const factKeyLabels: Record<Locale, Record<string, string>> = {
  de: {
    recipient_institution: "Empfänger / Behörde",
    claim_type: "Art des Antrags",
    contract_provider: "Anbieter des Vertrags",
    contract_reference: "Vertragsnummer",
    tax_year: "Steuerjahr",
    agentur_task: "Aufgabe bei der Agentur für Arbeit",
    jobcenter_task: "Aufgabe beim Jobcenter",
    contact_first_name: "Vorname",
    contact_last_name: "Nachname",
    contact_email: "E-Mail",
    contact_mobile: "Mobilnummer",
    birth_date: "Geburtsdatum",
    energy_type: "Energieart",
    current_provider: "Aktueller Anbieter",
    postcode: "Postleitzahl",
    annual_consumption_kwh: "Jahresverbrauch in kWh",
    monthly_payment_eur: "Monatlicher Abschlag in EUR",
    contract_information: "Vertragsinformation",
    submitted_document_type: "Hochgeladene Unterlagen",
  },
  bg: {
    recipient_institution: "Получател / институция",
    claim_type: "Вид на заявлението",
    contract_provider: "Доставчик на договора",
    contract_reference: "Номер на договора",
    tax_year: "Данъчна година",
    agentur_task: "Задача в Агенцията по заетостта",
    jobcenter_task: "Задача в Джобцентъра",
    contact_first_name: "Собствено име",
    contact_last_name: "Фамилия",
    contact_email: "Имейл",
    contact_mobile: "Мобилен телефон",
    birth_date: "Дата на раждане",
    energy_type: "Вид енергия",
    current_provider: "Настоящ доставчик",
    postcode: "Пощенски код",
    annual_consumption_kwh: "Годишно потребление в kWh",
    monthly_payment_eur: "Месечна вноска в EUR",
    contract_information: "Информация за договора",
    submitted_document_type: "Качен тип документ",
  },
}

export const factKeyLabel = (locale: Locale, key: string) =>
  label(factKeyLabels, locale, key)
