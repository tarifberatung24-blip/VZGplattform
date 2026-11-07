import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildBusinessContext,
  buildBusinessDiagnosisPrompt,
  createBusinessDiagnosisRunner,
  parseDiagnosisResponse,
  type BusinessContextInput,
} from "./diagnosis"
import { MAX_FINDINGS } from "./contract"

/**
 * The evidence classification is the safety claim of the whole Business
 * Consultant: a statement the model produced must never be stored as a verified
 * fact. These tests exercise the real parser and the real runner, with the model
 * call injected, to prove the downgrade rules hold for hostile input.
 */

const profileId = "p0000000-0000-4000-8000-000000000001"

function context(overrides: Partial<BusinessContextInput> = {}): BusinessContextInput {
  return {
    locale: "de",
    profile: {
      id: profileId,
      businessName: "Betrieb Test",
      legalForm: "einzelunternehmen",
      industry: "Handwerk",
      activityDescription: "Reparaturen",
      city: "Berlin",
      foundedOn: "2020-01-01",
      employeeCount: 1,
      annualRevenueBand: "under_22k",
      bookkeepingMethod: "euer",
      eInvoiceStatus: "preparing",
      businessGoals: ["mehr Kunden"],
      businessChallenges: ["Zeit"],
      businessServices: ["Reparatur"],
      businessTools: [],
    },
    documents: [],
    financeEntries: [],
    missingProfileFields: [],
    ...overrides,
  }
}

describe("parseDiagnosisResponse — evidence downgrade rules", () => {
  it("downgrades an undeclared evidence class to ai_assumption", () => {
    const raw = JSON.stringify({
      findings: [{ section: "weaknesses", statement: "Zu wenig Zeit", references: [] }],
    })
    const result = parseDiagnosisResponse(raw, [])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].evidenceClass).toBe("ai_assumption")
  })

  it("downgrades an invalid evidence class string to ai_assumption", () => {
    const raw = JSON.stringify({
      findings: [{ section: "weaknesses", statement: "X", evidenceClass: "definitely_true", references: [] }],
    })
    expect(parseDiagnosisResponse(raw, []).findings[0].evidenceClass).toBe("ai_assumption")
  })

  it("refuses verified_fact without a document reference", () => {
    const raw = JSON.stringify({
      findings: [
        {
          section: "cost_opportunities",
          statement: "Versicherung ist zu teuer",
          evidenceClass: "verified_fact",
          references: [{ kind: "business_profile", id: profileId }],
        },
      ],
    })
    expect(parseDiagnosisResponse(raw, []).findings[0].evidenceClass).toBe("ai_assumption")
  })

  it("keeps verified_fact only when a document reference backs it", () => {
    const raw = JSON.stringify({
      findings: [
        {
          section: "cost_opportunities",
          statement: "Die Police kostet 1.200 EUR jaehrlich",
          evidenceClass: "verified_fact",
          references: [{ kind: "document", id: "d0000000-0000-4000-8000-000000000001" }],
        },
      ],
    })
    const finding = parseDiagnosisResponse(raw, []).findings[0]
    expect(finding.evidenceClass).toBe("verified_fact")
    expect(finding.references[0]).toEqual({ kind: "document", id: "d0000000-0000-4000-8000-000000000001" })
  })

  it("drops a finding whose section is not in the closed list", () => {
    const raw = JSON.stringify({
      findings: [
        { section: "secret_tax_scheme", statement: "Trick", evidenceClass: "verified_fact", references: [] },
        { section: "weaknesses", statement: "Echte Schwaeche", evidenceClass: "user_provided", references: [] },
      ],
    })
    const result = parseDiagnosisResponse(raw, [])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].section).toBe("weaknesses")
  })

  it("returns an empty diagnosis for malformed JSON rather than throwing", () => {
    expect(parseDiagnosisResponse("not json at all", []).findings).toEqual([])
    expect(parseDiagnosisResponse("", []).findings).toEqual([])
    expect(parseDiagnosisResponse("{}", []).findings).toEqual([])
  })

  it("extracts JSON even when the model wraps it in prose and a code fence", () => {
    const raw = [
      "Hier ist die Analyse:",
      "```json",
      JSON.stringify({
        findings: [{ section: "overview", statement: "Kleiner Betrieb", evidenceClass: "user_provided", references: [] }],
      }),
      "```",
      "Ende.",
    ].join("\n")
    const result = parseDiagnosisResponse(raw, [])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].section).toBe("overview")
  })

  it("bounds the number of findings", () => {
    const findings = Array.from({ length: MAX_FINDINGS + 25 }, (_, index) => ({
      section: "weaknesses",
      statement: `Finding ${index}`,
      evidenceClass: "ai_assumption",
      references: [],
    }))
    const result = parseDiagnosisResponse(JSON.stringify({ findings }), [])
    expect(result.findings).toHaveLength(MAX_FINDINGS)
  })

  it("bounds and sanitises the missing-information list", () => {
    const raw = JSON.stringify({
      findings: [],
      missingInformation: [...Array.from({ length: 50 }, (_, i) => `item ${i}`), 42, null, "  "],
    })
    const result = parseDiagnosisResponse(raw, [])
    expect(result.missingInformation.length).toBeLessThanOrEqual(20)
    expect(result.missingInformation.every((entry) => typeof entry === "string" && entry.length > 0)).toBe(true)
  })

  it("carries the caller's input references through untouched", () => {
    const references = [{ kind: "business_profile" as const, id: profileId }]
    const result = parseDiagnosisResponse(JSON.stringify({ findings: [] }), references)
    expect(result.inputReferences).toEqual(references)
  })
})

