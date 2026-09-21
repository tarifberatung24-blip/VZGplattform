import type { Locale } from "@/lib/i18n/dictionaries"
import type { AgenturRouteKind, AgenturTask } from "./registry"

/**
 * P12 copy, in the two active UI languages.
 *
 * Kept in a typed module beside the registry rather than in `messages/*.json`
 * because these strings are coupled to the registry's own vocabulary: a task
 * added there must not be able to render without a label, and a `Record<AgenturTask, …>`
 * makes that a compile error instead of a missing-key fallback. The explanation
 * text is deliberately about *what the user must do next*, never about what they
 * are entitled to receive.
 */
export type AgenturCopy = {
  heading: string
  intro: string
  chooseLabel: string
  choose: string
  choosePending: string
  currentTask: string
  changeTask: string
  errorUnauthorized: string
  errorUnknownTask: string
  errorFailed: string
  errorCaseNotFound: string
  routeLabel: string
  routeKinds: Record<AgenturRouteKind, string>
  onlineLabel: string
  infoLabel: string
  phoneLabel: string
  noPaperForm: string
  formHeading: string
  formFillable: string
  formManualOnly: string
  formOpenLabel: string
  tasks: Record<AgenturTask, { title: string; text: string }>
}

export const agenturCopy: Record<Locale, AgenturCopy> = {
  de: {
    heading: "Agentur für Arbeit",
    intro:
      "Wähle dein Anliegen. HORIZON zeigt dir den aktuellen offiziellen Weg und fragt nur, was für diesen Schritt wirklich nötig ist.",
    chooseLabel: "Dein Anliegen",
    choose: "Anliegen übernehmen",
    choosePending: "Wird übernommen …",
    currentTask: "Gewähltes Anliegen",
    changeTask: "Anderes Anliegen wählen",
    errorUnauthorized: "Bitte zuerst anmelden.",
    errorUnknownTask: "Unbekanntes Anliegen.",
    errorFailed: "Das Anliegen konnte nicht gespeichert werden.",
    errorCaseNotFound: "Vorgang nicht gefunden.",
    routeLabel: "Offizieller Weg",
    routeKinds: {
      online_only: "Nur online – die Agentur für Arbeit bietet dafür kein Papierformular an.",
      online_preferred:
        "Online ist der empfohlene Weg. Ein amtliches Papierformular gibt es nur für einzelne Schritte.",
      online_with_form:
        "Die Änderung kann online mitgeteilt werden; für denselben Zweck gibt es auch ein amtliches Formular.",
    },
    onlineLabel: "Offizieller Online-Dienst",
    infoLabel: "Offizielle Informationen",
    phoneLabel: "Telefonisch",
    noPaperForm:
      "Für dieses Anliegen gibt es kein amtliches Formular zum Ausfüllen. HORIZON erfindet keines, sondern führt dich zum offiziellen Online-Dienst.",
    formHeading: "Amtliches Formular",
    formFillable:
      "Dieses amtliche Formular wurde geprüft und kann vorbereitet werden. Online bleibt der empfohlene Weg.",
    formManualOnly:
      "Dieses amtliche Formular wird nicht automatisch ausgefüllt. Der Link führt zur offiziellen Fassung.",
    formOpenLabel: "Amtliche Fassung öffnen",
    tasks: {
      arbeitsuchend_melden: {
        title: "Arbeitsuchend melden",
        text: "Der erste Schritt, sobald du weißt, dass dein Arbeitsverhältnis endet.",
      },
      arbeitslos_melden: {
        title: "Arbeitslos melden",
        text: "Die Meldung bei der Agentur für Arbeit, sobald du arbeitslos bist.",
      },
      arbeitslosengeld_beantragen: {
        title: "Arbeitslosengeld beantragen",
        text: "Der Antrag selbst – online, mit den Angaben zu deiner Situation.",
      },
      veraenderungen_mitteilen: {
        title: "Veränderungen mitteilen",
        text: "Änderungen, die für laufende Leistungen wichtig sind, zeitnah weitergeben.",
      },
    },
  },
  bg: {
    heading: "Агенция по заетостта",
    intro:
      "Избери своето искане. HORIZON ще покаже актуалния официален път и ще пита само това, което е наистина нужно за тази стъпка.",
    chooseLabel: "Твоето искане",
    choose: "Приеми искането",
    choosePending: "Приема се …",
    currentTask: "Избрано искане",
    changeTask: "Избери друго искане",
    errorUnauthorized: "Моля, първо влез в профила си.",
    errorUnknownTask: "Непознато искане.",
    errorFailed: "Искането не можа да бъде запазено.",
    errorCaseNotFound: "Случаят не е намерен.",
    routeLabel: "Официален път",
    routeKinds: {
      online_only: "Само онлайн – Агенцията по заетостта не предлага хартиен формуляр за това.",
      online_preferred:
        "Онлайн е препоръчаният път. Официален хартиен формуляр има само за отделни стъпки.",
      online_with_form:
        "Промяната може да се съобщи онлайн; за същата цел има и официален формуляр.",
    },
    onlineLabel: "Официална онлайн услуга",
    infoLabel: "Официална информация",
    phoneLabel: "По телефон",
    noPaperForm:
      "За това искане няма официален формуляр за попълване. HORIZON не измисля такъв, а те насочва към официалната онлайн услуга.",
    formHeading: "Официален формуляр",
    formFillable:
      "Този официален формуляр е проверен и може да бъде подготвен. Онлайн остава препоръчаният път.",
    formManualOnly:
      "Този официален формуляр не се попълва автоматично. Връзката води към официалната версия.",
    formOpenLabel: "Отвори официалната версия",
    tasks: {
      arbeitsuchend_melden: {
        title: "Регистриране като търсещ работа",
        text: "Първата стъпка, щом знаеш, че трудовият ти договор приключва.",
      },
      arbeitslos_melden: {
        title: "Регистриране като безработен",
        text: "Съобщаването в Агенцията по заетостта, когато си безработен.",
      },
      arbeitslosengeld_beantragen: {
        title: "Заявление за обезщетение за безработица",
        text: "Самото заявление – онлайн, с данните за твоята ситуация.",
      },
      veraenderungen_mitteilen: {
        title: "Съобщаване на промени",
        text: "Промени, важни за текущи плащания, да се съобщят навреме.",
      },
    },
  },
}

export function getAgenturCopy(locale: Locale): AgenturCopy {
  return agenturCopy[locale] ?? agenturCopy.bg
}
