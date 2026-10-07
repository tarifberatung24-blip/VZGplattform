/**
 * P17 — deterministic contract review and action board.
 *
 * This module is pure: it turns an already-extracted contract analysis into the
 * facts HORIZON shows, the concrete next steps it can offer, the information it
 * is missing, and the risk flags it can evidence. It never reads a document,
 * calls a provider, or invents a value.
 *
 * The governing rule is the same one the rest of P17 follows: a claim is made
 * only when the document or the user supplied it. A notice period is **not**
 * derived from a category, a savings figure is **never** computed here, and a
 * deadline is labelled with the date the document actually states rather than a
 * date HORIZON calculated.
 */

import { validIsoDate } from "./linkage"

/** The fields a contract analysis can carry, mirroring `contractExtractionSchema`. */
export type ContractReviewFacts = {
  title: string
  category: string
  provider: string
  contractNumber: string
  monthlyAmount: number | null
  startDate: string
  endDate: string
  cancellationDeadline: string
  summary: string
  confidence: number | null
  evidence: string[]
  /** Optional provider answers the document already contains. */
  nextSteps?: string[]
  riskFlags?: string[]
}

export type ContractBoard = "good" | "attention" | "urgent"

/** A next step that is offered, never executed. `view` names the existing action. */
export type ContractNextStep = {
  id: string
  view: "review_facts" | "add_reminder" | "optimize_tariff" | "prepare_kuendigung" | "explain"
  titleKey: string
  detailKey: string
}

export type ContractMissingField =
  | "provider"
  | "monthlyAmount"
  | "endDate"
  | "cancellationDeadline"
  | "startDate"

export type ContractMissingInfo = {
  complete: boolean
  fields: ContractMissingField[]
  /** How many of the four fields that drive reminders and actions are present. */
  present: number
  total: number
}

export type ContractRiskLevel = "info" | "attention" | "urgent"

export type ContractRiskFlag = {
  id: string
  level: ContractRiskLevel
  titleKey: string
  detailKey: string
  /** Document snippets that justify the flag; empty when nothing was quoted. */
  evidence: string[]
}

const RISK_SEVERITY: Record<ContractRiskLevel, number> = { info: 0, attention: 1, urgent: 2 }

/** The board is driven by whether the user can rely on the extracted facts. */
export function boardForFacts(facts: ContractReviewFacts): ContractBoard {
  if (facts.confidence != null && facts.confidence < 0.5) return "urgent"
  return "attention"
}

export function boardForContract(
  contract: { review_status?: "needs_review" | "confirmed" | null; extraction_confidence?: number | null },
): ContractBoard {
  if (contract.review_status === "confirmed") return "good"
  if (contract.extraction_confidence != null && contract.extraction_confidence < 0.5) return "attention"
  return "urgent"
}

export function deriveMissingInfo(facts: ContractReviewFacts): ContractMissingInfo {
  const present: Record<ContractMissingField, boolean> = {
    provider: Boolean(facts.provider?.trim()),
    monthlyAmount: facts.monthlyAmount != null && facts.monthlyAmount > 0,
    startDate: Boolean(validIsoDate(facts.startDate)),
    endDate: Boolean(validIsoDate(facts.endDate)),
    cancellationDeadline: Boolean(validIsoDate(facts.cancellationDeadline)),
  }
  const fields = (Object.keys(present) as ContractMissingField[]).filter((field) => !present[field])
  return { complete: fields.length === 0, fields, present: Object.keys(present).length - fields.length, total: Object.keys(present).length }
}

export function deriveNextSteps(facts: ContractReviewFacts): ContractNextStep[] {
  const steps: ContractNextStep[] = [
    { id: "review", view: "review_facts", titleKey: "stepReviewFactsTitle", detailKey: "stepReviewFactsDetail" },
  ]
  const missing = deriveMissingInfo(facts)
  if (missing.fields.length > 0) {
    steps.push({ id: "fill", view: "review_facts", titleKey: "completeFactsTitle", detailKey: "completeFactsDetail" })
  }
  if (facts.cancellationDeadline) {
    steps.push({ id: "reminder", view: "add_reminder", titleKey: "stepReminderTitle", detailKey: "stepReminderDetail" })
  }
  steps.push({ id: "optimize", view: "optimize_tariff", titleKey: "stepOptimizeTitle", detailKey: "stepOptimizeDetail" })
  steps.push({ id: "kuendigung", view: "prepare_kuendigung", titleKey: "kuendigungTitle", detailKey: "kuendigungDetail" })
  return steps.slice(0, 3)
}

/**
 * Evidence-backed risk flags. Each flag fires only from a value present in the
 * analysis; `unconfirmed` and `low_confidence` describe the review state itself.
 */
export function deriveRiskFlags(facts: ContractReviewFacts): ContractRiskFlag[] {
  const flags: ContractRiskFlag[] = []
  const evidence = facts.evidence ?? []
  const endDate = validIsoDate(facts.endDate)
  const cancellationDeadline = validIsoDate(facts.cancellationDeadline)

  if (facts.confidence != null && facts.confidence < 0.5) {
    flags.push({ id: "low_confidence", level: "urgent", titleKey: "riskLowConfidenceTitle", detailKey: "riskLowConfidenceDetail", evidence })
  }
  if (!endDate && !cancellationDeadline) {
    flags.push({ id: "missing_dates", level: "attention", titleKey: "riskMissingDatesTitle", detailKey: "riskMissingDatesDetail", evidence })
  }
  if (endDate && cancellationDeadline && cancellationDeadline > endDate) {
    flags.push({ id: "deadline_after_end", level: "attention", titleKey: "riskDeadlineAfterEndTitle", detailKey: "riskDeadlineAfterEndDetail", evidence })
  }
  if (facts.monthlyAmount != null && facts.monthlyAmount <= 0) {
    flags.push({ id: "zero_cost", level: "attention", titleKey: "riskZeroCostTitle", detailKey: "riskZeroCostDetail", evidence })
  }
  if (facts.monthlyAmount == null) {
    flags.push({ id: "missing_cost", level: "info", titleKey: "riskMissingCostTitle", detailKey: "riskMissingCostDetail", evidence })
  }
  for (const [index] of (facts.riskFlags ?? []).entries()) {
    flags.push({ id: `provider_${index}`, level: "attention", titleKey: "riskProviderFlagTitle", detailKey: "riskProviderFlagDetail", evidence })
  }

  return flags.sort((a, b) => RISK_SEVERITY[b.level] - RISK_SEVERITY[a.level])
}
