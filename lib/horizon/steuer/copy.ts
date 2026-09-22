import type { Locale } from "@/lib/i18n/dictionaries"
import type { TaxYearState } from "./registry"

/**
 * P15 copy, in the two active UI languages.
 *
 * Held beside the registry rather than in `messages/*.json` for the same reason as
 * P12's and P13's: the strings are coupled to the registry's vocabulary, so a
 * `Record<TaxYearState, …>` turns an unlabelled state into a compile error instead
 * of a raw key appearing in the UI.
 *
 * Every sentence here describes what the user must do next. None of them states an
 * entitlement, a threshold, an amount or a refund, because the registry does not
 * know any of those and inventing one would be fabrication.
 */
export type SteuerCopy = {
  heading: string
  intro: string
  chooseLabel: string
  choose: string
  choosePending: string
  currentYear: string
  changeYear: string
  errorUnsupportedYear: string
  errorUnknownYear: string
  errorUnauthorized: string
  errorCaseNotFound: string
  errorFailed: string
  yearStates: Record<TaxYearState, string>
  formsHeading: string
  formFillable: string
  formManualOnly: string
  formOpenLabel: string
  noFormForYear: string
  formsBlankNote: string
  anlagenHeading: string
  anlagenNone: string
  anlagenIntro: string
  officialRouteHeading: string
  officialOnlineLabel: string
  officialFormsLabel: string
  noElsterNote: string
  signatureHeading: string
  signatureAvailable: string
  signatureUnavailable: string
  downloadHeading: string
  downloadHint: string
}

