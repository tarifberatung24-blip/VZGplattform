import { describe, expect, it, vi } from "vitest"
import { provisionHorizonServiceCase } from "./case-provisioning"
import { SERVICE_REQUEST_ID_FACT } from "./registry"

const CASE_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_CASE_ID = "22222222-2222-4222-8222-222222222222"

type Fact = { key: string; value: string }

/**
 * Fake repository keyed by the fact store, so `findCaseByFact` behaves like the
 * real indexed lookup: it returns the case whose stored fact matches key+value,
 * or `data: null`. `listMine` is intentionally absent from the provisioning path
 * now — the test proves the window scan is gone.
 */
function repository(
  overrides: {
    cases?: Array<{ id: string }>
    facts?: Record<string, Fact[]>
    findError?: string
    listFactsError?: string
  } = {},
) {
  const cases = overrides.cases ?? []
  const facts = overrides.facts ?? {}
  const caseById = new Map(cases.map((c) => [c.id, c]))
  return {
    listMine: vi.fn().mockResolvedValue({ data: cases, error: null }),
    listFacts: vi.fn().mockImplementation(async (caseId: string) => ({
      data: overrides.listFactsError ? null : facts[caseId] ?? [],
      error: overrides.listFactsError ?? null,
    })),
    findCaseByFact: vi.fn().mockImplementation(async (key: string, value: string) => {
      if (overrides.findError) return { data: null, error: overrides.findError }
      for (const [caseId, list] of Object.entries(facts)) {
        if (list.some((fact) => fact.key === key && fact.value === value) && caseById.has(caseId)) {
          return { data: caseById.get(caseId), error: null }
        }
      }
      return { data: null, error: null }
    }),
    createCase: vi.fn().mockResolvedValue({ data: { id: CASE_ID, status: "draft" }, error: null }),
    addFacts: vi.fn().mockResolvedValue({ data: [], error: null }),
    addMessage: vi.fn().mockResolvedValue({ data: { id: "message" }, error: null }),
    appendAudit: vi.fn().mockResolvedValue({ data: {}, error: null }),
    advanceTo: vi.fn().mockImplementation(async (id: string, status: string) => ({ data: { id, status }, error: null })),
  }
}

const INPUT = {
  kind: "steuererklaerung" as const,
  locale: "bg" as const,
  requestId: "hz_request",
  customerName: "Ivan Petrov",
  customerEmail: "ivan@example.com",
  answers: { serviceDetails: "Steuerjahr 2025" },
}

describe("Horizon service case provisioning", () => {
  it("creates a case, records service facts, starts the conversation and blocks on missing evidence", async () => {
    const repo = repository()
    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.error).toBeNull()
    expect(result.reused).toBe(false)
    expect(repo.createCase).toHaveBeenCalledWith(expect.objectContaining({ module: "general", intent: "application" }))
    expect(repo.addFacts).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
      expect.objectContaining({ key: "service_request_type", value: "steuererklaerung", critical: true }),
      expect.objectContaining({ key: SERVICE_REQUEST_ID_FACT, value: "hz_request", critical: true }),
      expect.objectContaining({ key: "alpha_team_lead", value: "finance-tax" }),
    ]))
    expect(repo.addMessage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ role: "assistant" }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "alpha_team_run_created", expect.objectContaining({ serviceKind: "steuererklaerung" }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "quality_safety_blocked", expect.objectContaining({ externalActions: "blocked_until_human_approval" }))
    expect(repo.advanceTo).toHaveBeenNthCalledWith(1, expect.any(String), "collecting_data")
    expect(repo.advanceTo).toHaveBeenNthCalledWith(2, expect.any(String), "waiting_for_user")
  })

  it("reuses the existing case for a repeated request id without scanning the case list", async () => {
    const repo = repository({
      cases: [{ id: CASE_ID }],
      facts: { [CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(CASE_ID)
    // The bounded window scan is gone: the lookup is a targeted fact query.
    expect(repo.listMine).not.toHaveBeenCalled()
    expect(repo.findCaseByFact).toHaveBeenCalledWith(SERVICE_REQUEST_ID_FACT, "hz_request")
    // No new case or facts; only the forward-only advance re-asserts the target.
    expect(repo.createCase).not.toHaveBeenCalled()
    expect(repo.addFacts).not.toHaveBeenCalled()
    expect(repo.addMessage).not.toHaveBeenCalled()
    expect(repo.advanceTo).toHaveBeenCalledOnce()
    expect(repo.advanceTo).toHaveBeenCalledWith(CASE_ID, "waiting_for_user")
  })

  it("finds a case whose matching fact is old, not merely in the recent window", async () => {
    // The matching case is absent from `listMine` (it is far down the history);
    // a window-based scan would have missed it and created a duplicate.
    const repo = repository({
      cases: [],
      facts: { [OTHER_CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })
    // findCaseByFact is keyed off the fact store, so it still resolves the case.
    repo.findCaseByFact.mockResolvedValue({ data: { id: OTHER_CASE_ID, status: "waiting_for_user" }, error: null })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(OTHER_CASE_ID)
    expect(repo.createCase).not.toHaveBeenCalled()
  })

  it("reuses a case provisioned by a legacy attempt that wrote the same fact key", async () => {
    // PR #162 wrote `service_request_id` as a plain fact; the constant kept the
    // same string, so the legacy row is found and no duplicate is created.
    const repo = repository({
      cases: [{ id: CASE_ID }],
      facts: { [CASE_ID]: [{ key: "service_request_id", value: "hz_request" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(repo.createCase).not.toHaveBeenCalled()
  })

  it("creates a new case when no case carries the request id", async () => {
    const repo = repository({
      cases: [{ id: OTHER_CASE_ID }],
      facts: { [OTHER_CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_other" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(false)
    expect(repo.createCase).toHaveBeenCalledOnce()
  })

  it("surfaces a fact-lookup error instead of creating a case it cannot deduplicate", async () => {
    const repo = repository({ findError: "FACTS_LOOKUP_FAILED" })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.error).toBe("FACTS_LOOKUP_FAILED")
    expect(result.data).toBeNull()
    expect(repo.createCase).not.toHaveBeenCalled()
  })

  it("reports a partial failure after the case exists so the caller does not treat it as durable", async () => {
    const repo = repository()
    repo.addMessage.mockResolvedValue({ data: null, error: "MESSAGE_WRITE_FAILED" })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    // The case was created but the flow did not finish; the caller must see the
    // error. A retry then reuses the same case through the request-id fact.
    expect(result.error).toBe("MESSAGE_WRITE_FAILED")
    expect(repo.createCase).toHaveBeenCalledOnce()
  })

  it("completes the lifecycle of a partially-provisioned case on retry", async () => {
    const repo = repository({
      cases: [{ id: CASE_ID }],
      facts: { [CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })
    // The first attempt wrote the facts then died before advancing the case.
    repo.advanceTo.mockResolvedValue({ data: { id: CASE_ID, status: "waiting_for_user" }, error: null })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.status).toBe("waiting_for_user")
    expect(repo.createCase).not.toHaveBeenCalled()
  })

  it("surfaces an advance error on reuse rather than reporting a half-ready case as reused", async () => {
    const repo = repository({
      cases: [{ id: CASE_ID }],
      facts: { [CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })
    repo.advanceTo.mockResolvedValue({ data: null, error: "ADVANCE_FAILED" })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.error).toBe("ADVANCE_FAILED")
    expect(result.data).toBeNull()
  })
})
