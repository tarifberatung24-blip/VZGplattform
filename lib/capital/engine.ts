/**
 * Capital Engine — slice 1.
 *
 * Deterministic, application-level engine that consumes only confirmed,
 * validated, household-scoped FinancialFacts and produces a neutral
 * CapitalScenario. It performs no recommendation, projection, risk scoring,
 * market-data lookup, or provider call, and it never invents a value for a
 * missing input.
 */

import {
  type CapitalAssumption,
  type CapitalMissingInput,
  type CapitalScenario,
  type CapitalFeasibilityState,
} from "./boundaries"
import {
  calculateGoal,
  calculateMonthlySurplus,
  calculateReserve,
  type CalculationTraceEntry,
  type GoalResult,
  type ReserveResult,
  type SurplusResult,
} from "./calculations"
import type { FinancialFact } from "./financial-fact"
import { validateFinancialFact } from "./validation"
import { hashCapitalInputs } from "./snapshot"

export const CAPITAL_ENGINE_VERSION = "capital-core-1.0.0"
export const CAPITAL_DISCLAIMER_VERSION = "capital-disclaimer-v1"

/** Canonical fact keys consumed by slice 1. */
export const CAPITAL_FACT_KEYS = {
  income: "income.net_monthly",
  essentialExpenses: "expenses.essential_monthly",
  debtPayments: "debt.payments_monthly",
  insuranceCosts: "insurance.costs_monthly",
  existingSavings: "savings.contributions_monthly",
  liquidReserve: "reserve.liquid",
} as const

export type CapitalFactKey = (typeof CAPITAL_FACT_KEYS)[keyof typeof CAPITAL_FACT_KEYS]

/** Required inputs for the surplus calculation. */
export const REQUIRED_SURPLUS_KEYS: readonly CapitalFactKey[] = [
  CAPITAL_FACT_KEYS.income,
  CAPITAL_FACT_KEYS.essentialExpenses,
  CAPITAL_FACT_KEYS.debtPayments,
  CAPITAL_FACT_KEYS.insuranceCosts,
  CAPITAL_FACT_KEYS.existingSavings,
]

export type CapitalGoalInput = {
  id: string
  label: string
  targetAmountKey: string
  fundedAmountKey: string
  remainingMonthsKey: string
}

export type CapitalEngineContext = {
  householdId: string
  currency: string
  locale: string
  /** Explicit scenario assumption; the engine never selects this itself. */
  reserveMonths: number
  /** Injected for determinism; the engine never reads the system clock. */
  calculatedAt: string
  scenarioId: string
  scenarioLabel?: string
  goals?: readonly CapitalGoalInput[]
  /** Extra assumptions to record verbatim. */
  assumptions?: readonly CapitalAssumption[]
}

export type CapitalEngineInput = {
  facts: readonly FinancialFact[]
  context: CapitalEngineContext
}

export type CapitalEngineGoalOutput = GoalResult & { id: string; label: string }

export type CapitalEngineResult = {
  scenario: CapitalScenario
  surplus: SurplusResult | null
  reserve: ReserveResult | null
  goals: CapitalEngineGoalOutput[]
  trace: CalculationTraceEntry[]
  /** Facts that passed the gate and were consumed. */
  consumedFacts: FinancialFact[]
  /** Facts withheld from calculation, with the reason. */
  rejectedFacts: { factId: string; key: string; reason: CapitalMissingInput["reason"] }[]
}

function missingReasonFor(fact: FinancialFact): CapitalMissingInput["reason"] {
  switch (fact.status) {
    case "REJECTED":
      return "rejected"
    case "SUPERSEDED":
      return "superseded"
    default:
      return "unconfirmed"
  }
}

/**
 * Confirmed-fact input gate.
 *
 * A fact is consumable only when it validates, is CONFIRMED, is monetary in the
 * scenario currency, and belongs to the requested household. Everything else
 * becomes an explicit unusable input.
 */
