export const serviceRequestKinds = ["energy", "kfz", "credit", "schufa"] as const

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
}

export function isServiceRequestKind(value: unknown): value is ServiceRequestKind {
  return typeof value === "string" && serviceRequestKinds.includes(value as ServiceRequestKind)
}
