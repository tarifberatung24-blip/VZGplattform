import { describe, expect, it, vi } from "vitest"
import { provisionHorizonServiceCase } from "./case-provisioning"
import { SERVICE_REQUEST_ID_FACT } from "./registry"

const CASE_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_CASE_ID = "22222222-2222-4222-8222-222222222222"

type Fact = { key: string; value: string }

/**
 * Fake repository keyed by the fact store and the request-id column, so the
 * lookups behave like the real indexed queries. `listMine` is intentionally
 * absent from the provisioning path now — the test proves the window scan is gone.
 */
function repository(
  overrides: {
    cases?: Array<{ id: string }>
    facts?: Record<string, Fact[]>
    byRequestId?: Record<string, { id: string; status?: string }>
    findError?: string
    columnError?: string
    createError?: { message: string; code: string }
    listFactsError?: string
  } = {},
) {
  const cases = overrides.cases ?? []
  const facts = overrides.facts ?? {}
  const byRequestId = overrides.byRequestId ?? {}
  const caseById = new Map(cases.map((c) => [c.id, c]))
  return {
    listMine: vi.fn().mockResolvedValue({ data: cases, error: null }),
    listFacts: vi.fn().mockImplementation(async (caseId: string) => ({
      data: overrides.listFactsError ? null : facts[caseId] ?? [],
      error: overrides.listFactsError ?? null,
    })),
    // The indexed column lookup. Defaults to "no case", so tests that only set up
    // the legacy fact still exercise the fact fallback.
    findCaseByServiceRequestId: vi.fn().mockImplementation(async (requestId: string) => {
      if (overrides.columnError) return { data: null, error: overrides.columnError }
      return { data: byRequestId[requestId] ?? null, error: null }
    }),
    findCaseByFact: vi.fn().mockImplementation(async (key: string, value: string) => {
      if (overrides.findError) return { data: null, error: overrides.findError }
      for (const [caseId, list] of Object.entries(facts)) {
        if (list.some((fact) => fact.key === key && fact.value === value) && caseById.has(caseId)) {
          return { data: caseById.get(caseId), error: null }
        }
      }
      return { data: null, error: null }
    }),
    createCase: vi.fn().mockImplementation(async () => {
      if (overrides.createError) return { data: null, error: overrides.createError.message, code: overrides.createError.code }
      return { data: { id: CASE_ID, status: "draft" }, error: null, code: null }
    }),
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
    // The request id is bound in the create insert, so the unique index makes the
    // insert the atomic dedup step.
    expect(repo.createCase).toHaveBeenCalledWith(
      expect.objectContaining({ module: "general", intent: "application", serviceRequestId: "hz_request" }),
    )
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

  it("resolves an existing case through the indexed column before the fact fallback", async () => {
    const repo = repository({
      byRequestId: { hz_request: { id: CASE_ID, status: "waiting_for_user" } },
      facts: { [OTHER_CASE_ID]: [{ key: SERVICE_REQUEST_ID_FACT, value: "hz_request" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(CASE_ID)
    // The column lookup answered first, so the fact fallback is not consulted.
    expect(repo.findCaseByServiceRequestId).toHaveBeenCalledWith("hz_request")
    expect(repo.findCaseByFact).not.toHaveBeenCalled()
  })

  it("recovers the winner's case on a 23505 instead of failing the request", async () => {
    // The read guard sees no case, the insert loses the race, and the recovery
    // lookup finds the case the other request created.
    const repo = repository({
      createError: { message: "duplicate key value violates unique constraint", code: "23505" },
    })
    repo.findCaseByServiceRequestId
      .mockResolvedValueOnce({ data: null, error: null }) // read guard: nothing yet
      .mockResolvedValueOnce({ data: { id: OTHER_CASE_ID, status: "waiting_for_user" }, error: null }) // recovery

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(OTHER_CASE_ID)
    // Exactly one insert was attempted; the recovery did not create a second case.
    expect(repo.createCase).toHaveBeenCalledOnce()
  })

  it("surfaces the original create error when a 23505 finds no recoverable case", async () => {
    const repo = repository({
      createError: { message: "duplicate key value violates unique constraint", code: "23505" },
    })
    // Recovery lookup stays empty: nothing readable to reuse.
    repo.findCaseByServiceRequestId.mockResolvedValue({ data: null, error: null })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.data).toBeNull()
    expect(result.error).toBe("duplicate key value violates unique constraint")
    expect(result.reused).toBe(false)
  })

  it("creates exactly one case when two concurrent requests share a request id", async () => {
    // A stateful fake of the real race: the partial unique index on
    // (owner_id, service_request_id) admits exactly one insert and rejects the
    // other with 23505. Both callers must resolve to the same case.
    const byRequestId = new Map<string, { id: string; status: string }>()
    const factsByCase = new Map<string, Fact[]>()
    let seq = 0
    let createCalls = 0
    let advanceCalls = 0

    const repo = {
      listMine: vi.fn().mockResolvedValue({ data: [], error: null }),
      findCaseByServiceRequestId: vi.fn().mockImplementation(async (requestId: string) => ({
        data: byRequestId.get(requestId) ?? null,
        error: null,
      })),
      findCaseByFact: vi.fn().mockImplementation(async (key: string, value: string) => {
        for (const [caseId, list] of factsByCase) {
          if (list.some((fact) => fact.key === key && fact.value === value)) {
            return { data: { id: caseId, status: "waiting_for_user" }, error: null }
          }
        }
        return { data: null, error: null }
      }),
      createCase: vi.fn().mockImplementation(async (input: { serviceRequestId?: string | null }) => {
        createCalls += 1
        // Yield so both callers reach the insert before either commits, which is
        // the interleaving the unique index exists to resolve.
        await Promise.resolve()
        const requestId = input.serviceRequestId ?? null
        if (requestId && byRequestId.has(requestId)) {
          return { data: null, error: "duplicate key value violates unique constraint", code: "23505" }
        }
        const id = `case-${++seq}`
        if (requestId) byRequestId.set(requestId, { id, status: "draft" })
        factsByCase.set(id, [])
        return { data: { id, status: "draft" }, error: null, code: null }
      }),
      addFacts: vi.fn().mockImplementation(async (caseId: string, facts: Fact[]) => {
        factsByCase.set(caseId, [...(factsByCase.get(caseId) ?? []), ...facts])
        return { data: [], error: null }
      }),
      addMessage: vi.fn().mockResolvedValue({ data: { id: "message" }, error: null }),
      appendAudit: vi.fn().mockResolvedValue({ data: {}, error: null }),
      advanceTo: vi.fn().mockImplementation(async (id: string, status: string) => {
        advanceCalls += 1
        if (byRequestId.has("hz_race")) byRequestId.set("hz_race", { id, status })
        return { data: { id, status }, error: null }
      }),
    }

    const raceInput = { ...INPUT, requestId: "hz_race" }
    const [a, b] = await Promise.all([
      provisionHorizonServiceCase(repo as never, raceInput),
      provisionHorizonServiceCase(repo as never, raceInput),
    ])

    // Both callers succeed and resolve to the same single case.
    expect(a.error).toBeNull()
    expect(b.error).toBeNull()
    expect(a.data?.id).toBeTruthy()
    expect(a.data?.id).toBe(b.data?.id)
    // Exactly one case row was created for the request id.
    expect(byRequestId.size).toBe(1)
    expect(createCalls).toBe(2) // both attempted; the index rejected one
    // Exactly one of the two reuses the winner's case.
    expect([a.reused, b.reused].filter(Boolean)).toHaveLength(1)
    expect(advanceCalls).toBeGreaterThanOrEqual(1)
  })
})
