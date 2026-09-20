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