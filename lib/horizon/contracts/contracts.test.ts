import { describe, expect, it, vi } from "vitest"

// `server-only` throws outside a React Server Component graph; the contract
// actions are server-only by design, so the guard is stubbed for unit tests.
vi.mock("server-only", () => ({}))

import {
  contractFactSeeds,
  contractMonthlyCost,
  isContractVerified,
  kuendigungCaseForContract,
  type LinkableContract,
} from "./linkage"
import { contractsCopy } from "./copy"
import { KUENDIGUNG_FACT_KEYS } from "../kuendigung/facts"
import { deriveMissingInformation } from "../case/missing-info"

function contract(overrides: Partial<LinkableContract> = {}): LinkableContract {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Internetanschluss",
    category: "internet",
    provider: "Beispiel Telekom GmbH",
    contractNumber: "VK-2024-8891",
    monthlyAmount: 39.99,
    startDate: "2024-03-01",
    endDate: "2026-02-28",
    cancellationDeadline: "2026-01-31",
    reviewStatus: "confirmed",
    documentId: null,
    ...overrides,
  }
}

describe("P17 contract linkage > fact seeds", () => {
  it("carries evidenced fields under the Kündigung fact vocabulary", () => {
    const seeds = contractFactSeeds(contract())
    const byKey = new Map(seeds.map((seed) => [seed.key, seed]))

    expect(byKey.get(KUENDIGUNG_FACT_KEYS.provider)?.value).toBe("Beispiel Telekom GmbH")
    expect(byKey.get(KUENDIGUNG_FACT_KEYS.reference)?.value).toBe("VK-2024-8891")
    expect(byKey.get(KUENDIGUNG_FACT_KEYS.startDate)?.value).toBe("2024-03-01")
    expect(byKey.get(KUENDIGUNG_FACT_KEYS.documentedEndDate)?.value).toBe("2026-02-28")
  })

  it("emits only keys the Kündigung module already reads", () => {
    const known = new Set(Object.values(KUENDIGUNG_FACT_KEYS) as string[])
    for (const seed of contractFactSeeds(contract())) {
      expect(known.has(seed.key)).toBe(true)
    }
  })

  it("omits absent values rather than emitting them empty", () => {
    const seeds = contractFactSeeds(
      contract({ provider: null, contractNumber: null, startDate: null, endDate: null, cancellationDeadline: null }),
    )
    const keys = seeds.map((seed) => seed.key)
    expect(keys).not.toContain(KUENDIGUNG_FACT_KEYS.provider)
    expect(keys).not.toContain(KUENDIGUNG_FACT_KEYS.reference)
    expect(keys).not.toContain(KUENDIGUNG_FACT_KEYS.startDate)
    expect(keys).not.toContain(KUENDIGUNG_FACT_KEYS.documentedEndDate)
  })

  it("does not seed the archive's cancellation deadline as a Kündigung input", () => {
    // A cancel-by date is not a termination date. Seeding it would let the letter
    // carry a date the contract never stated as its end.
    const seeds = contractFactSeeds(contract({ cancellationDeadline: "2026-01-31" }))
    for (const seed of seeds) {
      expect(seed.value).not.toBe("2026-01-31")
    }
  })

  it("drops a malformed date instead of passing it on to be interpreted", () => {
    const seeds = contractFactSeeds(contract({ startDate: "Anfang 2024" }))
    expect(seeds.map((seed) => seed.key)).not.toContain(KUENDIGUNG_FACT_KEYS.startDate)
  })

  it("refuses a date that looks well-formed but is not a real day", () => {
    const seeds = contractFactSeeds(contract({ endDate: "2026-02-30" }))
    expect(seeds.map((seed) => seed.key)).not.toContain(KUENDIGUNG_FACT_KEYS.documentedEndDate)
  })

  it("marks a confirmed contract's facts as verified and an unconfirmed one's as not", () => {
    const confirmed = contractFactSeeds(contract({ reviewStatus: "confirmed" }))
    const unconfirmed = contractFactSeeds(contract({ reviewStatus: "needs_review" }))
    expect(confirmed.every((seed) => seed.verified)).toBe(true)
    expect(unconfirmed.every((seed) => seed.verified === false)).toBe(true)
  })

  it("treats a contract with no review status as unconfirmed", () => {
    expect(isContractVerified(contract({ reviewStatus: null }))).toBe(false)
  })

  it("cites the contract as evidence only when a source document exists", () => {
    expect(contractFactSeeds(contract({ documentId: null })).every((seed) => seed.evidence === null)).toBe(true)
    expect(
      contractFactSeeds(contract({ documentId: "22222222-2222-2222-2222-222222222222" })).every(
        (seed) => seed.evidence !== null,
      ),
    ).toBe(true)
  })

  it("seeds a provider and reference so the case is not missing required facts", () => {
    const facts = contractFactSeeds(contract()).map((seed) => ({
      key: seed.key,
      value: seed.value,
      confirmedAt: seed.verified ? "2026-01-01T00:00:00.000Z" : null,
    }))
    const missing = deriveMissingInformation(facts, "kuendigung")
    expect(missing.complete).toBe(true)
  })
})

describe("P17 contract linkage > cost", () => {
  it("reports a positive cost", () => {
    expect(contractMonthlyCost(contract({ monthlyAmount: 39.99 }))).toBe("39.99")
  })

  it("does not treat zero or a missing cost as a cost", () => {
    expect(contractMonthlyCost(contract({ monthlyAmount: 0 }))).toBe(null)
    expect(contractMonthlyCost(contract({ monthlyAmount: null }))).toBe(null)
  })
})

describe("P17 contract linkage > case", () => {
  it("opens a Kündigung case named after the provider", () => {
    const definition = kuendigungCaseForContract(contract())
    expect(definition.module).toBe("kuendigung")
    expect(definition.intent).toBe("cancellation")
    expect(definition.title).toBe("Kündigung: Beispiel Telekom GmbH")
  })

  it("falls back to the contract title when the provider is unknown", () => {
    const definition = kuendigungCaseForContract(contract({ provider: null }))
    expect(definition.title).toBe("Kündigung: Internetanschluss")
    expect(definition.title).not.toContain("null")
  })
})

describe("P17 copy", () => {
  it("covers both active UI languages", () => {
    expect(Object.keys(contractsCopy).sort()).toEqual(["bg", "de"])
  })

  it("states in both languages that no cost is recorded rather than estimating one", () => {
    expect(contractsCopy.de.noCost).toMatch(/keine kosten/i)
    expect(contractsCopy.bg.noCost).toMatch(/няма/i)
  })

  it("states in both languages that an unconfirmed value needs the user's check", () => {
    expect(contractsCopy.de.unconfirmedWarning).toMatch(/nicht bestätigt/i)
    expect(contractsCopy.bg.unconfirmedWarning).toMatch(/не са потвърдени/i)
  })

  it("keeps neutral analysis separate from offers in both languages", () => {
    expect(contractsCopy.de.neutralAnalysis).toMatch(/neutral/i)
    expect(contractsCopy.bg.neutralAnalysis).toMatch(/неутрален/i)
  })
})
