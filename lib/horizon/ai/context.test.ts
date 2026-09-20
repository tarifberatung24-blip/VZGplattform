import { describe, expect, it } from "vitest"
import {
  HORIZON_AI_CAPABILITIES,
  HORIZON_AI_FORBIDDEN_DECISIONS,
  HORIZON_AI_MODEL,
  HORIZON_PROMPT_VERSIONS,
  isHorizonAiCapability,
  provenance,
} from "./registry"
import {
  ALL_CAPABILITIES,
  capabilitiesInvokeForbiddenDecision,
  screenRequest,
} from "./guard"
import { capabilitiesForModule, moduleAllowsCapability } from "./module-rails"
import { OUTPUT_LOCALE, buildCaseContext, serializeCaseContext } from "./context"
import type { Case, CaseDraft, ExtractedFact } from "@/lib/horizon/case/contract"

const baseCase: Case = {
  id: "11111111-1111-1111-1111-111111111111",
  ownerId: "22222222-2222-2222-2222-222222222222",
  module: "agentur_fuer_arbeit",
  status: "collecting_data",
  title: "Anliegen bei der Agentur für Arbeit",
  intent: "application",
  uiLocale: "bg",
  conversationLocale: "bg",
  institution: "Agentur für Arbeit Berlin",
  deadline: null,
  createdAt: "2026-01-01T00:00:00.000Z",
}

const fact = (over: Partial<ExtractedFact>): ExtractedFact => ({
  id: "f1",
  caseId: baseCase.id,
  documentId: "d1",
  pageNo: 1,
  key: "claim_type",
  value: "Arbeitslosengeld",
  evidence: "Antrag auf Arbeitslosengeld",
  sourceType: "document",
  confidence: 0.9,
  critical: false,
  confirmedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
})

const draft = (over: Partial<CaseDraft>): CaseDraft => ({
  id: "draft-1",
  caseId: baseCase.id,
  version: 1,
  subject: "Antrag",
  body: "Sehr geehrte Damen und Herren,",
  recipient: "Agentur für Arbeit",
  contentHash: "a".repeat(64),
  reviewStatus: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
})

describe("prompt and model version registry", () => {
  it("gives every prompt a stable, distinct version literal", () => {
    const versions = Object.values(HORIZON_PROMPT_VERSIONS)
    expect(new Set(versions).size).toBe(versions.length)
    for (const version of versions) {
      expect(version).toMatch(/^horizon-[a-z-]+-v\d+$/)
    }
  })

  it("returns model and prompt version together as provenance", () => {
    const p = provenance("caseAssistant")
    expect(p).toEqual({
      model: HORIZON_AI_MODEL,
      promptVersion: HORIZON_PROMPT_VERSIONS.caseAssistant,
    })
  })
})

describe("capability vocabulary", () => {
  it("contains only the six permitted output shapes", () => {
    expect([...HORIZON_AI_CAPABILITIES]).toEqual([
      "explain",
      "translate",
      "extract_assist",
      "ask_missing_questions",
      "draft",
      "summarize",
    ])
  })

  it("is disjoint from the forbidden decisions", () => {
    // If anyone adds an "approve"/"send"/"authorize" capability this fails.
    expect(capabilitiesInvokeForbiddenDecision()).toEqual([])
    for (const decision of HORIZON_AI_FORBIDDEN_DECISIONS) {
      expect(isHorizonAiCapability(decision)).toBe(false)
    }
  })

  it("still lists the five withheld decisions", () => {
    expect([...HORIZON_AI_FORBIDDEN_DECISIONS]).toEqual([
      "authorization",
      "user_approval",
      "send_execution",
      "deterministic_arithmetic",
      "tenant_access",
    ])
  })
})

