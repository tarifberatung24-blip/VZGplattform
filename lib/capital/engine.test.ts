import { describe, expect, it } from "vitest"

import {
  CAPITAL_DISCLAIMER_VERSION,
  CAPITAL_ENGINE_VERSION,
  CAPITAL_FACT_KEYS,
  gateConfirmedFacts,
  runCapitalEngine,
  type CapitalEngineContext,
  type CapitalGoalInput,
} from "./engine"
import { createFinancialFact, type FinancialFact, type FinancialFactInput } from "./financial-fact"
import { createProvenance } from "./provenance"

const HOUSEHOLD = "household-1"
const CALCULATED_AT = "2025-02-02T08:30:00.000Z"

function fact(overrides: Partial<FinancialFactInput> = {}): FinancialFact {
  return createFinancialFact({
    id: `fact-${overrides.key ?? "key"}-${overrides.version ?? 1}`,
    householdId: HOUSEHOLD,
    key: "income.net_monthly",
    value: 320_000,
    type: "money",
    currency: "EUR",
    status: "CONFIRMED",
    confirmedBy: "user-1",
    confirmedAt: "2025-02-01T10:00:00.000Z",
    provenance: createProvenance({ source: "USER" }),
    ...overrides,
  })
}

/** A plain numeric fact, used for durations such as remaining months. */
function numberFact(key: string, value: number, overrides: Partial<FinancialFactInput> = {}): FinancialFact {
  return createFinancialFact({
    id: `fact-${key}-${value}`,
    householdId: HOUSEHOLD,
    key,
    value,
    type: "number",
    currency: null,
    unit: "months",
    status: "CONFIRMED",
    confirmedBy: "user-1",
    confirmedAt: "2025-02-01T10:00:00.000Z",
    provenance: createProvenance({ source: "USER" }),
    ...overrides,
  })
}

/** A complete, valid set of confirmed facts for the baseline scenario. */
function baselineFacts(): FinancialFact[] {
  return [
    fact({ key: CAPITAL_FACT_KEYS.income, value: 320_000 }),
    fact({ key: CAPITAL_FACT_KEYS.essentialExpenses, value: 120_000 }),
    fact({ key: CAPITAL_FACT_KEYS.debtPayments, value: 50_000 }),
    fact({ key: CAPITAL_FACT_KEYS.insuranceCosts, value: 20_000 }),
    fact({ key: CAPITAL_FACT_KEYS.existingSavings, value: 30_000 }),
    fact({ key: CAPITAL_FACT_KEYS.liquidReserve, value: 400_000 }),
  ]
}

function context(overrides: Partial<CapitalEngineContext> = {}): CapitalEngineContext {
  return {
    householdId: HOUSEHOLD,
    currency: "EUR",
    locale: "de",
    reserveMonths: 6,
    calculatedAt: CALCULATED_AT,
    scenarioId: "scenario-1",
    ...overrides,
  }
}

describe("capital engine versioning", () => {
  it("exposes a versioned engine and disclaimer identifier", () => {
    expect(CAPITAL_ENGINE_VERSION).toBe("capital-core-1.0.0")
    expect(CAPITAL_DISCLAIMER_VERSION).toBe("capital-disclaimer-v1")
  })
})

