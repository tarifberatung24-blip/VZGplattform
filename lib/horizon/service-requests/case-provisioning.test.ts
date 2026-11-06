import { describe, expect, it, vi } from "vitest"
import { provisionHorizonServiceCase } from "./case-provisioning"
import { SERVICE_REQUEST_ID_FACT } from "./registry"

const CASE_ID = "11111111-1111-4111-8111-111111111111"

function repository(overrides: { cases?: Array<{ id: string }>; facts?: Record<string, unknown[]> } = {}) {
  const cases = overrides.cases ?? []
  const facts = overrides.facts ?? {}
  return {
    listMine: vi.fn().mockResolvedValue({ data: cases, error: null }),
    listFacts: vi.fn().mockImplementation(async (caseId: string) => ({ data: facts[caseId] ?? [], error: null })),
    createCase: vi.fn().mockResolvedValue({ data: { id: CASE_ID, status: "draft" }, error: null }),
    addFacts: vi.fn().mockResolvedValue({ data: [], error: null }),
    addMessage: vi.fn().mockResolvedValue({ data: { id: "message" }, error: null }),
    appendAudit: vi.fn().mockResolvedValue({ data: {}, error: null }),
    advanceTo: vi.fn().mockImplementation(async (_id: string, status: string) => ({ data: { id: "case", status }, error: null })),
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

  it("reuses the existing case for a repeated request id instead of creating a duplicate", async () => {
    const repo = repository({
      cases: [{ id: CASE_ID }],
      facts: { [CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(CASE_ID)
    // Nothing new was written: the retry is a pure read.
    expect(repo.createCase).not.toHaveBeenCalled()
    expect(repo.addFacts).not.toHaveBeenCalled()
    expect(repo.addMessage).not.toHaveBeenCalled()
  })

  it("creates a new case when an existing case carries a different request id", async () => {
    const repo = repository({
      cases: [{ id: "22222222-2222-4222-8222-222222222222" }],
      facts: { "22222222-2222-4222-8222-222222222222": [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_other" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(false)
    expect(repo.createCase).toHaveBeenCalledOnce()
  })

  it("surfaces a lookup error instead of creating a case it cannot deduplicate", async () => {
    const repo = repository()
    repo.listMine.mockResolvedValue({ data: null, error: "CASE_LIST_FAILED" })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.error).toBe("CASE_LIST_FAILED")
    expect(result.data).toBeNull()
    expect(repo.createCase).not.toHaveBeenCalled()
  })

  it("surfaces a fact lookup error instead of risking a duplicate", async () => {
    const repo = repository({ cases: [{ id: CASE_ID }] })
    repo.listFacts.mockResolvedValue({ data: null, error: "FACTS_READ_FAILED" })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.error).toBe("FACTS_READ_FAILED")
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
})