describe("screenRequest", () => {
  it("rejects an unknown capability before any provider call", () => {
    for (const value of [null, undefined, "", "approve", "send", "authorize", 1]) {
      const result = screenRequest({ capability: value, module: "agentur_fuer_arbeit" })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.rejection.code).toBe("unknown_capability")
    }
  })

  it("rejects a capability the module does not offer", () => {
    // Steuererklärung has no `draft`: tax output must not come from free text.
    const result = screenRequest({ capability: "draft", module: "steuererklaerung" })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.rejection.code).toBe("capability_not_allowed_for_module")
  })

  it("allows a capability the module does offer", () => {
    const result = screenRequest({ capability: "explain", module: "steuererklaerung" })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.capability).toBe("explain")
  })
})

describe("per-module rails", () => {
  it("falls back to explanation-only for an unknown module", () => {
    expect(capabilitiesForModule("brand_new_module")).toEqual(["explain"])
    expect(moduleAllowsCapability("brand_new_module", "draft")).toBe(false)
  })

  it("never offers a capability outside the registry vocabulary", () => {
    for (const moduleId of [
      "unterlagen_erklaeren",
      "contract_management",
      "kuendigung",
      "agentur_fuer_arbeit",
      "jobcenter",
      "steuererklaerung",
      "general",
    ]) {
      for (const capability of capabilitiesForModule(moduleId)) {
        expect(ALL_CAPABILITIES).toContain(capability)
      }
    }
  })
})

describe("buildCaseContext", () => {
  it("splits confirmed from unconfirmed facts", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [
        fact({ id: "a", confirmedAt: "2026-01-02T00:00:00.000Z" }),
        fact({ id: "b", confirmedAt: null }),
      ],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 1,
    })
    expect(context.confirmedFacts).toHaveLength(1)
    expect(context.unconfirmedFacts).toHaveLength(1)
    expect(context.confirmedFacts[0].confirmed).toBe(true)
    expect(context.unconfirmedFacts[0].confirmed).toBe(false)
  })

  it("keeps the authoritative output language German regardless of UI language", () => {
    const context = buildCaseContext({
      case: { ...baseCase, uiLocale: "bg", conversationLocale: "bg" },
      facts: [],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    expect(context.outputLocale).toBe("de")
    expect(OUTPUT_LOCALE).toBe("de")
    expect(context.conversationLocale).toBe("bg")
  })

  it("marks only explicitly approved drafts as approved", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: null,
      drafts: [draft({ id: "d1" }), draft({ id: "d2", version: 2 })],
      approvedDraftIds: ["d2"],
      documentCount: 0,
    })
    expect(context.draftSummaries.find((d) => d.version === 1)?.approved).toBe(false)
    expect(context.draftSummaries.find((d) => d.version === 2)?.approved).toBe(true)
  })

  it("passes missing keys through instead of guessing them", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: {
        missingFactKeys: ["claim_type"],
        unconfirmedCriticalFactKeys: ["recipient_institution"],
        complete: false,
      },
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    expect(context.missingFactKeys).toEqual(["claim_type"])
    expect(context.unconfirmedCriticalFactKeys).toEqual(["recipient_institution"])
  })

  it("reports an empty case so the assistant asks rather than invents", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    expect(context.empty).toBe(true)
  })

  it("is not empty once any input exists", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [fact({ confirmedAt: null })],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    expect(context.empty).toBe(false)
  })
})

describe("serializeCaseContext", () => {
  it("labels the context as data with an explicit output language", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [fact({ confirmedAt: "2026-01-02T00:00:00.000Z" })],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 1,
    })
    const payload = JSON.parse(serializeCaseContext(context))
    expect(payload.output_language).toBe("de")
    expect(payload.case.module).toBe("agentur_fuer_arbeit")
    expect(payload.confirmed_facts).toHaveLength(1)
    expect(payload.unconfirmed_facts).toHaveLength(0)
  })

  it("carries no owner identifier into the model payload", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [fact({})],
      missing: null,
      drafts: [draft({})],
      approvedDraftIds: [],
      documentCount: 1,
    })
    const serialized = serializeCaseContext(context)
    expect(serialized).not.toContain(baseCase.ownerId)
    expect(serialized).not.toContain("ownerId")
    expect(serialized).not.toContain(baseCase.id)
  })
})