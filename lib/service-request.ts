export const serviceRequestKinds = [
  "energy",
  "kfz",
  "credit",
  "schufa",
  "wohnungsanmeldung",
  "abmeldung_ummeldung",
  "steuererklaerung",
  "krankenkassenwechsel",
  "gewerbeanmeldung",
  "fuehrerschein_umschreibung",
  "aufenthaltstitel",
  "beglaubigungen_uebersetzungen",
] as const

export type ServiceRequestKind = (typeof serviceRequestKinds)[number]
export type ServiceRequestLocale = "bg" | "de"

export const serviceRequestMeta: Record<ServiceRequestKind, {
  labelBg: string
  labelDe: string
  promiseBg: string
  promiseDe: string
}> = {
  energy: {
    labelBg: "Ток / Газ",
    labelDe: "Strom / Gas",
    promiseBg: "до 2 часа по-добра оферта или ясен отговор",
    promiseDe: "innerhalb von 2 Stunden ein besseres Angebot oder eine klare Antwort",
  },
  kfz: {
    labelBg: "Kfz застраховка",
    labelDe: "Kfz-Versicherung",
    promiseBg: "до 2 часа сравнение за твоя автомобил",
    promiseDe: "innerhalb von 2 Stunden ein Vergleich fuer dein Fahrzeug",
  },
  credit: {
    labelBg: "Потребителски кредит",
    labelDe: "Ratenkredit",
    promiseBg: "до 2 часа предварително подредени кредитни опции",
    promiseDe: "innerhalb von 2 Stunden vorbereitete Kreditoptionen",
  },
  schufa: {
    labelBg: "SCHUFA проверка",
    labelDe: "SCHUFA-Auskunft",
    promiseBg: "до 2 часа насока коя справка ти трябва",
    promiseDe: "innerhalb von 2 Stunden Orientierung zur passenden Auskunft",
  },
  wohnungsanmeldung: {
    labelBg: "Wohnsitzanmeldung",
    labelDe: "Wohnsitzanmeldung",
    promiseBg: "безплатна подготовка и проверка на документите в HORIZON",
    promiseDe: "kostenlose Vorbereitung und Dokumentenprüfung in HORIZON",
  },
  abmeldung_ummeldung: {
    labelBg: "Abmeldung / Ummeldung",
    labelDe: "Abmeldung / Ummeldung",
    promiseBg: "безплатна класификация и подготовка на заявката",
    promiseDe: "kostenlose Klassifizierung und Vorbereitung der Anfrage",
  },
  steuererklaerung: {
    labelBg: "Steuererklärung",
    labelDe: "Steuererklärung",
    promiseBg: "безплатна подготовка от потвърдени данни",
    promiseDe: "kostenlose Vorbereitung aus bestätigten Daten",
  },
  krankenkassenwechsel: {
    labelBg: "Смяна на Krankenkasse",
    labelDe: "Krankenkassenwechsel",
    promiseBg: "безплатен план за сравнение и следващи стъпки",
    promiseDe: "kostenloser Vergleichsplan und nächste Schritte",
  },
  gewerbeanmeldung: {
    labelBg: "Gewerbeanmeldung",
    labelDe: "Gewerbeanmeldung",
    promiseBg: "безплатна подготовка и проверка за липси",
    promiseDe: "kostenlose Vorbereitung und Prüfung auf fehlende Angaben",
  },
  fuehrerschein_umschreibung: {
    labelBg: "Прехвърляне на книжка",
    labelDe: "Führerschein-Umschreibung",
    promiseBg: "безплатна проверка на изискванията и документите",
    promiseDe: "kostenlose Prüfung der Voraussetzungen und Unterlagen",
  },
  aufenthaltstitel: {
    labelBg: "Aufenthaltstitel",
    labelDe: "Aufenthaltstitel",
    promiseBg: "безплатна подготовка и маркиране на критични липси",
    promiseDe: "kostenlose Vorbereitung und Markierung kritischer Lücken",
  },
  beglaubigungen_uebersetzungen: {
    labelBg: "Заверки и преводи",
    labelDe: "Beglaubigungen & Übersetzungen",
    promiseBg: "безплатна класификация и подготовка за партньор",
    promiseDe: "kostenlose Klassifizierung und Vorbereitung für einen Partner",
  },
}

export function isServiceRequestKind(value: unknown): value is ServiceRequestKind {
  return typeof value === "string" && serviceRequestKinds.includes(value as ServiceRequestKind)
}