export const steuerCopy: Record<Locale, SteuerCopy> = {
  de: {
    heading: "Steuererklärung",
    intro:
      "Wähle zuerst das Steuerjahr. HORIZON zeigt dir die amtlichen Formulare, die für dieses Jahr geprüft vorliegen, und fragt nur, was für sie wirklich nötig ist.",
    chooseLabel: "Steuerjahr",
    choose: "Steuerjahr übernehmen",
    choosePending: "Wird übernommen …",
    currentYear: "Gewähltes Steuerjahr",
    changeYear: "Anderes Steuerjahr wählen",
    errorUnsupportedYear:
      "Für dieses Steuerjahr ist noch keine amtliche Fassung veröffentlicht. Es werden keine Angaben aus einem anderen Jahr übernommen.",
    errorUnknownYear:
      "Dieses Steuerjahr wird nicht vorbereitet. Es werden keine Angaben aus einem anderen Jahr übernommen.",
    errorUnauthorized: "Bitte zuerst anmelden.",
    errorCaseNotFound: "Vorgang nicht gefunden.",
    errorFailed: "Das Steuerjahr konnte nicht gespeichert werden.",
    yearStates: {
      supported: "Geprüfte amtliche Formulare liegen vor.",
      not_yet_published: "Amtlich noch nicht veröffentlicht.",
      out_of_scope: "Wird nicht vorbereitet.",
    },
    formsHeading: "Amtliche Formulare für dieses Jahr",
    formFillable:
      "Dieses Formular kann HORIZON vorbereiten. Es werden ausschließlich bestätigte Angaben eingesetzt; fehlende bleiben leer.",
    formManualOnly:
      "Dieses Formular liegt amtlich vor, wird aber nicht automatisch ausgefüllt. Bitte über den amtlichen Weg verwenden.",
    formOpenLabel: "Amtliche Quelle öffnen",
    noFormForYear:
      "Für dieses Steuerjahr liegt keine geprüfte amtliche Vorlage vor. Es wird nichts geschätzt und nichts aus einem anderen Jahr übernommen.",
    formsBlankNote:
      "HORIZON trägt keine Werte ein, die nicht durch deine bestätigten Angaben belegt sind.",
    anlagenHeading: "Zusätzliche Anlagen",
    anlagenNone:
      "Aus deinen bestätigten Angaben ergibt sich derzeit keine zusätzliche Anlage. Unbeantwortete Fragen zählen nicht als Ja.",
    anlagenIntro:
      "Diese Anlagen ergeben sich aus deinen bestätigten Angaben. Prüfe vor der Abgabe, ob sie zu deiner Situation passen.",
    officialRouteHeading: "Amtlicher Weg",
    officialOnlineLabel: "Amtliches Online-Portal öffnen",
    officialFormsLabel: "Amtliche Formulare und Merkblätter",
    noElsterNote:
      "HORIZON übermittelt nichts an das Finanzamt und hat keine ELSTER-Anbindung. Die Abgabe erfolgt durch dich über den amtlichen Weg.",
    signatureHeading: "Sichtbare Signatur",
    signatureAvailable:
      "Für dieses Formular ist die Signaturposition geprüft. Eine sichtbare Signatur kann nach der Freigabe gesetzt werden.",
    signatureUnavailable:
      "Für dieses Formular ist keine Signaturposition geprüft. HORIZON setzt keine Signatur an einer geschätzten Stelle.",
    downloadHeading: "Paket herunterladen",
    downloadHint:
      "Der Download ist erst nach Prüfung und ausdrücklicher Freigabe möglich. Freigaben gelten nur für den exakt freigegebenen Inhalt.",
  },
  bg: {
    heading: "Данъчна декларация",
    intro:
      "Първо избери данъчната година. HORIZON ще ти покаже официалните формуляри, които са проверени за тази година, и ще пита само каквото е наистина нужно.",
    chooseLabel: "Данъчна година",
    choose: "Запази данъчната година",
    choosePending: "Запазва се …",
    currentYear: "Избрана данъчна година",
    changeYear: "Избери друга данъчна година",
    errorUnsupportedYear:
      "За тази данъчна година още няма публикувана официална версия. Не се пренасят данни от друга година.",
    errorUnknownYear:
      "Тази данъчна година не се подготвя. Не се пренасят данни от друга година.",
    errorUnauthorized: "Първо влез в профила си.",
    errorCaseNotFound: "Случаят не е намерен.",
    errorFailed: "Данъчната година не беше запазена.",
    yearStates: {
      supported: "Има проверени официални формуляри.",
      not_yet_published: "Още не е публикувана официално.",
      out_of_scope: "Не се подготвя.",
    },
    formsHeading: "Официални формуляри за тази година",
    formFillable:
      "Този формуляр HORIZON може да подготви. Вписват се само потвърдени данни; липсващите остават празни.",
    formManualOnly:
      "Този формуляр съществува официално, но не се попълва автоматично. Използвай официалния път.",
    formOpenLabel: "Отвори официалния източник",
    noFormForYear:
      "За тази данъчна година няма проверен официален образец. Нищо не се нагажда приблизително и не се пренася от друга година.",
    formsBlankNote:
      "HORIZON не вписва стойности, които не са подкрепени от твоите потвърдени данни.",
    anlagenHeading: "Допълнителни приложения",
    anlagenNone:
      "От потвърдените ти данни засега не следва допълнително приложение. Неотговорените въпроси не се броят за „да“.",
    anlagenIntro:
      "Тези приложения следват от потвърдените ти данни. Провери преди подаване дали отговарят на ситуацията ти.",
    officialRouteHeading: "Официален път",
    officialOnlineLabel: "Отвори официалния онлайн портал",
    officialFormsLabel: "Официални формуляри и указания",
    noElsterNote:
      "HORIZON не подава нищо до Finanzamt и няма ELSTER интеграция. Подаването се извършва от теб по официалния път.",
    signatureHeading: "Видим подпис",
    signatureAvailable:
      "За този формуляр позицията на подписа е проверена. Видим подпис може да бъде поставен след одобрение.",
    signatureUnavailable:
      "За този формуляр няма проверена позиция на подписа. HORIZON не поставя подпис на предполагаемо място.",
    downloadHeading: "Изтегли пакета",
    downloadHint:
      "Изтеглянето е възможно само след преглед и изрично одобрение. Одобрението важи само за точно одобреното съдържание.",
  },
}

export function getSteuerCopy(locale: Locale): SteuerCopy {
  return steuerCopy[locale]
}
