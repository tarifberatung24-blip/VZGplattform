import { describe, expect, it } from "vitest"
import {
  boardForContract,
  boardForFacts,
  deriveMissingInfo,
  deriveNextSteps,
  deriveRiskFlags,
  type ContractReviewFacts,
} from "./review"

function facts(overrides: Partial<ContractReviewFacts> = {}): ContractReviewFacts {
  return {
    title: "Internetanschluss",
    category: "internet",
    provider: "Beispiel Telekom GmbH",
    contractNumber: "VK-2024-8891",
    monthlyAmount: 39.99,
    startDate: "2024-03-01",
    endDate: "2026-02-28",
    cancellationDeadline: "2026-01-31",
    summary: "Zusammenfassung",
    confidence: 0.9,
    evidence: ["Vertragsende: 28.02.2026"],
    ...overrides,
  }
}

describe("P17 contract review > board", () => {
  it("places a confirmed contract in Good", () => {
    expect(boardForContract({ review_status: "confirmed", extraction_confidence: 0.9 })).toBe("good")
  })

  it("places an unconfirmed contract in Urgent", () => {
    expect(boardForContract({ review_status: "needs_review", extraction_confidence: null })).toBe("urgent")
  })

  it("places a low-confidence unconfirmed extraction in Attention", () => {
    expect(boardForContract({ review_status: "needs_review", extraction_confidence: 0.3 })).toBe("attention")
  })

  it("treats an analysis below the confidence floor as Urgent", () => {
    expect(boardForFacts(facts({ confidence: 0.4 }))).toBe("urgent")
    expect(boardForFacts(facts({ confidence: 0.8 }))).toBe("attention")
  })
})

describe("P17 contract review > missing info", () => {
  it("reports complete when every field is present", () => {
    const missing = deriveMissingInfo(facts())
    expect(missing.complete).toBe(true)
    expect(missing.fields).toEqual([])
    expect(missing.present).toBe(missing.total)
  })

  it("lists each absent field rather than inventing one", () => {
    const missing = deriveMissingInfo(facts({ provider: "", monthlyAmount: null, endDate: "", cancellationDeadline: "" }))
    expect(missing.complete).toBe(false)
    expect(missing.fields).toEqual(expect.arrayContaining(["provider", "monthlyAmount", "endDate", "cancellationDeadline"]))
  })

  it("treats a zero amount as not recorded", () => {
    expect(deriveMissingInfo(facts({ monthlyAmount: 0 })).fields).toContain("monthlyAmount")
  })

  it("drops a malformed date instead of counting it as present", () => {
    expect(deriveMissingInfo(facts({ endDate: "2026-02-30" })).fields).toContain("endDate")
  })
})

describe("P17 contract review > next steps", () => {
  it("returns at most three concrete steps", () => {
    expect(deriveNextSteps(facts()).length).toBeLessThanOrEqual(3)
    expect(deriveNextSteps(facts({ cancellationDeadline: "" })).length).toBeLessThanOrEqual(3)
  })

  it("offers a reminder only when a cancellation deadline exists", () => {
    expect(deriveNextSteps(facts()).map((step) => step.view)).toContain("add_reminder")
    expect(deriveNextSteps(facts({ cancellationDeadline: "" })).map((step) => step.view)).not.toContain("add_reminder")
  })

  it("keeps every step tied to an existing action view", () => {
    const allowed = new Set(["review_facts", "add_reminder", "optimize_tariff", "prepare_kuendigung", "explain"])
    for (const step of deriveNextSteps(facts())) expect(allowed.has(step.view)).toBe(true)
  })

  it("never offers a step that sends anything or invents a saving", () => {
    const views = deriveNextSteps(facts()).map((step) => step.view)
    expect(views).not.toContain("send")
    expect(views).not.toContain("estimate_saving")
  })
})

describe("P17 contract review > risk flags", () => {
  it("raises a low-confidence flag only below the floor", () => {
    expect(deriveRiskFlags(facts({ confidence: 0.4 })).map((flag) => flag.id)).toContain("low_confidence")
    expect(deriveRiskFlags(facts({ confidence: 0.9 })).map((flag) => flag.id)).not.toContain("low_confidence")
  })

  it("flags a contract with no stated end or cancellation date", () => {
    expect(deriveRiskFlags(facts({ endDate: "", cancellationDeadline: "" })).map((flag) => flag.id)).toContain("missing_dates")
  })

  it("flags a cancellation deadline that sits after the stated end date", () => {
    const flags = deriveRiskFlags(facts({ endDate: "2026-02-28", cancellationDeadline: "2026-03-31" }))
    expect(flags.map((flag) => flag.id)).toContain("deadline_after_end")
  })

  it("does not flag a deadline that is before the stated end date", () => {
    expect(deriveRiskFlags(facts()).map((flag) => flag.id)).not.toContain("deadline_after_end")
  })

  it("carries the document snippets as evidence on every flag", () => {
    const flags = deriveRiskFlags(facts({ endDate: "", cancellationDeadline: "", evidence: ["Anbieter: Beispiel"] }))
    expect(flags.every((flag) => flag.evidence.length > 0)).toBe(true)
  })

  it("orders urgent flags before attention and info", () => {
    const flags = deriveRiskFlags(facts({ confidence: 0.2, monthlyAmount: null }))
    const levels = flags.map((flag) => flag.level)
    expect(levels.indexOf("urgent")).toBeLessThan(levels.indexOf("info"))
  })

  it("surfaces provider-reported risk flags without inventing them", () => {
    expect(deriveRiskFlags(facts({ riskFlags: ["Preisanpassung vorbehalten"] })).map((flag) => flag.id)).toContain("provider_0")
    expect(deriveRiskFlags(facts()).map((flag) => flag.id)).not.toContain("provider_0")
  })
})
