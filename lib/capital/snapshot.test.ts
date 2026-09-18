import { describe, expect, it } from "vitest"

import type { CapitalAssumption } from "./boundaries"
import { createFinancialFact, type FinancialFact } from "./financial-fact"
import { createProvenance } from "./provenance"
import { buildInputSnapshot, canonicalize, hashCapitalInputs, sha256Hex, sortFactsCanonically, type CapitalSnapshotMaterial } from "./snapshot"

function moneyFact(key: string, value: number, overrides: Partial<Parameters<typeof createFinancialFact>[0]> = {}): FinancialFact {
  return createFinancialFact({
    id: `fact-${key}`,
    householdId: "household-1",
    key,
    value,
    type: "money",
    currency: "EUR",
    status: "CONFIRMED",
    confirmedAt: "2025-02-01T10:00:00.000Z",
    confirmedBy: "user-1",
    provenance: createProvenance({ source: "USER" }),
    ...overrides,
  })
}

const assumptions: CapitalAssumption[] = [{ key: "reserveMonths", value: 6, unit: "months", sourceReference: "scenario_assumption" }]

function material(overrides: Partial<CapitalSnapshotMaterial> = {}): CapitalSnapshotMaterial {
  return {
    engineVersion: "capital-core-1.0.0",
    householdId: "household-1",
    currency: "EUR",
    facts: [moneyFact("income.net_monthly", 320_000), moneyFact("expenses.essential_monthly", 120_000)],
    assumptions,
    goals: [],
    missingInputs: [],
    ...overrides,
  }
}

describe("canonicalize", () => {
  it("sorts object keys so property order does not matter", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }))
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it("preserves array order", () => {
    expect(canonicalize([1, 2, 3])).toBe("[1,2,3]")
    expect(canonicalize([3, 2, 1])).not.toBe(canonicalize([1, 2, 3]))
  })

  it("handles nested structures and primitives", () => {
    expect(canonicalize(null)).toBe("null")
    expect(canonicalize(true)).toBe("true")
    expect(canonicalize("x")).toBe('"x"')
    expect(canonicalize({ a: [{ d: 1, c: 2 }] })).toBe('{"a":[{"c":2,"d":1}]}')
  })

  it("omits undefined properties but rejects non-finite numbers", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}')
    expect(() => canonicalize({ a: Number.NaN })).toThrow("CANONICALIZE_NON_FINITE_NUMBER")
    expect(() => canonicalize({ a: Number.POSITIVE_INFINITY })).toThrow("CANONICALIZE_NON_FINITE_NUMBER")
  })
})

describe("sha256Hex", () => {
  it("produces a stable 64-character hex digest", () => {
    const digest = sha256Hex("capital")
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Hex("capital")).toBe(digest)
    expect(sha256Hex("capital!")).not.toBe(digest)
  })
})

describe("sortFactsCanonically", () => {
  it("orders by key, then version, then id", () => {
    const facts = [
      moneyFact("b", 1),
      moneyFact("a", 2),
      moneyFact("a", 3, { id: "fact-a-v2", version: 2 }),
      moneyFact("a", 4, { id: "fact-a-v3", version: 3 }),
    ]
    const sorted = sortFactsCanonically(facts).map((fact) => `${fact.key}:${fact.version}:${fact.id}`)
    expect(sorted).toEqual(["a:1:fact-a", "a:2:fact-a-v2", "a:3:fact-a-v3", "b:1:fact-b"])
  })

  it("breaks ties on identical key and version by id", () => {
    const facts = [moneyFact("a", 1, { id: "fact-z" }), moneyFact("a", 1, { id: "fact-a" })]
    expect(sortFactsCanonically(facts).map((fact) => fact.id)).toEqual(["fact-a", "fact-z"])
  })

  it("does not mutate the input array", () => {
    const facts = [moneyFact("b", 1), moneyFact("a", 2)]
    const snapshot = [...facts]
    sortFactsCanonically(facts)
    expect(facts).toEqual(snapshot)
  })
})

describe("input snapshot hash", () => {
  it("is stable when fact array order changes", () => {
    const forward = material()
    const reversed = material({ facts: [...forward.facts].reverse() })
    expect(hashCapitalInputs(reversed)).toBe(hashCapitalInputs(forward))
  })

  it("is stable when assumption order changes", () => {
    const first: CapitalAssumption[] = [
      { key: "a", value: 1, unit: null, sourceReference: null },
      { key: "b", value: 2, unit: null, sourceReference: null },
    ]
    const second: CapitalAssumption[] = [...first].reverse()
    expect(hashCapitalInputs(material({ assumptions: second }))).toBe(hashCapitalInputs(material({ assumptions: first })))
  })

  it("is stable when missing-input order changes", () => {
    const missing = [
      { key: "a", reason: "absent" as const, requiredBy: "x" },
      { key: "b", reason: "unconfirmed" as const, requiredBy: "y" },
    ]
    expect(hashCapitalInputs(material({ missingInputs: [...missing].reverse() }))).toBe(
      hashCapitalInputs(material({ missingInputs: missing })),
    )
  })

  it("is stable across rebuilt-but-equivalent objects", () => {
    expect(hashCapitalInputs(material())).toBe(hashCapitalInputs(material()))
  })

  it("changes when a value changes", () => {
    const changed = material({ facts: [moneyFact("income.net_monthly", 320_001), moneyFact("expenses.essential_monthly", 120_000)] })
    expect(hashCapitalInputs(changed)).not.toBe(hashCapitalInputs(material()))
  })

  it("changes when an assumption changes", () => {
    const changed = material({ assumptions: [{ key: "reserveMonths", value: 9, unit: "months", sourceReference: "scenario_assumption" }] })
    expect(hashCapitalInputs(changed)).not.toBe(hashCapitalInputs(material()))
  })

  it("changes when the household changes", () => {
    expect(hashCapitalInputs(material({ householdId: "household-2" }))).not.toBe(hashCapitalInputs(material()))
  })

  it("changes when a fact status changes", () => {
    const draft = material({
      facts: [moneyFact("income.net_monthly", 320_000, { status: "DRAFT", confirmedAt: null, confirmedBy: null })],
    })
    const confirmed = material({ facts: [moneyFact("income.net_monthly", 320_000)] })
    expect(hashCapitalInputs(draft)).not.toBe(hashCapitalInputs(confirmed))
  })

  it("produces a 64-character lowercase hex digest", () => {
    expect(hashCapitalInputs(material())).toMatch(/^[0-9a-f]{64}$/)
  })

  it("serializes to canonical JSON that ignores property insertion order", () => {
    expect(buildInputSnapshot(material())).toBe(buildInputSnapshot(material()))
  })
})