export function gateConfirmedFacts(
  facts: readonly FinancialFact[],
  householdId: string,
  currency: string,
): { consumed: FinancialFact[]; rejected: CapitalEngineResult["rejectedFacts"]; missingInputs: CapitalMissingInput[] } {
  const consumed: FinancialFact[] = []
  const rejected: CapitalEngineResult["rejectedFacts"] = []
  const missingInputs: CapitalMissingInput[] = []

  for (const fact of facts) {
    if (fact.householdId !== householdId) {
      rejected.push({ factId: fact.id, key: fact.key, reason: "absent" })
      continue
    }
    if (validateFinancialFact(fact).length > 0) {
      rejected.push({ factId: fact.id, key: fact.key, reason: "absent" })
      missingInputs.push({ key: fact.key, reason: "absent", requiredBy: "financial_fact_validation" })
      continue
    }
    if (fact.status !== "CONFIRMED") {
      rejected.push({ factId: fact.id, key: fact.key, reason: missingReasonFor(fact) })
      missingInputs.push({ key: fact.key, reason: missingReasonFor(fact), requiredBy: "confirmed_fact" })
      continue
    }
    if (fact.type !== "money" || fact.currency !== currency) {
      rejected.push({ factId: fact.id, key: fact.key, reason: "absent" })
      missingInputs.push({ key: fact.key, reason: "absent", requiredBy: "monetary_fact_in_scenario_currency" })
      continue
    }
    consumed.push(fact)
  }

  return { consumed, rejected, missingInputs }
}

/** Latest consumed version per key wins; earlier versions are not used. */
function latestByKey(facts: readonly FinancialFact[]): Map<string, FinancialFact> {
  const map = new Map<string, FinancialFact>()
  for (const fact of facts) {
    const existing = map.get(fact.key)
    if (!existing || fact.version > existing.version) map.set(fact.key, fact)
  }
  return map
}

function moneyValue(fact: FinancialFact | undefined): number | null {
  if (!fact) return null
  return typeof fact.value === "number" && Number.isInteger(fact.value) ? fact.value : null
}

export function runCapitalEngine(input: CapitalEngineInput): CapitalEngineResult {
  const { context } = input
  const { consumed, rejected, missingInputs } = gateConfirmedFacts(input.facts, context.householdId, context.currency)

  const byKey = latestByKey(consumed)
  for (const key of REQUIRED_SURPLUS_KEYS) {
    if (!byKey.has(key)) missingInputs.push({ key, reason: "absent", requiredBy: "surplus_calculation" })
  }

  const income = moneyValue(byKey.get(CAPITAL_FACT_KEYS.income))
  const essentialExpenses = moneyValue(byKey.get(CAPITAL_FACT_KEYS.essentialExpenses))
  const debtPayments = moneyValue(byKey.get(CAPITAL_FACT_KEYS.debtPayments))
  const insuranceCosts = moneyValue(byKey.get(CAPITAL_FACT_KEYS.insuranceCosts))
  const existingSavings = moneyValue(byKey.get(CAPITAL_FACT_KEYS.existingSavings))
  const liquidReserve = moneyValue(byKey.get(CAPITAL_FACT_KEYS.liquidReserve))

  const assumptions: CapitalAssumption[] = [
    { key: "reserveMonths", value: context.reserveMonths, unit: "months", sourceReference: "scenario_assumption" },
    ...(context.assumptions ?? []),
  ]

  const goals = context.goals ?? []
  for (const goal of goals) {
    for (const key of [goal.targetAmountKey, goal.fundedAmountKey, goal.remainingMonthsKey]) {
      if (!byKey.has(key)) missingInputs.push({ key, reason: "absent", requiredBy: `goal:${goal.id}` })
    }
  }

  const surplusReady = REQUIRED_SURPLUS_KEYS.every((key) => byKey.has(key))
  const surplus = surplusReady
    ? calculateMonthlySurplus({ income, essentialExpenses, debtPayments, insuranceCosts, existingSavings, currency: context.currency })
    : null

  const reserve = surplusReady && liquidReserve !== null
    ? calculateReserve({
        essentialExpenses: essentialExpenses ?? 0,
        debtPayments: debtPayments ?? 0,
        insuranceCosts: insuranceCosts ?? 0,
        liquidReserve,
        reserveMonths: context.reserveMonths,
        currency: context.currency,
      })
    : null

  const availableSurplus = surplus?.availableSurplus ?? null
  const goalOutputs: CapitalEngineGoalOutput[] = []
  for (const goal of goals) {
    const targetAmount = moneyValue(byKey.get(goal.targetAmountKey))
    const fundedAmount = moneyValue(byKey.get(goal.fundedAmountKey))
    const remainingMonths = moneyValue(byKey.get(goal.remainingMonthsKey))
    if (targetAmount === null || fundedAmount === null || remainingMonths === null) continue
    goalOutputs.push({
      id: goal.id,
      label: goal.label,
      ...calculateGoal({ targetAmount, fundedAmount, remainingMonths, currency: context.currency, availableSurplus }),
    })
  }

  const feasibility = resolveFeasibility({
    surplusReady,
    reserveReady: liquidReserve !== null,
    surplus,
    reserve,
    goals: goalOutputs,
    hasGoals: goals.length > 0,
  })

  const trace: CalculationTraceEntry[] = [
    ...(surplus?.trace ?? []),
    ...(reserve?.trace ?? []),
    ...goalOutputs.flatMap((goal) => goal.trace),
  ]

  const dedupedMissing = dedupeMissing(missingInputs)

  const scenario: CapitalScenario = {
    id: context.scenarioId,
    engineVersion: CAPITAL_ENGINE_VERSION,
    label: context.scenarioLabel ?? "baseline",
    inputSnapshotHash: hashCapitalInputs({
      engineVersion: CAPITAL_ENGINE_VERSION,
      householdId: context.householdId,
      currency: context.currency,
      facts: consumed,
      assumptions,
      goals: goals.map((goal) => ({
        id: goal.id,
        targetAmountKey: goal.targetAmountKey,
        fundedAmountKey: goal.fundedAmountKey,
        remainingMonthsKey: goal.remainingMonthsKey,
      })),
      missingInputs: dedupedMissing,
    }),
    assumptions,
    currency: context.currency,
    horizonMonths: goalOutputs.length > 0 ? Math.max(...goalOutputs.map((goal) => goal.remainingMonths)) : null,
    feasibility,
    missingInputs: dedupedMissing,
    outputs: buildOutputs({ surplus, reserve, goals: goalOutputs, feasibility }),
    disclaimerVersion: CAPITAL_DISCLAIMER_VERSION,
    calculatedAt: context.calculatedAt,
  }

  return { scenario, surplus, reserve, goals: goalOutputs, trace, consumedFacts: consumed, rejectedFacts: rejected }
}

