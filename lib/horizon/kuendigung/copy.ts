import type { Locale } from "@/lib/i18n/dictionaries"
import type { KuendigungTimingKind } from "./facts"

/**
 * P14 copy, in the two active UI languages.
 *
 * Held beside the workflow rather than in `messages/*.json` so that the timing
 * vocabulary is a `Record<KuendigungTimingKind, …>`: a new timing kind becomes a
 * compile error here rather than an unlabelled string in the interface.
 *
 * Every string describes what the user must do or check. None of them asserts
 * that a contract has been cancelled, and none presents a calculated date as a
 * certainty.
 */
export type KuendigungCopy = {
  heading: string
  intro: string
  generate: string
  generatePending: string
  regenerate: string
  errorUnauthorized: string
  errorCaseNotFound: string
  errorFailed: string
  errorNotReady: string
  readyHeading: string
  notReadyHeading: string
  missingHeading: string
  missingIntro: string
  timingHeading: string
  timingLabel: string
  timingKind: Record<KuendigungTimingKind, string>
  documentedDate: string
  requiresVerification: string
  omittedHeading: string
  omittedIntro: string
  draftHeading: string
  draftIntro: string
  download: string
  downloadGated: string
  notSent: string
  noInvention: string
}

export const kuendigungCopy: Record<Locale, KuendigungCopy> = {
  de: {
    heading: "Vertrag kündigen",
    intro:
      "HORIZON liest deinen Vertrag, trennt bestätigte von unbestätigten Angaben und erstellt daraus eine deutsche Kündigung. Fristen und Daten werden nur übernommen, wenn sie belegt sind.",
    generate: "Kündigung vorbereiten",
    generatePending: "Wird vorbereitet …",
    regenerate: "Kündigung neu vorbereiten",
    errorUnauthorized: "Bitte zuerst anmelden.",
    errorCaseNotFound: "Vorgang nicht gefunden.",
    errorFailed: "Die Kündigung konnte nicht vorbereitet werden.",
    errorNotReady:
      "Es fehlen noch bestätigte Angaben. Bitte die offenen Punkte zuerst ergänzen und bestätigen.",
    readyHeading: "Angaben vollständig",
    notReadyHeading: "Es fehlen noch Angaben",
    missingHeading: "Offene Punkte",
    missingIntro:
      "HORIZON fragt nur nach dem, was für diese Kündigung wirklich nötig ist. Nichts wird abgeleitet oder geraten.",
    timingHeading: "Frist und Wirksamkeitsdatum",
    timingLabel: "Grundlage",
    timingKind: {
      documented: "Aus deinem Vertragsdokument",
      user_confirmed_verified: "Von dir selbst geprüft und bestätigt",
      calculated_max_notice: "Aus der gesetzlichen Höchstgrenze abgeleitet",
      unconfirmed: "Nicht belegt – offene Formulierung",
    },
    documentedDate: "Datum",
    requiresVerification:
      "Dieses Datum ist nicht gesichert. Bitte prüfe es anhand deines Vertrags, bevor du die Kündigung absendest.",
    omittedHeading: "Nicht belegte Angaben",
    omittedIntro:
      "Diese Angaben wurden nicht in den Brief übernommen, weil sie nicht belegt oder nicht bestätigt sind.",
    draftHeading: "Kündigung",
    draftIntro:
      "Der Brief wurde ausschließlich aus bestätigten Angaben erstellt. Prüfe ihn und gib ihn anschließend ausdrücklich frei.",
    download: "Kündigung als PDF herunterladen",
    downloadGated:
      "Der Brief kann erst heruntergeladen werden, wenn genau dieser Inhalt freigegeben ist.",
    notSent:
      "Eine Kündigung ist erst wirksam, wenn der Anbieter den Zugang bestätigt. Das Vorbereiten oder Senden eines Briefes ersetzt diese Bestätigung nicht.",
    noInvention:
      "HORIZON erfindet keine Kündigungsfrist, kein Vertragsende und keine Empfängeradresse.",
  },
  bg: {
    heading: "Прекратяване на договор",
    intro:
      "HORIZON прочита договора ти, разделя потвърдените от непотвърдените данни и изготвя немско предизвестие. Срокове и дати се въвеждат само когато са доказани.",
    generate: "Изготви предизвестие",
    generatePending: "Изготвя се …",
    regenerate: "Изготви предизвестието отново",
    errorUnauthorized: "Моля, първо влез в профила си.",
    errorCaseNotFound: "Случаят не е намерен.",
    errorFailed: "Предизвестието не можа да бъде изготвено.",
    errorNotReady:
      "Все още липсват потвърдени данни. Моля, първо допълни и потвърди отворените точки.",
    readyHeading: "Данните са пълни",
    notReadyHeading: "Все още липсват данни",
    missingHeading: "Отворени точки",
    missingIntro:
      "HORIZON пита само за това, което е наистина нужно за това предизвестие. Нищо не се извежда или предполага.",
    timingHeading: "Срок и дата на влизане в сила",
    timingLabel: "Основание",
    timingKind: {
      documented: "От твоя договорен документ",
      user_confirmed_verified: "Проверено и потвърдено от теб",
      calculated_max_notice: "Изведено от законовата горна граница",
      unconfirmed: "Недоказано – отворена формулировка",
    },
    documentedDate: "Дата",
    requiresVerification:
      "Тази дата не е сигурна. Моля, провери я в договора си, преди да изпратиш предизвестието.",
    omittedHeading: "Недоказани данни",
    omittedIntro:
      "Тези данни не бяха включени в писмото, защото не са доказани или потвърдени.",
    draftHeading: "Предизвестие",
    draftIntro:
      "Писмото е изготвено само от потвърдени данни. Прегледай го и след това го освободи изрично.",
    download: "Изтегли предизвестието като PDF",
    downloadGated:
      "Писмото може да се изтегли едва когато точно това съдържание е освободено.",
    notSent:
      "Едно предизвестие е в сила едва когато доставчикът потвърди получаването. Изготвянето или изпращането на писмо не замества това потвърждение.",
    noInvention:
      "HORIZON не измисля срок за предизвестие, крайна дата на договора или адрес на получател.",
  },
}

export function getKuendigungCopy(locale: Locale): KuendigungCopy {
  return kuendigungCopy[locale] ?? kuendigungCopy.de
}