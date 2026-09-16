import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("pdf-parse", () => ({ default: vi.fn(async () => ({ text: "Bescheid Frist: 30.09.2026" })) }))
import { bescheidAnalysisSchema } from "./cerebras-provider"
import { extractDocumentForAnalysis } from "./document-extraction"

const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 86 >>
stream
BT /F1 12 Tf 20 100 Td (Bescheid Frist: 30.09.2026) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`

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

describe("Bescheid analyzer workflow contract", () => {
  it("extracts text from a PDF before AI analysis", async () => {
    const result = await extractDocumentForAnalysis(new File([minimalPdf], "bescheid.pdf", { type: "application/pdf" }))
    expect(result.kind).toBe("text")
    expect(result.value).toContain("30.09.2026")
  })

  it("accepts an explicit deadline with evidence and confidence", () => {
    const result = bescheidAnalysisSchema.parse(validAnalysis)
    expect(result.deadline).toBe("2026-09-30")
    expect(result.deadlineConfidence).toBeGreaterThan(0.9)
    expect(result.evidenceSnippets.join(" ")).toContain("30.09.2026")
  })

  it("rejects invalid deadline confidence instead of silently accepting it", () => {
    expect(() => bescheidAnalysisSchema.parse({ ...validAnalysis, deadlineConfidence: 1.5 })).toThrow()
  })
})
