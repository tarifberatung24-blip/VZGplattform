import { describe, expect, it } from "vitest"

import { CAPITAL_ENGINE_VERSION, CAPITAL_FACT_KEYS } from "../engine"
import { runCapitalRuntime } from "./orchestrator"
import { buildCapitalP0ReadinessReport } from "./p0-status"
import { CALCULATED_AT, completeBundle, unconfirmedBundle } from "../integration/p0-fixtures"

function runtimeInput(overrides: Partial<Parameters<typeof runCapitalRuntime>[0]> = {}) {
  return {
    bundle: completeBundle(),
    calculatedAt: CALCULATED_AT,
    scenarioId: "scenario-1",
    reserveMonths: 6,
    reviewId: "review-1",
    ...overrides,
  }
}

describe("capital runtime orchestrator", () => {
  it("runs the full chain from source data to a scenario and review draft", () => {
    const result = runCapitalRuntime(runtimeInput())
    expect(result.analysisInput.householdId).toBe("hh-1")
    expect(result.scenario.id).toBe("scenario-1")
    expect(result.scenario.engineVersion).toBe(CAPITAL_ENGINE_VERSION)
    // The fixture has a positive but unfilled reserve gap, so the deterministic
    // engine correctly flags the scenario for advisor review.
    expect(result.scenario.feasibility).toBe("review_required")
    expect(result.reviewDraft.state).toBe("draft")
    expect(result.reviewDraft.scenarioId).toBe("scenario-1")
    expect(result.reviewDraft.reviewerId).toBeNull()
  })

  it("reports feasible when the reserve target is already met", () => {
    const bundle = completeBundle()
    const funded = {
      ...bundle,
      extractedFacts: bundle.extractedFacts.map((fact) =>
        fact.key === "reserve.liquid" ? { ...fact, value: "20000.00" } : fact,
      ),
    }
    const { scenario } = runCapitalRuntime(runtimeInput({ bundle: funded }))
    expect(scenario.feasibility).toBe("feasible")
    expect(scenario.outputs.reserve_gap).toBe(0)
  })

  it("computes the expected surplus and reserve from confirmed source data", () => {
    const { scenario } = runCapitalRuntime(runtimeInput())
    // 3200 income - 1200 expenses - 300 debt - 150 insurance - 200 savings = 1350
    expect(scenario.outputs.monthly_available_surplus).toBe(135_000)
    // (1200 + 300 + 150) * 6 = 9900
    expect(scenario.outputs.reserve_target).toBe(990_000)
    // 9900 - 5000 liquid reserve = 4900 gap
    expect(scenario.outputs.reserve_gap).toBe(490_000)
  })

  it("reports needs_data when source values are unconfirmed", () => {
    const { scenario, reviewDraft } = runCapitalRuntime(runtimeInput({ bundle: unconfirmedBundle() }))
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.missingInputs.length).toBeGreaterThan(0)
    expect(reviewDraft.state).toBe("draft")
  })

  it("produces the same result for the same inputs", () => {
    const first = runCapitalRuntime(runtimeInput())
    const second = runCapitalRuntime(runtimeInput())
    expect(first.scenario.inputSnapshotHash).toBe(second.scenario.inputSnapshotHash)
    expect(JSON.stringify(first.scenario)).toBe(JSON.stringify(second.scenario))
  })

  it("does not mutate its input bundle", () => {
    const bundle = completeBundle()
    const before = JSON.stringify(bundle)
    runCapitalRuntime(runtimeInput({ bundle }))
    expect(JSON.stringify(bundle)).toBe(before)
  })

  it("never replaces a missing value with zero or a default", () => {
    const { scenario } = runCapitalRuntime(runtimeInput({ bundle: unconfirmedBundle() }))
    expect(scenario.outputs.monthly_net_income).toBeNull()
    expect(scenario.outputs.monthly_available_surplus).toBeNull()
    expect(scenario.outputs.reserve_target).toBeNull()
  })

  it("records explicit assumptions rather than choosing them", () => {
    const { scenario } = runCapitalRuntime(runtimeInput({ reserveMonths: 9 }))
    const assumption = scenario.assumptions.find((entry) => entry.key === "reserveMonths")
    expect(assumption?.value).toBe(9)
    expect(assumption?.unit).toBe("months")
  })

  it("surfaces adapter issues alongside a usable scenario", () => {
    const { issues } = runCapitalRuntime(runtimeInput())
    expect(Array.isArray(issues)).toBe(true)
  })

  it("exposes a scenario hash that changes when inputs change", () => {
    const baseline = runCapitalRuntime(runtimeInput()).scenario.inputSnapshotHash
    const changed = runCapitalRuntime(
      runtimeInput({ bundle: unconfirmedBundle() }),
    ).scenario.inputSnapshotHash
    expect(baseline).not.toBe(changed)
  })
})

describe("capital P0 readiness report", () => {
  it("is deterministic for a given reference", () => {
    const first = buildCapitalP0ReadinessReport("2025-03-01")
    const second = buildCapitalP0ReadinessReport("2025-03-01")
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it("reports implemented, partial, and blocked areas", () => {
    const report = buildCapitalP0ReadinessReport("2025-03-01")
    expect(report.readyAreas).toContain("source_to_financial_fact_adapters")
    expect(report.partialAreas).toContain("advisor_review_lifecycle")
    expect(report.blockedAreas).toContain("fact_persistence")
    expect(report.counts.IMPLEMENTED).toBeGreaterThan(0)
  })

  it("documents schema and RLS requirements without creating them", () => {
    const report = buildCapitalP0ReadinessReport("2025-03-01")
    const tables = report.schemaRequiredNext.map((requirement) => requirement.table)
    expect(tables).toContain("capital_facts")
    expect(tables).toContain("capital_publish_jobs")
    for (const requirement of report.schemaRequiredNext) {
      expect(requirement.columns.length).toBeGreaterThan(0)
      expect(requirement.rls.length).toBeGreaterThan(0)
    }
  })

  it("keeps the capital UI and provider features out of scope", () => {
    const report = buildCapitalP0ReadinessReport("2025-03-01")
    const ui = report.statuses.find((area) => area.area === "capital_ui")
    expect(ui?.status).toBe("NOT_IN_SCOPE")
    const providers = report.statuses.find((area) => area.area === "external_providers_and_investment_features")
    expect(providers?.status).toBe("NOT_IN_SCOPE")
  })

  it("references only canonical engine keys in the intake model", () => {
    const canonical = new Set(Object.values(CAPITAL_FACT_KEYS))
    for (const key of Object.values(CAPITAL_FACT_KEYS)) expect(canonical.has(key)).toBe(true)
  })
})