describe("buildBusinessContext", () => {
  it("labels the context as data and names finance entries as the only figures", () => {
    const serialized = buildBusinessContext(context())
    const parsed = JSON.parse(serialized)
    expect(parsed.note).toContain("ONLY figures")
    expect(parsed.profile.business_name).toBe("Betrieb Test")
  })

  it("passes missing profile fields through so the model asks instead of guessing", () => {
    const parsed = JSON.parse(buildBusinessContext(context({ missingProfileFields: ["employee_count"] })))
    expect(parsed.missing_profile_fields).toEqual(["employee_count"])
  })
})

describe("buildBusinessDiagnosisPrompt", () => {
  it("states the no-invention and no-advice rules and includes the prompt version", () => {
    const prompt = buildBusinessDiagnosisPrompt({ context: "{}", locale: "de", promptVersion: "v1" })
    expect(prompt).toContain("Erfinde keine Umsaetze")
    expect(prompt).toContain("requires_external_verification")
    expect(prompt).toContain("prompt_version: v1")
  })
})

describe("createBusinessDiagnosisRunner", () => {
  const validModelOutput = JSON.stringify({
    findings: [
      {
        section: "weaknesses",
        statement: "Buchhaltung wird nicht regelmaessig gefuehrt",
        evidenceClass: "user_provided",
        references: [{ kind: "business_profile", id: profileId }],
      },
    ],
  })

  it("refuses to run when the model is not configured", async () => {
    const runner = createBusinessDiagnosisRunner({ apiKeyPresent: () => false })
    const outcome = await runner({ context: context(), signal: new AbortController().signal })
    expect(outcome).toEqual({ status: "failed", errorCode: "ENGINE_NOT_CONFIGURED" })
  })

  it("returns a ready diagnosis with model and prompt provenance", async () => {
    const runner = createBusinessDiagnosisRunner({
      apiKeyPresent: () => true,
      generate: async () => validModelOutput,
    })
    const outcome = await runner({ context: context(), signal: new AbortController().signal })
    expect(outcome.status).toBe("ready")
    if (outcome.status !== "ready") return
    expect(outcome.model).toBe("openai/gpt-oss-20b")
    expect(outcome.promptVersion).toBe("horizon-business-diagnosis-v1")
    expect(outcome.content.findings).toHaveLength(1)
  })

  it("treats an empty diagnosis as a failure, never as a result", async () => {
    const runner = createBusinessDiagnosisRunner({
      apiKeyPresent: () => true,
      generate: async () => JSON.stringify({ findings: [] }),
    })
    const outcome = await runner({ context: context(), signal: new AbortController().signal })
    expect(outcome).toEqual({ status: "failed", errorCode: "STEP_OPERATION_FAILED" })
  })

  it("reports a timeout when the signal aborts", async () => {
    const controller = new AbortController()
    const runner = createBusinessDiagnosisRunner({
      apiKeyPresent: () => true,
      generate: async () => {
        controller.abort()
        const error = new Error("aborted")
        error.name = "AbortError"
        throw error
      },
    })
    const outcome = await runner({ context: context(), signal: controller.signal })
    expect(outcome).toEqual({ status: "failed", errorCode: "EXECUTION_TIMEOUT" })
  })

  it("reports a generic failure when the model call throws", async () => {
    const runner = createBusinessDiagnosisRunner({
      apiKeyPresent: () => true,
      generate: async () => {
        throw new Error("upstream 500")
      },
    })
    const outcome = await runner({ context: context(), signal: new AbortController().signal })
    expect(outcome).toEqual({ status: "failed", errorCode: "STEP_OPERATION_FAILED" })
  })

  it("applies the evidence downgrade to a hostile model response", async () => {
    const runner = createBusinessDiagnosisRunner({
      apiKeyPresent: () => true,
      generate: async () =>
        JSON.stringify({
          findings: [
            { section: "risks", statement: "Sie sparen 5.000 EUR Steuern", evidenceClass: "verified_fact", references: [] },
          ],
        }),
    })
    const outcome = await runner({ context: context(), signal: new AbortController().signal })
    expect(outcome.status).toBe("ready")
    if (outcome.status !== "ready") return
    expect(outcome.content.findings[0].evidenceClass).toBe("ai_assumption")
  })
})
