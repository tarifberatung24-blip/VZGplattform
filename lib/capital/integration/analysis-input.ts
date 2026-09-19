/**
 * CapitalAnalysisInput builder.
 *
 * Turns a household's source bundle into the deterministic engine's input:
 * validated, household-scoped facts plus explicit missing/unconfirmed inputs.
 * A missing financial value is never defaulted — it is reported as a named
 * missing input.
 */

import {
  type CapitalAnalysisInput,
  type CapitalAssumption,
  type CapitalMissingInput,
} from "../boundaries"
import { CAPITAL_ENGINE_VERSION, CAPITAL_FACT_KEYS, type CapitalGoalInput } from "../engine"
import { isUsableForAnalysis, type FinancialFact } from "../financial-fact"
import { validateFinancialFact } from "../validation"
import { adaptContract, adaptDocumentReview, adaptExtractedFact } from "./source-adapters"
import type { CapitalAdapterIssue, CapitalSourceBundle } from "./source-contracts"

export type BuildAnalysisInputOptions = {
  /** Engine/rule version recorded on the input for reproducibility. */
  engineVersion?: string
  /** Scenario currency; must match the facts' currency for monetary inputs. */
  currency?: string
  locale?: string
  /** Explicit, owner-supplied assumptions; never inferred by the builder. */
  assumptions?: readonly CapitalAssumption[]
  /** Goal definitions whose fact keys are expected in the source data. */
  goals?: readonly CapitalGoalInput[]
  /**
   * Fact keys the caller requires. Absent keys are reported as missing inputs so
   * a gap is visible before the engine runs.
   */
  requiredKeys?: readonly string[]
  /**
   * Already-persisted Capital facts to merge with the adapted ones. This is how
   * a fact layer supplies REJECTED/SUPERSEDED rows, which the source adapters
   * can never produce.
   */
  additionalFacts?: readonly FinancialFact[]
}

export type CapitalAnalysisInputResult = {
  input: CapitalAnalysisInput
  /** Adapted facts before validation, for audit of what the sources produced. */
  adaptedFacts: readonly FinancialFact[]
  /** Every problem found while adapting or validating, including non-blocking. */
  issues: readonly CapitalAdapterIssue[]
  /** Facts withheld from analysis because they are not usable. */
  withheld: readonly { factId: string; key: string; reason: CapitalMissingInput["reason"] }[]
}

const DEFAULT_CURRENCY = "EUR"
const DEFAULT_LOCALE = "de"

/**
 * Builds the analysis input for a single household.
 *
 * Household isolation is enforced twice: adapters reject rows from another
 * household, and any fact whose `householdId` differs is withheld here.
 * REJECTED and SUPERSEDED facts are excluded rather than silently consumed.
 */
export function buildCapitalAnalysisInput(
  bundle: CapitalSourceBundle,
  options: BuildAnalysisInputOptions = {},
): CapitalAnalysisInputResult {
  const householdId = bundle.household.id
  const currency = options.currency ?? DEFAULT_CURRENCY
  const locale = options.locale ?? DEFAULT_LOCALE
  const engineVersion = options.engineVersion ?? CAPITAL_ENGINE_VERSION

  const issues: CapitalAdapterIssue[] = []
  const adaptedFacts: FinancialFact[] = []

  for (const row of bundle.extractedFacts) {
    const result = adaptExtractedFact(row, householdId, currency)
    issues.push(...result.issues)
    if (result.fact) adaptedFacts.push(result.fact)
  }

  for (const row of bundle.contracts) {
    const result = adaptContract(row, householdId, currency)
    issues.push(...result.issues)
    if (result.fact) adaptedFacts.push(result.fact)
  }

  for (const row of bundle.documentReviews) {
    const result = adaptDocumentReview(row, householdId, currency)
    issues.push(...result.issues)
    adaptedFacts.push(...result.facts)
  }

  const missingInputs: CapitalMissingInput[] = []
  const withheld: { factId: string; key: string; reason: CapitalMissingInput["reason"] }[] = []
  const usable: FinancialFact[] = []

  for (const fact of [...adaptedFacts, ...(options.additionalFacts ?? [])]) {
    if (fact.householdId !== householdId) {
      withheld.push({ factId: fact.id, key: fact.key, reason: "absent" })
      issues.push({
        code: "HOUSEHOLD_MISMATCH",
        source: fact.id,
        message: "Fact does not belong to the requested household and was withheld.",
        blocking: true,
      })
      continue
    }
    if (validateFinancialFact(fact).length > 0) {
      withheld.push({ factId: fact.id, key: fact.key, reason: "absent" })
      continue
    }
    if (fact.status === "REJECTED") {
      withheld.push({ factId: fact.id, key: fact.key, reason: "rejected" })
      missingInputs.push({ key: fact.key, reason: "rejected", requiredBy: "analysis_input" })
      continue
    }
    if (fact.status === "SUPERSEDED") {
      withheld.push({ factId: fact.id, key: fact.key, reason: "superseded" })
      missingInputs.push({ key: fact.key, reason: "superseded", requiredBy: "analysis_input" })
      continue
    }
    if (!isUsableForAnalysis(fact)) {
      withheld.push({ factId: fact.id, key: fact.key, reason: "unconfirmed" })
      missingInputs.push({ key: fact.key, reason: "unconfirmed", requiredBy: "analysis_input" })
      continue
    }
    usable.push(fact)
  }

  // Required keys that produced no usable fact stay visible as gaps.
  const requiredKeys = options.requiredKeys ?? []
  const presentKeys = new Set(usable.map((fact) => fact.key))
  for (const key of requiredKeys) {
    if (!presentKeys.has(key)) {
      missingInputs.push({ key, reason: "absent", requiredBy: "analysis_input" })
    }
  }

  return {
    input: {
      householdId,
      facts: usable,
      missingInputs: dedupeMissingInputs(missingInputs),
      assumptions: options.assumptions ?? [],
      engineVersion,
      currency,
      locale,
    },
    adaptedFacts,
    issues,
    withheld,
  }
}

function dedupeMissingInputs(missingInputs: readonly CapitalMissingInput[]): CapitalMissingInput[] {
  const seen = new Map<string, CapitalMissingInput>()
  for (const missing of missingInputs) {
    const identity = `${missing.key}|${missing.reason}|${missing.requiredBy}`
    if (!seen.has(identity)) seen.set(identity, missing)
  }
  return [...seen.values()].sort((a, b) => {
    if (a.key !== b.key) return a.key < b.key ? -1 : 1
    if (a.reason !== b.reason) return a.reason < b.reason ? -1 : 1
    return a.requiredBy < b.requiredBy ? -1 : a.requiredBy > b.requiredBy ? 1 : 0
  })
}

/** Keys the engine needs for the surplus and reserve calculation. */
export const P0_REQUIRED_KEYS: readonly string[] = [
  CAPITAL_FACT_KEYS.income,
  CAPITAL_FACT_KEYS.essentialExpenses,
  CAPITAL_FACT_KEYS.debtPayments,
  CAPITAL_FACT_KEYS.insuranceCosts,
  CAPITAL_FACT_KEYS.existingSavings,
  CAPITAL_FACT_KEYS.liquidReserve,
]

/** True when the input carries no usable fact at all. */
export function isAnalysisInputEmpty(input: CapitalAnalysisInput): boolean {
  return input.facts.length === 0
}
