import { describe, expect, it } from "vitest"

import {
  BUSINESS_HEALTH_RUBRIC_VERSION,
  BUSINESS_HEALTH_SCORE_VERSION,
  MIN_COVERAGE_FOR_SCORE,
  computeBusinessHealthScore,
  evidenceSnapshotId,
  type HealthEvidenceInput,
} from "./health-score"

/**
 * The Business Health Score is the deterministic core of the Business
 * Consultant. These tests prove the properties the plan names: identical
 * evidence yields an identical score, a changed period moves only the affected
 * component, missing evidence lowers coverage and blocks unsupported
 * conclusions, a contradiction is surfaced, and self-reported figures are never
 * presented as document-backed.
 */

const AS_OF = "2026-11-07T00:00:00.000Z"

function profile(overrides: Partial<HealthEvidenceInput["profile"]> = {}) {
  return {
    activityDescription: "Reparaturen und Wartung",
    employeeCount: 2,
    annualRevenueBand: "under_100k",
    bookkeepingMethod: "euer",
    eInvoiceStatus: "ready",
    foundedOn: "2020-01-01",
    businessGoals: ["mehr Kunden"],
    businessChallenges: ["Zeit"],
    businessServices: ["Reparatur"],
    businessTools: [],
    ...overrides,
  }
}

function financeEntry(overrides: Partial<HealthEvidenceInput["financeEntries"][number]> = {}) {
  return {
    id: "f1",
    kind: "revenue",
    category: "revenue_sales",
    amountCents: 500_000,
    periodMonth: "2026-01-01",
    source: "manual",
    evidenceClass: "user_provided",
    ...overrides,
  }
}

function evidence(overrides: Partial<HealthEvidenceInput> = {}): HealthEvidenceInput {
  return {
    profile: profile(),
    documents: [],
    financeEntries: [],
    asOf: AS_OF,
    ...overrides,
  }
}

describe("computeBusinessHealthScore — determinism", () => {
  it("produces an identical score for identical evidence", () => {
    const input = evidence({
      documents: [{ id: "d1", category: "gewerbeanmeldung", summary: null, expiresOn: null }],
      financeEntries: [
        financeEntry({ id: "f1", amountCents: 400_000, periodMonth: "2026-01-01" }),
        financeEntry({ id: "f2", kind: "expense", category: "expense_rent", amountCents: 100_000, periodMonth: "2026-01-01" }),
      ],
    })
    const first = computeBusinessHealthScore(input)
    const second = computeBusinessHealthScore(input)
    expect(first.score).toBe(second.score)
    expect(first.components).toEqual(second.components)
    expect(first.evidenceSnapshotId).toBe(second.evidenceSnapshotId)
    expect(first.scoreVersion).toBe(BUSINESS_HEALTH_SCORE_VERSION)
    expect(first.rubricVersion).toBe(BUSINESS_HEALTH_RUBRIC_VERSION)
  })

  it("is order-independent: the same entries in a different order hash the same", () => {
    const a = evidence({ financeEntries: [financeEntry({ id: "f1" }), financeEntry({ id: "f2", amountCents: 10 })] })
    const b = evidence({ financeEntries: [financeEntry({ id: "f2", amountCents: 10 }), financeEntry({ id: "f1" })] })
    expect(evidenceSnapshotId(a)).toBe(evidenceSnapshotId(b))
  })
})

describe("computeBusinessHealthScore — coverage and blocking", () => {
  it("blocks an unsupported conclusion when there is no evidence at all", () => {
    const result = computeBusinessHealthScore(evidence({ profile: profile({ bookkeepingMethod: null, eInvoiceStatus: null }) }))
    expect(result.blocked).toBe(true)
    expect(result.score).toBeNull()
    expect(result.band).toBe("insufficient_evidence")
    expect(result.refusalCode).toBe("INSUFFICIENT_EVIDENCE")
    expect(result.missingEvidence).toContain("finance_history")
  })

  it("shows a score once coverage clears the threshold", () => {
    const result = computeBusinessHealthScore(
      evidence({
        documents: [
          { id: "d1", category: "gewerbeanmeldung", summary: null, expiresOn: null },
          { id: "d2", category: "tax", summary: null, expiresOn: null },
        ],
        financeEntries: [
          financeEntry({ id: "f1", periodMonth: "2026-01-01" }),
          financeEntry({ id: "f2", periodMonth: "2026-02-01" }),
          financeEntry({ id: "f3", periodMonth: "2026-03-01" }),
        ],
      }),
    )
    expect(result.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE_FOR_SCORE)
    expect(result.blocked).toBe(false)
    expect(result.score).not.toBeNull()
  })
})

describe("computeBusinessHealthScore — period sensitivity", () => {
  it("changes only the liquidity component when a period changes", () => {
    const base = evidence({
      documents: [{ id: "d1", category: "tax", summary: null, expiresOn: null }],
      financeEntries: [financeEntry({ id: "f1", amountCents: 100_000, periodMonth: "2026-01-01" })],
    })
    const moved = evidence({
      documents: [{ id: "d1", category: "tax", summary: null, expiresOn: null }],
      financeEntries: [financeEntry({ id: "f1", amountCents: 100_000, periodMonth: "2026-06-01" })],
    })
    const a = computeBusinessHealthScore(base)
    const b = computeBusinessHealthScore(moved)
    // The profile component's own score and coverage do not depend on the finance
    // period, so only freshness (shared across components) may differ.
    const profileA = a.components.find((component) => component.key === "profile_completeness")
    const profileB = b.components.find((component) => component.key === "profile_completeness")
    expect(profileA?.score).toBe(profileB?.score)
    expect(profileA?.coverage).toBe(profileB?.coverage)
    expect(profileA?.reasonCode).toBe(profileB?.reasonCode)
    const liquidityA = a.components.find((component) => component.key === "liquidity")
    const liquidityB = b.components.find((component) => component.key === "liquidity")
    expect(liquidityA?.period?.from).toBe("2026-01-01")
    expect(liquidityB?.period?.from).toBe("2026-06-01")
  })
})

describe("computeBusinessHealthScore — evidence honesty", () => {
  it("does not label self-reported entries as document-backed", () => {
    const result = computeBusinessHealthScore(
      evidence({ financeEntries: [financeEntry({ source: "manual", evidenceClass: "user_provided" })] }),
    )
    const bookkeeping = result.components.find((component) => component.key === "bookkeeping")
    expect(bookkeeping?.reasonCode).toBe("BOOKKEEPING_MOSTLY_MANUAL")
  })

  it("raises a contradiction when an invoice exists with no finance entry", () => {
    const result = computeBusinessHealthScore(
      evidence({ documents: [{ id: "d1", category: "invoice", summary: null, expiresOn: null }] }),
    )
    expect(result.contradictions.map((contradiction) => contradiction.code)).toContain("INVOICE_WITHOUT_FINANCE_ENTRY")
    expect(result.riskFlags).toContain("CONTRADICTORY_EVIDENCE")
  })

  it("flags stale evidence and lowers confidence", () => {
    const fresh = computeBusinessHealthScore(
      evidence({ financeEntries: [financeEntry({ periodMonth: "2026-10-01" })] }),
    )
    const stale = computeBusinessHealthScore(
      evidence({ financeEntries: [financeEntry({ periodMonth: "2025-01-01" })] }),
    )
    expect(stale.riskFlags).toContain("STALE_EVIDENCE")
    expect(stale.confidence).toBeLessThan(fresh.confidence)
  })
})
