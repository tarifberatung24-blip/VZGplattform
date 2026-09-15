export const TAX_RULES_VERSION = "2024-2025-kb-v1"
export const ARBEITNEHMER_PAUSCHBETRAG = 1230
export const HOME_OFFICE_RATE = 6
export const HOME_OFFICE_MAX_DAYS = 210
export const HOME_OFFICE_MAX_AMOUNT = 1260
export const CHILDCARE_RATE_2024 = 2 / 3
export const CHILDCARE_RATE_2025 = 0.8
export const CHILDCARE_CAP_2024 = 4000
export const CHILDCARE_CAP_2025 = 4800

export type TaxYear = 2024 | 2025
export type ScreeningStatus = "review_possible" | "not_indicated" | "unknown"

export interface TaxInputs {
  taxYear: TaxYear
  residenceCountry: string
  taxLiability: "unlimited" | "limited" | "unknown"
  steuerklasse: number | null
  commuteDistanceKm: number
  officeDays: number
  homeOfficeDays: number
  workEquipment: number
  workClothing: number
  training: number
  otherProfessionalExpenses: number
  childcare: number
  medicalAndInsurance: number
}

export interface TaxCalculation {
  rulesVersion: string
  status: ScreeningStatus
  arbeitnehmerPauschbetrag: number
  documentedProfessionalExpenses: number
  professionalExpensesAbovePauschbetrag: number
  entfernungspauschale: number
  homeOfficeDaysAccepted: number
  homeOfficeAmount: number
  childcareDocumented: number
  childcareRecognizedScreening: number
  specialExpenses: number
  extraordinaryBurdens: number
  documentedExpensesTotal: number
  reviewReasons: string[]
  warnings: string[]
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function roundEuro(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateTaxAssessment(inputs: TaxInputs): TaxCalculation {
  const distance = nonNegative(inputs.commuteDistanceKm)
  const officeDays = nonNegative(inputs.officeDays)
  const homeOfficeDays = nonNegative(inputs.homeOfficeDays)
  const professionalExpenses = [inputs.workEquipment, inputs.workClothing, inputs.training, inputs.otherProfessionalExpenses]
    .map(nonNegative)
    .reduce((sum, amount) => sum + amount, 0)

  // §9 EStG screening rule: only one-way distance is used. The 0.38 rate starts at km 21.
  const firstTwentyKm = Math.min(distance, 20) * 0.3
  const remainingKm = Math.max(distance - 20, 0) * 0.38
  const entfernungspauschale = roundEuro((firstTwentyKm + remainingKm) * officeDays)

  // Homeoffice: 6 EUR per accepted day, capped at 210 days / 1,260 EUR.
  const homeOfficeDaysAccepted = Math.min(Math.floor(homeOfficeDays), HOME_OFFICE_MAX_DAYS)
  const homeOfficeAmount = Math.min(homeOfficeDaysAccepted * HOME_OFFICE_RATE, HOME_OFFICE_MAX_AMOUNT)

  const childcareCap = inputs.taxYear === 2025 ? CHILDCARE_CAP_2025 : CHILDCARE_CAP_2024
  const childcareRate = inputs.taxYear === 2025 ? CHILDCARE_RATE_2025 : CHILDCARE_RATE_2024
  const childcareDocumented = nonNegative(inputs.childcare)
  const childcareRecognizedScreening = roundEuro(Math.min(childcareDocumented * childcareRate, childcareCap))
  const extraordinaryBurdens = nonNegative(inputs.medicalAndInsurance)
  const specialExpenses = roundEuro(childcareRecognizedScreening + extraordinaryBurdens)
  const documentedProfessionalExpenses = roundEuro(professionalExpenses + entfernungspauschale + homeOfficeAmount)
  const professionalExpensesAbovePauschbetrag = roundEuro(Math.max(documentedProfessionalExpenses - ARBEITNEHMER_PAUSCHBETRAG, 0))
  const documentedExpensesTotal = roundEuro(documentedProfessionalExpenses + specialExpenses)

  const reviewReasons: string[] = []
  const warnings: string[] = []
  if (professionalExpensesAbovePauschbetrag > 0) reviewReasons.push("Доказуемите професионални разходи надвишават Arbeitnehmer-Pauschbetrag от 1 230 EUR.")
  if (homeOfficeDays > HOME_OFFICE_MAX_DAYS) warnings.push("Дните home office са ограничени до 210 допустими дни.")
  if (inputs.homeOfficeDays > 0 && inputs.officeDays > 0) warnings.push("Проверете календарите: един и същ ден не трябва да се брои едновременно за home office и посещение на първото работно място.")
  if (inputs.taxLiability === "unknown") warnings.push("Данъчната задълженост не е уточнена; резултатът е само предварителен screening.")
  if (!inputs.residenceCountry.trim() || inputs.steuerklasse === null) warnings.push("Липсват данни за данъчно местоживеене или Steuerklasse.")

  return {
    rulesVersion: TAX_RULES_VERSION,
    status: reviewReasons.length > 0 ? "review_possible" : "not_indicated",
    arbeitnehmerPauschbetrag: ARBEITNEHMER_PAUSCHBETRAG,
    documentedProfessionalExpenses,
    professionalExpensesAbovePauschbetrag,
    entfernungspauschale,
    homeOfficeDaysAccepted,
    homeOfficeAmount,
    childcareDocumented,
    childcareRecognizedScreening,
    specialExpenses,
    extraordinaryBurdens,
    documentedExpensesTotal,
    reviewReasons,
    warnings,
  }
}
