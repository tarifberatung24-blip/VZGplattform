import type { Locale } from "@/lib/i18n/dictionaries"
import type { GuideIntent } from "./intents"

export type GuideCopy = {
  brand: string
  brandNote: string
  title: string
  intro: string
  chooseLabel: string
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
    title: "Откъде да започна?",
    intro: "Избери какво искаш да направиш. Ще отворим случай и ще те водим стъпка по стъпка.",
    chooseLabel: "Какво искаш да направиш?",
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
        title: "Разбери документ",
        text: "Качи писмо, снимка или текст и виж какво означава на твоя език.",
      },
      reply_to_authority: {
        title: "Отговори на институция",
        text: "Подготви отговор и го прегледай, преди да го изпратиш.",
      },
      fill_official_form: {
        title: "Попълни официален формуляр",
        text: "Попълни германски формуляр стъпка по стъпка.",
      },
      cancel_contract: {
        title: "Прекрати договор",
        text: "Подготви предизвестие само по данните от договора.",
      },
      unsure: {
        title: "Не знам какво да правя",
        text: "Опиши ситуацията си и ще започнем оттам.",
      },
    },
  },
  de: {
    brand: "HORIZON by VZG",
    brandNote: "VZG CONSULT",
    title: "Wo soll ich anfangen?",
    intro: "Wähle, was du tun möchtest. Wir öffnen einen Vorgang und führen dich Schritt für Schritt.",
    chooseLabel: "Was möchtest du tun?",
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
        title: "Dokument verstehen",
        text: "Lade einen Brief, ein Foto oder Text hoch und lies, was er bedeutet.",
      },
      reply_to_authority: {
        title: "Behörde antworten",
        text: "Bereite eine Antwort vor und prüfe sie vor dem Versand.",
      },
      fill_official_form: {
        title: "Amtliches Formular ausfüllen",
        text: "Fülle ein deutsches Formular Schritt für Schritt aus.",
      },
      cancel_contract: {
        title: "Vertrag kündigen",
        text: "Bereite die Kündigung nur aus den Vertragsdaten vor.",
      },
      unsure: {
        title: "Ich weiß nicht weiter",
        text: "Beschreibe deine Situation, und wir starten dort.",
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
  },
  bg: {
    recipient_institution: "Получател / институция",
    claim_type: "Вид на заявлението",
    contract_provider: "Доставчик на договора",
    contract_reference: "Номер на договора",
    tax_year: "Данъчна година",
    agentur_task: "Задача в Агенцията по заетостта",
    jobcenter_task: "Задача в Джобцентъра",
  },
}

export const factKeyLabel = (locale: Locale, key: string) =>
  label(factKeyLabels, locale, key)