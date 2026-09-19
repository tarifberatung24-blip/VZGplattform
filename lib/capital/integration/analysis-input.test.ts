import { describe, expect, it } from "vitest"

import { CAPITAL_FACT_KEYS } from "../engine"
import { buildCapitalAnalysisInput, P0_REQUIRED_KEYS } from "./analysis-input"
import {
  HOUSEHOLD_ID,
  OTHER_HOUSEHOLD_ID,
  completeBundle,
  contract,
  documentReview,
  household,
  persistedFact,
  unconfirmedBundle,
} from "./p0-fixtures"

describe("capital analysis input builder", () => {
  it("builds a deterministic input from a complete bundle", () => {
    const first = buildCapitalAnalysisInput(completeBundle())
    const second = buildCapitalAnalysisInput(completeBundle())
    expect(JSON.stringify(first.input)).toBe(JSON.stringify(second.input))
  })

  it("enforces household isolation on the bundle", () => {
    const bundle = completeBundle()
    const polluted = {
      ...bundle,
      contracts: [
        ...bundle.contracts,
        contract({ id: "ct-other", household_id: OTHER_HOUSEHOLD_ID, review_status: "confirmed" }),
      ],
    }
    const { input } = buildCapitalAnalysisInput(polluted)
    expect(input.householdId).toBe(HOUSEHOLD_ID)
    expect(input.facts.some((fact) => fact.id === "ct:ct-other")).toBe(false)
    expect(input.facts.every((fact) => fact.householdId === HOUSEHOLD_ID)).toBe(true)
  })

  it("reports a foreign contract as a blocking issue", () => {
    const bundle = completeBundle()
    const { issues } = buildCapitalAnalysisInput({
      ...bundle,
      contracts: [contract({ id: "ct-other", household_id: OTHER_HOUSEHOLD_ID })],
    })
    expect(issues.some((issue) => issue.code === "HOUSEHOLD_MISMATCH" && issue.blocking)).toBe(true)
  })

  it("exposes unconfirmed inputs instead of consuming them", () => {
    const { input } = buildCapitalAnalysisInput(unconfirmedBundle())
    expect(input.facts).toHaveLength(0)
    expect(input.missingInputs.some((missing) => missing.reason === "unconfirmed")).toBe(true)
    expect(buildCapitalAnalysisInput(unconfirmedBundle()).withheld[0].reason).toBe("unconfirmed")
  })

  it("exposes missing required inputs", () => {
    const { input } = buildCapitalAnalysisInput(unconfirmedBundle(), { requiredKeys: P0_REQUIRED_KEYS })
    for (const key of P0_REQUIRED_KEYS) {
      expect(input.missingInputs.some((missing) => missing.key === key)).toBe(true)
    }
  })

  it("excludes a rejected fact and records the reason", () => {
    const rejected = persistedFact({ id: "rejected-1", status: "REJECTED", confirmedAt: null, confirmedBy: null })
    const { input, withheld } = buildCapitalAnalysisInput(
      { ...completeBundle(), documentReviews: [], extractedFacts: [], contracts: [] },
      { additionalFacts: [rejected] },
    )
    expect(input.facts.some((fact) => fact.id === "rejected-1")).toBe(false)
    expect(withheld.some((entry) => entry.factId === "rejected-1" && entry.reason === "rejected")).toBe(true)
    expect(input.missingInputs.some((missing) => missing.reason === "rejected")).toBe(true)
  })

  it("excludes a superseded fact and records the reason", () => {
    const superseded = persistedFact({
      id: "superseded-1",
      version: 2,
      status: "SUPERSEDED",
      confirmedAt: null,
      confirmedBy: null,
    })
    const { input, withheld } = buildCapitalAnalysisInput(
      { ...completeBundle(), documentReviews: [], extractedFacts: [], contracts: [] },
      { additionalFacts: [superseded] },
    )
    expect(input.facts.some((fact) => fact.id === "superseded-1")).toBe(false)
    expect(withheld.some((entry) => entry.factId === "superseded-1" && entry.reason === "superseded")).toBe(true)
    expect(input.missingInputs.some((missing) => missing.reason === "superseded")).toBe(true)
  })

  it("withholds a fact that belongs to another household", () => {
    const foreign = persistedFact({ id: "foreign-1", householdId: OTHER_HOUSEHOLD_ID })
    const { input, withheld, issues } = buildCapitalAnalysisInput(
      { ...completeBundle(), documentReviews: [], extractedFacts: [], contracts: [] },
      { additionalFacts: [foreign] },
    )
    expect(input.facts.some((fact) => fact.id === "foreign-1")).toBe(false)
    expect(withheld.some((entry) => entry.factId === "foreign-1")).toBe(true)
    expect(issues.some((issue) => issue.code === "HOUSEHOLD_MISMATCH" && issue.blocking)).toBe(true)
  })

  it("keeps only valid confirmed facts in the usable set", () => {
    const invalid = persistedFact({ id: "invalid-1", value: null })
    const { input, withheld } = buildCapitalAnalysisInput(
      { ...completeBundle(), documentReviews: [], extractedFacts: [], contracts: [] },
      { additionalFacts: [invalid] },
    )
    expect(input.facts.some((fact) => fact.id === "invalid-1")).toBe(false)
    expect(withheld.some((entry) => entry.factId === "invalid-1")).toBe(true)
  })

  it("uses validated facts only", () => {
    const { input, adaptedFacts } = buildCapitalAnalysisInput(completeBundle())
    expect(adaptedFacts.length).toBeGreaterThan(0)
    expect(input.facts.every((fact) => fact.status === "CONFIRMED")).toBe(true)
  })

  it("preserves explicit assumptions and never adds its own", () => {
    const assumptions = [{ key: "reserveMonths", value: 6, unit: "months", sourceReference: "owner" }]
    const { input } = buildCapitalAnalysisInput(completeBundle(), { assumptions })
    expect(input.assumptions).toEqual(assumptions)
    expect(buildCapitalAnalysisInput(completeBundle()).input.assumptions).toEqual([])
  })

  it("maps confirmed source data to the expected canonical keys", () => {
    const { input } = buildCapitalAnalysisInput(completeBundle())
    const keys = input.facts.map((fact) => fact.key).sort()
    expect(keys).toEqual(
      [
        CAPITAL_FACT_KEYS.debtPayments,
        CAPITAL_FACT_KEYS.essentialExpenses,
        CAPITAL_FACT_KEYS.existingSavings,
        CAPITAL_FACT_KEYS.income,
        CAPITAL_FACT_KEYS.insuranceCosts,
        CAPITAL_FACT_KEYS.liquidReserve,
      ].sort(),
    )
  })

  it("carries the household and engine version on the input", () => {
    const { input } = buildCapitalAnalysisInput(completeBundle())
    expect(input.householdId).toBe(HOUSEHOLD_ID)
    expect(input.engineVersion).toBe("capital-core-1.0.0")
    expect(input.currency).toBe("EUR")
  })

  it("adapts a reviewed document fact into the input", () => {
    const { input } = buildCapitalAnalysisInput({
      ...completeBundle(),
      extractedFacts: [],
      contracts: [],
      documentReviews: [documentReview()],
    })
    expect(input.facts.map((fact) => fact.key)).toEqual([CAPITAL_FACT_KEYS.debtPayments])
  })

  it("returns an empty usable set for a household with no sources", () => {
    const { input, adaptedFacts } = buildCapitalAnalysisInput({
      household: household(),
      documents: [],
      extractedFacts: [],
      contracts: [],
      cases: [],
      financialProfile: null,
      documentReviews: [],
    })
    expect(adaptedFacts).toHaveLength(0)
    expect(input.facts).toHaveLength(0)
  })
})
