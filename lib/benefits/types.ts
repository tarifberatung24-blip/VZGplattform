export const BENEFIT_ANSWER_KEYS = [
  "has_children",
  "children_under_18",
  "monthly_income_under_1500",
  "pays_rent",
  "currently_unemployed",
  "has_disability_or_special_needs",
] as const

export type BenefitAnswerKey = (typeof BENEFIT_ANSWER_KEYS)[number]
export type BenefitAnswers = Record<BenefitAnswerKey, boolean>

export type BenefitKey =
  | "kindergeld"
  | "wohngeld"
  | "buergergeld"
  | "kinderzuschlag"
  | "bildung_und_teilhabe"
  | "behindertenhilfe"

export interface EligibleBenefit {
  key: BenefitKey
  title: string
  shortLabel: string
  explanation: string
  nextStep: string
  confidence: "likely" | "possible"
}

export interface BenefitCheckRecord {
  id: string
  user_id: string
  answers: BenefitAnswers
  eligible_benefits: EligibleBenefit[]
  rules_version: string
  created_at: string
}

export interface BenefitCheckResponse {
  check: BenefitCheckRecord
}
