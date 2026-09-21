import type { Locale } from "@/lib/i18n/dictionaries"
import type { JobcenterRouteKind, JobcenterTask } from "./registry"

/**
 * P13 copy, in the two active UI languages.
 *
 * Held beside the registry rather than in `messages/*.json` for the same reason as
 * P12's: the strings are coupled to the registry's vocabulary, so a
 * `Record<JobcenterTask, …>` turns an unlabelled task into a compile error instead
 * of a raw key appearing in the UI. The explanation text describes what the user
 * must do next, never what they are entitled to receive.
 */
export type JobcenterCopy = {
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
  routeKinds: Record<JobcenterRouteKind, string>
  onlineLabel: string
  infoLabel: string
  phoneLabel: string
  noPaperForm: string
  formHeading: string
  formFillable: string
  formOpenLabel: string
  formsBlankNote: string
  anlagenHeading: string
  anlagenNone: string
  anlagenIntro: string
  tasks: Record<JobcenterTask, { title: string; text: string }>
}

export const jobcenterCopy: Record<Locale, JobcenterCopy> = {
  de: {
    heading: "Jobcenter",
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
      online_preferred:
        "Online ist der empfohlene Weg. Das amtliche Papierformular bleibt zusätzlich gültig.",
      online_only:
        "Nur online – für dieses Anliegen gibt es keine aktuelle amtliche PDF-Fassung.",
    },
    onlineLabel: "Offizieller Online-Dienst",
    infoLabel: "Offizielle Informationen",
    phoneLabel: "Telefonisch",
    noPaperForm:
      "Für dieses Anliegen gibt es keine aktuelle amtliche PDF-Fassung. HORIZON erfindet keine und führt dich stattdessen zum offiziellen Online-Dienst.",
    formHeading: "Amtliches Formular",
    formFillable:
      "Dieses amtliche Formular wurde geprüft und kann vorbereitet werden. Online bleibt der empfohlene Weg.",
    formOpenLabel: "Amtliche Fassung öffnen",
    formsBlankNote:
      "Nur bestätigte Angaben werden eingesetzt. Ankreuzfelder bleiben leer, weil HORIZON nicht rät, welche Situation bei dir zutrifft.",
    anlagenHeading: "Zusätzlich nötige Anlagen",
    anlagenNone:
      "Nach den bestätigten Angaben ist derzeit keine zusätzliche Anlage erkennbar. Fehlende Angaben bleiben unberücksichtigt.",
    anlagenIntro:
      "Diese Anlagen ergeben sich aus deinen bestätigten Angaben. Sie werden nicht automatisch ausgefüllt.",
    tasks: {
      erstantrag: {
        title: "Erstantrag stellen",
        text: "Der erste Antrag auf Grundsicherungsgeld für deine Bedarfsgemeinschaft.",
      },
      weiterbewilligung: {
        title: "Weiterbewilligung beantragen",
        text: "Wenn der bewilligte Zeitraum endet und du weiter Unterstützung brauchst.",
      },
      veraenderung_mitteilen: {
        title: "Veränderung mitteilen",
        text: "Änderungen, die für laufende Leistungen wichtig sind, unverzüglich weitergeben.",
      },
    },
  },
  bg: {
    heading: "Джобцентър",
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
      online_preferred:
        "Онлайн е препоръчаният път. Официалният хартиен формуляр остава валиден допълнително.",
      online_only:
        "Само онлайн – за това искане няма актуален официален PDF вариант.",
    },
    onlineLabel: "Официална онлайн услуга",
    infoLabel: "Официална информация",
    phoneLabel: "По телефон",
    noPaperForm:
      "За това искане няма актуален официален PDF вариант. HORIZON не измисля такъв, а те насочва към официалната онлайн услуга.",
    formHeading: "Официален формуляр",
    formFillable:
      "Този официален формуляр е проверен и може да бъде подготвен. Онлайн остава препоръчаният път.",
    formOpenLabel: "Отвори официалната версия",
    formsBlankNote:
      "Въвеждат се само потвърдени данни. Полетата за отметка остават празни, защото HORIZON не предполага кой случай се отнася за теб.",
    anlagenHeading: "Допълнително необходими приложения",
    anlagenNone:
      "Според потвърдените данни в момента не се вижда допълнително приложение. Липсващите данни не се отчитат.",
    anlagenIntro:
      "Тези приложения следват от твоите потвърдени данни. Те не се попълват автоматично.",
    tasks: {
      erstantrag: {
        title: "Първоначално заявление",
        text: "Първото заявление за основно осигуряване за твоята група от лица.",
      },
      weiterbewilligung: {
        title: "Заявление за продължаване",
        text: "Когато одобреният период изтича и ти трябва още подкрепа.",
      },
      veraenderung_mitteilen: {
        title: "Съобщаване на промяна",
        text: "Промени, важни за текущи плащания, да се съобщят незабавно.",
      },
    },
  },
}

export function getJobcenterCopy(locale: Locale): JobcenterCopy {
  return jobcenterCopy[locale] ?? jobcenterCopy.bg
}
