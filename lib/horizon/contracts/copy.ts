import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * P17 copy, in the two active UI languages.
 *
 * The wording here is deliberately careful about two things the directive calls
 * out. First, the archive shows only what is evidenced: a missing cost reads as
 * "not recorded", never as an estimate. Second, an unconfirmed date is labelled
 * as awaiting confirmation, so a deadline read out of a document but not yet
 * checked is never presented as though it were firm.
 */
export type ContractsCopy = {
  heading: string
  intro: string
  startKuendigung: string
  starting: string
  unconfirmedWarning: string
  verifiedNote: string
  noCost: string
  costLabel: string
  archiveEmpty: string
  openCase: string
  linkFailed: string
  contractNotFound: string
  createFailed: string
  neutralAnalysis: string
}

export const contractsCopy: Record<Locale, ContractsCopy> = {
  de: {
    heading: "Verträge",
    intro:
      "Das Vertragsarchiv zeigt Anbieter, Kategorie, Kosten und Daten so, wie sie erfasst wurden. HORIZON ergänzt keine Preise, keine Laufzeiten und keine Kündigungstermine.",
    startKuendigung: "Kündigung vorbereiten",
    starting: "Wird vorbereitet …",
    unconfirmedWarning:
      "Diese Daten sind noch nicht bestätigt. HORIZON übernimmt sie in einen Vorgang, verlangt dort aber deine Prüfung, bevor daraus ein Termin wird.",
    verifiedNote: "Bestätigte Angaben",
    noCost: "Keine Kosten erfasst",
    costLabel: "Monatliche Kosten",
    archiveEmpty: "Noch keine Verträge erfasst.",
    openCase: "Vorgang öffnen",
    linkFailed: "Der Vorgang konnte nicht erstellt werden. Bitte erneut versuchen.",
    contractNotFound: "Vertrag nicht gefunden.",
    createFailed: "Vorgang konnte nicht erstellt werden.",
    neutralAnalysis:
      "Die Vertragsanalyse ist neutral und stützt sich nur auf erfasste Daten. Angebote sind davon getrennt und beeinflussen die Analyse nicht.",
  },
  bg: {
    heading: "Договори",
    intro:
      "Архивът на договорите показва доставчик, категория, разходи и дати така, както са въведени. HORIZON не добавя цени, срокове или дати за прекратяване.",
    startKuendigung: "Подготви прекратяване",
    starting: "Подготвя се …",
    unconfirmedWarning:
      "Тези данни още не са потвърдени. HORIZON ги пренася в случай, но там изисква твоята проверка, преди да стане дата.",
    verifiedNote: "Потвърдени данни",
    noCost: "Няма въведени разходи",
    costLabel: "Месечни разходи",
    archiveEmpty: "Още няма въведени договори.",
    openCase: "Отвори случая",
    linkFailed: "Случаят не можа да бъде създаден. Опитай отново.",
    contractNotFound: "Договорът не е намерен.",
    createFailed: "Случаят не можа да бъде създаден.",
    neutralAnalysis:
      "Анализът на договорите е неутрален и се основава само на въведени данни. Офертите са отделно и не влияят на анализа.",
  },
}

export function getContractsCopy(locale: Locale): ContractsCopy {
  return contractsCopy[locale]
}
