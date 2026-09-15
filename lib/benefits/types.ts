import type { BenefitCheckState } from "@/lib/status"

/** Stable Yes/No answer keys for the Anspruch screening quiz. */
export type BenefitAnswerKey =
  | "lives_in_germany"
  | "has_children"
  | "children_in_household"
  | "pays_rent"
  | "income_tight_vs_costs"
  | "has_earned_income"
  | "little_or_no_work_income"
  | "receives_buergergeld"
  | "is_single_parent"
  | "pregnancy_or_infant"

export type BenefitAnswers = Record<BenefitAnswerKey, boolean>

export type BenefitId =
  | "kindergeld"
  | "kinderzuschlag"
  | "wohngeld"
  | "buergergeld"
  | "elterngeld"
  | "bildung_und_teilhabe"

export type BenefitResult = {
  benefitId: BenefitId
  titleDe: string
  titleBg: string
  state: BenefitCheckState
  /** Machine-readable matched rule — never a legal determination. */
  reasonCode: string
  explanationDe: string
  explanationBg: string
  nextStepRoute: string
  officialInfoUrl: string
}

export type BenefitCheckRecord = {
  id: string
  user_id: string
  answers: BenefitAnswers
  results: BenefitResult[]
  rule_version: string
  created_at: string
}

export type SaveBenefitCheckInput = {
  answers: BenefitAnswers
}

export type SaveBenefitCheckResult =
  | { ok: true; check: BenefitCheckRecord }
  | { ok: false; code: "AUTH_REQUIRED" | "INVALID_ANSWERS" | "SCHEMA_MISSING" | "SAVE_FAILED" }