describe("confirmed-fact input gate", () => {
  it("consumes only confirmed, valid, household-scoped money facts", () => {
    const { consumed, rejected } = gateConfirmedFacts(baselineFacts(), HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(6)
    expect(rejected).toHaveLength(0)
  })

  it("rejects facts belonging to another household", () => {
    const { consumed, rejected } = gateConfirmedFacts([fact({ householdId: "household-2" })], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(0)
    expect(rejected[0].factId).toBeTruthy()
  })

  it("rejects DRAFT facts as unconfirmed", () => {
    const draft = fact({ status: "DRAFT", confirmedAt: null, confirmedBy: null })
    const { consumed, missingInputs } = gateConfirmedFacts([draft], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(0)
    expect(missingInputs.some((missing) => missing.reason === "unconfirmed")).toBe(true)
  })

  it("rejects REJECTED and SUPERSEDED facts with the matching reason", () => {
    expect(gateConfirmedFacts([fact({ status: "REJECTED", confirmedAt: null, confirmedBy: null })], HOUSEHOLD, "EUR").missingInputs[0].reason).toBe("rejected")
    expect(gateConfirmedFacts([fact({ status: "SUPERSEDED", confirmedAt: null, confirmedBy: null })], HOUSEHOLD, "EUR").missingInputs[0].reason).toBe("superseded")
  })

  it("rejects invalid facts", () => {
    const invalid = fact({ currency: null })
    const { consumed, missingInputs } = gateConfirmedFacts([invalid], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(0)
    expect(missingInputs.some((missing) => missing.requiredBy === "financial_fact_validation")).toBe(true)
  })

  it("rejects money facts in a different currency", () => {
    const { consumed } = gateConfirmedFacts([fact({ currency: "USD" })], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(0)
  })

  it("accepts plain numeric facts so durations can pass the gate", () => {
    const { consumed, rejected } = gateConfirmedFacts([numberFact("goal.g1.months", 24)], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(1)
    expect(consumed[0].type).toBe("number")
    expect(consumed[0].currency).toBeNull()
    expect(rejected).toHaveLength(0)
  })

  it("rejects numeric facts that carry a currency", () => {
    const { consumed } = gateConfirmedFacts([numberFact("goal.g1.months", 24, { currency: "EUR" })], HOUSEHOLD, "EUR")
    expect(consumed).toHaveLength(0)
  })

  it("rejects unsupported fact types such as text", () => {
    const { consumed } = gateConfirmedFacts(
      [fact({ type: "text", value: "24", currency: null, unit: null })],
      HOUSEHOLD,
      "EUR",
    )
    expect(consumed).toHaveLength(0)
  })
})

describe("capital engine surplus", () => {
  it("computes the baseline surplus deterministically", () => {
    const { scenario, surplus } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(surplus?.availableSurplus).toBe(100_000)
    expect(scenario.outputs.monthly_available_surplus).toBe(100_000)
    expect(scenario.outputs.monthly_net_income).toBe(320_000)
  })

  it("reports a negative surplus without inventing a correction", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.income ? fact({ key: CAPITAL_FACT_KEYS.income, value: 100_000 }) : entry,
    )
    const { surplus } = runCapitalEngine({ facts, context: context() })
    expect(surplus?.availableSurplus).toBe(-120_000)
  })

  it("keeps monetary outputs as integer minor units", () => {
    const { surplus } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(Number.isInteger(surplus?.availableSurplus)).toBe(true)
    expect(Number.isInteger(surplus?.income)).toBe(true)
  })

  it("uses only the latest version of a repeated fact key", () => {
    const facts = [
      ...baselineFacts(),
      fact({ id: "income-v2", key: CAPITAL_FACT_KEYS.income, value: 400_000, version: 2 }),
    ]
    const { surplus } = runCapitalEngine({ facts, context: context() })
    expect(surplus?.income).toBe(400_000)
    expect(surplus?.availableSurplus).toBe(180_000)
  })

  it("does not mutate the input facts", () => {
    const facts = baselineFacts()
    const snapshot = JSON.stringify(facts)
    runCapitalEngine({ facts, context: context() })
    expect(JSON.stringify(facts)).toBe(snapshot)
  })
})

describe("capital engine reserve scenario", () => {
  it("computes the reserve target from the explicit reserveMonths assumption", () => {
    const { reserve } = runCapitalEngine({ facts: baselineFacts(), context: context({ reserveMonths: 6 }) })
    expect(reserve?.monthlyEssentialOutflow).toBe(190_000)
    expect(reserve?.reserveTarget).toBe(1_140_000)
  })

  it("computes the reserve gap", () => {
    const { reserve, scenario } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(reserve?.reserveGap).toBe(740_000)
    expect(scenario.outputs.reserve_gap).toBe(740_000)
  })

  it("clamps the reserve gap at zero when the reserve covers the target", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.liquidReserve ? fact({ key: CAPITAL_FACT_KEYS.liquidReserve, value: 2_000_000 }) : entry,
    )
    const { reserve } = runCapitalEngine({ facts, context: context() })
    expect(reserve?.reserveGap).toBe(0)
  })

  it("records reserveMonths as an explicit scenario assumption", () => {
    const { scenario } = runCapitalEngine({ facts: baselineFacts(), context: context({ reserveMonths: 9 }) })
    const assumption = scenario.assumptions.find((entry) => entry.key === "reserveMonths")
    expect(assumption?.value).toBe(9)
    expect(assumption?.unit).toBe("months")
    expect(assumption?.sourceReference).toBe("scenario_assumption")
  })

  it("changes the target when the assumption changes, without recommending a value", () => {
    const three = runCapitalEngine({ facts: baselineFacts(), context: context({ reserveMonths: 3 }) })
    const twelve = runCapitalEngine({ facts: baselineFacts(), context: context({ reserveMonths: 12 }) })
    expect(three.reserve?.reserveTarget).toBe(570_000)
    expect(twelve.reserve?.reserveTarget).toBe(2_280_000)
  })
})

describe("capital engine goal feasibility", () => {
  const goals: CapitalGoalInput[] = [
    {
      id: "g1",
      label: "reserve build-up",
      targetAmountKey: "goal.g1.target",
      fundedAmountKey: "goal.g1.funded",
      remainingMonthsKey: "goal.g1.months",
    },
  ]

  function goalFacts(target: number, funded: number, months: number) {
    return [
      ...baselineFacts(),
      fact({ key: "goal.g1.target", value: target }),
      fact({ key: "goal.g1.funded", value: funded }),
      numberFact("goal.g1.months", months),
    ]
  }

  it("computes the required monthly contribution", () => {
    const { goals: output } = runCapitalEngine({ facts: goalFacts(1_200_000, 200_000, 24), context: context({ goals }) })
    expect(output[0].remainingAmount).toBe(1_000_000)
    expect(output[0].requiredMonthlyContribution).toBe(41_667)
  })

  it("marks a feasible goal as feasible", () => {
    const { goals: output, scenario } = runCapitalEngine({ facts: goalFacts(1_000_000, 0, 24), context: context({ goals }) })
    expect(output[0].feasibility).toBe("feasible")
    expect(scenario.outputs["goal.g1.feasibility"]).toBe("feasible")
  })

  it("marks an unreachable goal as not_feasible", () => {
    const { goals: output, scenario } = runCapitalEngine({ facts: goalFacts(3_600_000, 0, 12), context: context({ goals }) })
    expect(output[0].requiredMonthlyContribution).toBe(300_000)
    expect(output[0].feasibility).toBe("not_feasible")
    expect(scenario.feasibility).toBe("not_feasible")
  })

  it("sets horizonMonths from the goal horizon", () => {
    const { scenario } = runCapitalEngine({ facts: goalFacts(1_000_000, 0, 24), context: context({ goals }) })
    expect(scenario.horizonMonths).toBe(24)
  })

  it("returns a null horizon when there are no goals", () => {
    const { scenario } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(scenario.horizonMonths).toBeNull()
  })
})

describe("capital engine feasibility states", () => {
  it("returns needs_data when a required fact is absent", () => {
    const facts = baselineFacts().filter((entry) => entry.key !== CAPITAL_FACT_KEYS.insuranceCosts)
    const { scenario, surplus } = runCapitalEngine({ facts, context: context() })
    expect(scenario.feasibility).toBe("needs_data")
    expect(surplus).toBeNull()
    expect(scenario.outputs.monthly_available_surplus).toBeNull()
    expect(scenario.missingInputs.some((missing) => missing.key === CAPITAL_FACT_KEYS.insuranceCosts)).toBe(true)
  })

  it("returns needs_data when a DRAFT fact is the only source for a required input", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.income
        ? fact({ key: CAPITAL_FACT_KEYS.income, status: "DRAFT", confirmedAt: null, confirmedBy: null })
        : entry,
    )
    const { scenario, surplus } = runCapitalEngine({ facts, context: context() })
    expect(scenario.feasibility).toBe("needs_data")
    expect(surplus).toBeNull()
  })

  it("returns needs_data when the wrong household supplies the only fact set", () => {
    const facts = baselineFacts().map((entry) => createFinancialFact({ ...entry, householdId: "household-2" }))
    const { scenario } = runCapitalEngine({ facts, context: context() })
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs).toHaveLength(5)
  })

  it("returns not_feasible for a mathematically impossible goal", () => {
    const goals: CapitalGoalInput[] = [
      { id: "g1", label: "big goal", targetAmountKey: "goal.g1.target", fundedAmountKey: "goal.g1.funded", remainingMonthsKey: "goal.g1.months" },
    ]
    const facts = [
      ...baselineFacts(),
      fact({ key: "goal.g1.target", value: 9_000_000 }),
      fact({ key: "goal.g1.funded", value: 0 }),
      numberFact("goal.g1.months", 12),
    ]
    expect(runCapitalEngine({ facts, context: context({ goals }) }).scenario.feasibility).toBe("not_feasible")
  })

  it("returns review_required for a negative surplus", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.income ? fact({ key: CAPITAL_FACT_KEYS.income, value: 50_000 }) : entry,
    )
    expect(runCapitalEngine({ facts, context: context() }).scenario.feasibility).toBe("review_required")
  })

  it("returns review_required when a reserve gap remains", () => {
    const { scenario } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(scenario.feasibility).toBe("review_required")
  })

  it("returns feasible when surplus is positive and the reserve target is met", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.liquidReserve ? fact({ key: CAPITAL_FACT_KEYS.liquidReserve, value: 2_000_000 }) : entry,
    )
    expect(runCapitalEngine({ facts, context: context() }).scenario.feasibility).toBe("feasible")
  })
})

