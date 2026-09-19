/**
 * Capital P0 runtime orchestrator.
 *
 *   source data → adapters → FinancialFacts → CapitalAnalysisInput
 *              → runCapitalEngine() → CapitalScenario → AdvisorReview draft
 *
 * Application-level composition only. No LLM arithmetic, no provider calls, no
 * persistence. Every step is deterministic, so identical inputs produce an
 * identical result — including the scenario snapshot hash.
 */

import { type AdvisorReview, type CapitalAnalysisInput, type CapitalScenario } from "../boundaries"
import {
  CAPITAL_ENGINE_VERSION,
  runCapitalEngine,
  type CapitalEngineGoalOutput,
  type CapitalEngineResult,
  type CapitalGoalInput,
} from "../engine"
import type { CalculationTraceEntry } from "../calculations"
import { createAdvisorReview } from "../review/lifecycle"
import { buildCapitalAnalysisInput, type BuildAnalysisInputOptions } from "../integration/analysis-input"
import type { CapitalAdapterIssue, CapitalSourceBundle } from "../integration/source-contracts"

export type CapitalRuntimeInput = {
  bundle: CapitalSourceBundle
  /** Injected for determinism; the runtime never reads the system clock. */
  calculatedAt: string
  scenarioId: string
  scenarioLabel?: string
  /** Explicit scenario assumption; the engine never selects this itself. */
  reserveMonths: number
  goals?: readonly CapitalGoalInput[]
  reviewId: string
  locale?: string
  currency?: string
  /** Extra assumptions recorded verbatim. */
  assumptions?: BuildAnalysisInputOptions["assumptions"]
  /** Keys the caller requires; absent keys appear as missing inputs. */
  requiredKeys?: readonly string[]
}

export type CapitalRuntimeResult = {
  analysisInput: CapitalAnalysisInput
  scenario: CapitalScenario
  /** A review draft only; approval is a separate, human-initiated step. */
  reviewDraft: AdvisorReview
  engine: CapitalEngineResult
  goals: CapitalEngineGoalOutput[]
  trace: CalculationTraceEntry[]
  issues: readonly CapitalAdapterIssue[]
  withheld: readonly { factId: string; key: string; reason: string }[]
}

/**
 * Runs the full P0 chain for one household and returns the scenario plus an
 * unapproved review draft. It does not approve, publish, or persist anything.
 */
export function runCapitalRuntime(input: CapitalRuntimeInput): CapitalRuntimeResult {
  const { bundle } = input
  const currency = input.currency ?? "EUR"

  const { input: analysisInput, issues, withheld } = buildCapitalAnalysisInput(bundle, {
    engineVersion: CAPITAL_ENGINE_VERSION,
    currency,
    locale: input.locale ?? "de",
    assumptions: input.assumptions,
    goals: input.goals,
    requiredKeys: input.requiredKeys,
  })

  const engine = runCapitalEngine({
    facts: analysisInput.facts,
    context: {
      householdId: analysisInput.householdId,
      currency: analysisInput.currency,
      locale: analysisInput.locale,
      reserveMonths: input.reserveMonths,
      calculatedAt: input.calculatedAt,
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      goals: input.goals,
      assumptions: input.assumptions,
    },
  })

  const reviewDraft = createAdvisorReview({
    id: input.reviewId,
    householdId: analysisInput.householdId,
    scenarioId: engine.scenario.id,
  })

  return {
    analysisInput,
    scenario: engine.scenario,
    reviewDraft,
    engine,
    goals: engine.goals,
    trace: engine.trace,
    issues,
    withheld,
  }
}
