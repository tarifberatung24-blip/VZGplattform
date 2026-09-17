import { describe, expect, it, vi } from "vitest"

// `server-only` throws outside a React Server Component graph; the provider under test is
// server-only by design, so the guard is stubbed for this unit test.
vi.mock("server-only", () => ({}))

import { bescheidAnalysisSchema } from "./cerebras-provider"

const validAnalysis = {
  documentType: "Einkommensteuerbescheid",
  sender: "Finanzamt Berlin",
  recipient: "Max Mustermann",
  customerNumber: "Nicht erkannt",
  contractNumber: "Nicht erkannt",
  referenceNumber: "AZ-123",
  issueDate: "2026-09-01",
  receivedDate: "2026-09-03",
  deadline: "2026-09-30",
  deadlineConfidence: 0.98,
  requiredAction: "Einspruch prüfen und gegebenenfalls einreichen",
  amountInvolved: "250,00 EUR",
  amounts: ["250,00 EUR"],
  currency: "EUR",
  summaryBg: "Има посочен срок 30.09.2026. Провери оригинала преди действие.",
  summaryDe: "Eine Frist zum 30.09.2026 ist im Schreiben genannt.",
  facts: [{ label: "Frist", value: "30.09.2026", confidence: 0.98 }],
  risks: ["Срокът трябва да се потвърди спрямо оригинала."],
  missingInformation: [],
  recommendedNextSteps: ["Потвърди датата в оригиналния Bescheid."],
  confidence: 0.94,
  evidenceSnippets: ["Bescheid Frist: 30.09.2026"],
}

describe("Cerebras Bescheid analyzer contract", () => {
  it("accepts an explicit deadline with evidence and confidence", () => {
    const result = bescheidAnalysisSchema.parse(validAnalysis)
    expect(result.deadline).toBe("2026-09-30")
    expect(result.deadlineConfidence).toBeGreaterThan(0.9)
    expect(result.evidenceSnippets.join(" ")).toContain("30.09.2026")
  })

  it("rejects invalid deadline confidence instead of silently accepting it", () => {
    expect(() => bescheidAnalysisSchema.parse({ ...validAnalysis, deadlineConfidence: 1.5 })).toThrow()
  })

  it("rejects unknown fields so a provider cannot widen the contract", () => {
    expect(() => bescheidAnalysisSchema.parse({ ...validAnalysis, inventedField: true })).toThrow()
  })
})