describe("capital engine scenario output", () => {
  it("populates every required scenario field", () => {
    const { scenario } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(scenario.engineVersion).toBe(CAPITAL_ENGINE_VERSION)
    expect(scenario.inputSnapshotHash).toMatch(/^[0-9a-f]{64}$/)
    expect(scenario.assumptions.length).toBeGreaterThan(0)
    expect(scenario.currency).toBe("EUR")
    expect(scenario.feasibility).toBeTruthy()
    expect(Array.isArray(scenario.missingInputs)).toBe(true)
    expect(Object.keys(scenario.outputs).length).toBeGreaterThan(0)
    expect(scenario.disclaimerVersion).toBe(CAPITAL_DISCLAIMER_VERSION)
    expect(scenario.calculatedAt).toBe(CALCULATED_AT)
  })

  it("preserves the injected timestamp instead of reading the clock", () => {
    const injected = "2020-01-01T00:00:00.000Z"
    const { scenario } = runCapitalEngine({ facts: baselineFacts(), context: context({ calculatedAt: injected }) })
    expect(scenario.calculatedAt).toBe(injected)
  })

  it("produces identical outputs for identical inputs", () => {
    const first = runCapitalEngine({ facts: baselineFacts(), context: context() })
    const second = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(second.scenario).toEqual(first.scenario)
    expect(second.trace).toEqual(first.trace)
  })

  it("produces the same snapshot hash regardless of fact order", () => {
    const forward = runCapitalEngine({ facts: baselineFacts(), context: context() })
    const reversed = runCapitalEngine({ facts: [...baselineFacts()].reverse(), context: context() })
    expect(reversed.scenario.inputSnapshotHash).toBe(forward.scenario.inputSnapshotHash)
  })

  it("changes the snapshot hash when a material input changes", () => {
    const changed = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.income ? fact({ key: CAPITAL_FACT_KEYS.income, value: 321_000 }) : entry,
    )
    expect(runCapitalEngine({ facts: changed, context: context() }).scenario.inputSnapshotHash).not.toBe(
      runCapitalEngine({ facts: baselineFacts(), context: context() }).scenario.inputSnapshotHash,
    )
  })

  it("records extra assumptions verbatim", () => {
    const { scenario } = runCapitalEngine({
      facts: baselineFacts(),
      context: context({ assumptions: [{ key: "dataVintage", value: "2025-01", unit: null, sourceReference: "advisor-note" }] }),
    })
    expect(scenario.assumptions.some((assumption) => assumption.key === "dataVintage")).toBe(true)
  })
})