function dedupeMissing(missingInputs: readonly CapitalMissingInput[]): CapitalMissingInput[] {
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

/**
 * Feasibility is a state, never a recommendation:
 * missing required facts -> needs_data; an unreachable goal -> not_feasible;
 * negative surplus or an unfilled reserve gap -> review_required; a complete
 * neutral calculation -> feasible.
 */
function resolveFeasibility(args: {
  surplusReady: boolean
  reserveReady: boolean
  surplus: SurplusResult | null
  reserve: ReserveResult | null
  goals: readonly CapitalEngineGoalOutput[]
  hasGoals: boolean
}): CapitalFeasibilityState {
  if (!args.surplusReady || args.surplus === null) return "needs_data"
  if (args.hasGoals && args.goals.length < 1) return "needs_data"
  if (args.hasGoals && args.goals.some((goal) => goal.feasibility === "not_feasible")) return "not_feasible"
  if (!args.reserveReady || args.reserve === null) return "needs_data"
  if (args.surplus.availableSurplus < 0) return "review_required"
  if (args.reserve.reserveGap > 0) return "review_required"
  return "feasible"
}

function buildOutputs(args: {
  surplus: SurplusResult | null
  reserve: ReserveResult | null
  goals: readonly CapitalEngineGoalOutput[]
  feasibility: CapitalFeasibilityState
}): Readonly<Record<string, string | number | null>> {
  const outputs: Record<string, string | number | null> = {
    monthly_net_income: args.surplus?.income ?? null,
    monthly_essential_expenses: args.surplus?.essentialExpenses ?? null,
    monthly_debt_payments: args.surplus?.debtPayments ?? null,
    monthly_insurance_costs: args.surplus?.insuranceCosts ?? null,
    monthly_existing_savings: args.surplus?.existingSavings ?? null,
    monthly_available_surplus: args.surplus?.availableSurplus ?? null,
    monthly_essential_outflow: args.reserve?.monthlyEssentialOutflow ?? null,
    reserve_target: args.reserve?.reserveTarget ?? null,
    reserve_gap: args.reserve?.reserveGap ?? null,
    feasibility: args.feasibility,
  }
  for (const goal of args.goals) {
    outputs[`goal.${goal.id}.remaining_amount`] = goal.remainingAmount
    outputs[`goal.${goal.id}.required_monthly_contribution`] = goal.requiredMonthlyContribution
    outputs[`goal.${goal.id}.surplus_after_contribution`] = goal.surplusAfterContribution
    outputs[`goal.${goal.id}.feasibility`] = goal.feasibility
  }
  return outputs
}