describe("capital engine explainability", () => {
  it("exposes an ordered trace from income to available surplus", () => {
    const { trace } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    const operations = trace.map((entry) => entry.operation)
    expect(operations.slice(0, 6)).toEqual(["income", "minus", "minus", "minus", "minus", "equals"])
  })

  it("exposes operation, input keys, input values, result, and unit for every entry", () => {
    const { trace } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    expect(trace.length).toBeGreaterThan(0)
    for (const entry of trace) {
      expect(entry.operation).toBeTruthy()
      expect(entry.label).toBeTruthy()
      expect(entry.inputKeys.length).toBe(entry.inputValues.length)
      expect(typeof entry.result).toBe("number")
      expect(entry.unit).toBe("EUR")
    }
  })

  it("traces the surplus equation to the same value as the outputs", () => {
    const { trace, scenario } = runCapitalEngine({ facts: baselineFacts(), context: context() })
    const equals = trace.find((entry) => entry.operation === "equals" && entry.label.includes("surplus"))
    expect(equals?.result).toBe(scenario.outputs.monthly_available_surplus)
  })
})

describe("capital engine semantic goal input types", () => {
  const goals: CapitalGoalInput[] = [
    {
      id: "g1",
      label: "reserve build-up",
      targetAmountKey: "goal.g1.target",
      fundedAmountKey: "goal.g1.funded",
      remainingMonthsKey: "goal.g1.months",
    },
  ]

  /** Goal with an explicitly typed months fact, so mistyping can be exercised. */
  function goalWithMonths(monthsFact: FinancialFact) {
    return [
      ...baselineFacts(),
      fact({ key: "goal.g1.target", value: 1_200_000 }),
      fact({ key: "goal.g1.funded", value: 200_000 }),
      monthsFact,
    ]
  }

  it("accepts remainingMonths as a positive integer number fact", () => {
    const { goals: output, scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 24)),
      context: context({ goals }),
    })
    expect(output).toHaveLength(1)
    expect(output[0].remainingMonths).toBe(24)
    expect(output[0].requiredMonthlyContribution).toBe(41_667)
    expect(scenario.missingInputs).toHaveLength(0)
  })

  it("accepts remainingMonths with a null unit", () => {
    const { goals: output } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 24, { unit: null })),
      context: context({ goals }),
    })
    expect(output[0].remainingMonths).toBe(24)
  })

  it("rejects remainingMonths typed as money and reports needs_data", () => {
    const asMoney = fact({ key: "goal.g1.months", value: 24, type: "money", currency: "EUR", unit: null })
    const { goals: output, scenario } = runCapitalEngine({ facts: goalWithMonths(asMoney), context: context({ goals }) })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs.some((missing) => missing.key === "goal.g1.months")).toBe(true)
    expect(scenario.outputs["goal.g1.required_monthly_contribution"]).toBeUndefined()
  })

  it("rejects remainingMonths = 0", () => {
    const { goals: output, scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 0)),
      context: context({ goals }),
    })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs.some((missing) => missing.key === "goal.g1.months")).toBe(true)
  })

  it("rejects a negative remainingMonths", () => {
    const { goals: output, scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", -6)),
      context: context({ goals }),
    })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
  })

  it("rejects a fractional remainingMonths", () => {
    const { goals: output, scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 24.5)),
      context: context({ goals }),
    })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
  })

  it("rejects a months fact carrying an unexpected unit", () => {
    const { goals: output, scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 24, { unit: "weeks" })),
      context: context({ goals }),
    })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
  })

  it("rejects a goal target amount typed as number instead of money", () => {
    const facts = [
      ...baselineFacts(),
      fact({ key: "goal.g1.target", value: 1_200_000, type: "number", currency: null, unit: null }),
      fact({ key: "goal.g1.funded", value: 200_000 }),
      numberFact("goal.g1.months", 24),
    ]
    const { goals: output, scenario } = runCapitalEngine({ facts, context: context({ goals }) })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs.some((missing) => missing.key === "goal.g1.target")).toBe(true)
  })

  it("rejects a goal funded amount typed as number instead of money", () => {
    const facts = [
      ...baselineFacts(),
      fact({ key: "goal.g1.target", value: 1_200_000 }),
      fact({ key: "goal.g1.funded", value: 200_000, type: "number", currency: null, unit: null }),
      numberFact("goal.g1.months", 24),
    ]
    const { goals: output, scenario } = runCapitalEngine({ facts, context: context({ goals }) })
    expect(output).toHaveLength(0)
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs.some((missing) => missing.key === "goal.g1.funded")).toBe(true)
  })

  it("rejects a surplus key typed as number rather than silently using zero", () => {
    const facts = baselineFacts().map((entry) =>
      entry.key === CAPITAL_FACT_KEYS.income
        ? fact({ key: CAPITAL_FACT_KEYS.income, value: 320_000, type: "number", currency: null, unit: null })
        : entry,
    )
    const { scenario, surplus } = runCapitalEngine({ facts, context: context() })
    expect(surplus).toBeNull()
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.outputs.monthly_available_surplus).toBeNull()
    expect(scenario.missingInputs.some((missing) => missing.key === CAPITAL_FACT_KEYS.income)).toBe(true)
  })

  it("keeps months out of the monetary arithmetic and reserves", () => {
    const { scenario } = runCapitalEngine({
      facts: goalWithMonths(numberFact("goal.g1.months", 24)),
      context: context({ goals, reserveMonths: 6 }),
    })
    // Months must not appear as a monetary output or inflate the reserve target.
    expect(scenario.outputs.reserve_target).toBe(1_140_000)
    expect(scenario.assumptions.find((assumption) => assumption.key === "reserveMonths")?.unit).toBe("months")
  })
})
