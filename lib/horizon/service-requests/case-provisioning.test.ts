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
    messages?: Record<string, Array<{ id: string; role: string; content: string }>>
    audit?: Record<string, Array<{ action: string }>>
    byRequestId?: Record<string, { id: string; status?: string }>
    findError?: string
    columnError?: string
    createError?: { message: string; code: string }
    listFactsError?: string
    listMessagesError?: string
    listAuditError?: string
  } = {},
) {
  const cases = overrides.cases ?? []
  const facts = overrides.facts ?? {}
  const messages = overrides.messages ?? {}
  const audit = overrides.audit ?? {}
  const byRequestId = overrides.byRequestId ?? {}
  const caseById = new Map(cases.map((c) => [c.id, c]))
  return {
    listMine: vi.fn().mockResolvedValue({ data: cases, error: null }),
    listFacts: vi.fn().mockImplementation(async (caseId: string) => ({
      data: overrides.listFactsError ? null : facts[caseId] ?? [],
      error: overrides.listFactsError ?? null,
    })),
    listMessages: vi.fn().mockImplementation(async (caseId: string) => ({
      data: overrides.listMessagesError ? null : messages[caseId] ?? [],
      error: overrides.listMessagesError ?? null,
    })),
    listAudit: vi.fn().mockImplementation(async (caseId: string) => ({
      data: overrides.listAuditError ? null : audit[caseId] ?? [],
      error: overrides.listAuditError ?? null,
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

/**
 * A stateful fake whose default implementations actually store facts, messages
 * and audit entries, so a retry sees what a previous attempt wrote. Tests arm a
 * one-off failure with `mockImplementationOnce`; the default stateful behaviour
 * then runs on the retry. This is what lets the repair tests assert "no duplicate
 * facts/messages on a repeated attempt" rather than just counting calls.
 */
function makePairBarrier() {
  let arrived = 0
  let release: (() => void) | null = null
  const gate = new Promise<void>((resolve) => { release = resolve })
  return async () => {
    arrived += 1
    if (arrived === 2) release?.()
    await gate
  }
}

function statefulRepository(options: { barrierReads?: boolean } = {}) {
  const byRequestId = new Map<string, { id: string; status: string }>()
  const factsByCase = new Map<string, Array<{ key: string; value: string; idempotencyKey?: string }>>()
  const messagesByCase = new Map<string, Array<{ id: string; role: string; content: string; idempotencyKey?: string }>>()
  const auditByCase = new Map<string, Array<{ action: string; idempotencyKey?: string }>>()
  let seq = 0
  let failNextAuditAction: string | null = null
  const factsBarrier = options.barrierReads ? makePairBarrier() : null
  const messagesBarrier = options.barrierReads ? makePairBarrier() : null
  const auditBarrier = options.barrierReads ? makePairBarrier() : null

  const repo = {
    listMine: vi.fn().mockResolvedValue({ data: [], error: null }),
    listFacts: vi.fn().mockImplementation(async (caseId: string) => {
      const snapshot = [...(factsByCase.get(caseId) ?? [])]
      if (factsBarrier) await factsBarrier()
      return { data: snapshot, error: null }
    }),
    listMessages: vi.fn().mockImplementation(async (caseId: string) => {
      const snapshot = [...(messagesByCase.get(caseId) ?? [])]
      if (messagesBarrier) await messagesBarrier()
      return { data: snapshot, error: null }
    }),
    listAudit: vi.fn().mockImplementation(async (caseId: string) => {
      const snapshot = [...(auditByCase.get(caseId) ?? [])]
      if (auditBarrier) await auditBarrier()
      return { data: snapshot, error: null }
    }),
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
      const requestId = input.serviceRequestId ?? null
      const id = `case-${++seq}`
      if (requestId) byRequestId.set(requestId, { id, status: "draft" })
      factsByCase.set(id, [])
      messagesByCase.set(id, [])
      auditByCase.set(id, [])
      return { data: { id, status: "draft" }, error: null, code: null }
    }),
    addFacts: vi.fn().mockImplementation(async (caseId: string, facts: Array<{ key: string; value: string; idempotencyKey?: string }>) => {
      const current = factsByCase.get(caseId) ?? []
      const next = [...current]
      for (const fact of facts) {
        if (fact.idempotencyKey && next.some((item) => item.idempotencyKey === fact.idempotencyKey)) continue
        next.push(fact)
      }
      factsByCase.set(caseId, next)
      return { data: [], error: null }
    }),
    addMessage: vi.fn().mockImplementation(async (caseId: string, message: { role: string; content: string; idempotencyKey?: string }) => {
      const current = messagesByCase.get(caseId) ?? []
      const existing = message.idempotencyKey && current.find((item) => item.idempotencyKey === message.idempotencyKey)
      if (existing) return { data: existing, error: null }
      const created = { id: `m-${++seq}`, ...message }
      messagesByCase.set(caseId, [...current, created])
      return { data: created, error: null }
    }),
    appendAudit: vi.fn().mockImplementation(async (caseId: string, action: string, _metadata?: unknown, options?: { idempotencyKey?: string }) => {
      if (failNextAuditAction === action) {
        failNextAuditAction = null
        return { data: null, error: "AUDIT_WRITE_FAILED" }
      }
      const current = auditByCase.get(caseId) ?? []
      const existing = options?.idempotencyKey && current.find((item) => item.idempotencyKey === options.idempotencyKey)
      if (existing) return { data: existing, error: null }
      const created = { action, idempotencyKey: options?.idempotencyKey }
      auditByCase.set(caseId, [...current, created])
      return { data: created, error: null }
    }),
    advanceTo: vi.fn().mockImplementation(async (id: string, status: string) => {
      if (byRequestId.has("hz_request")) byRequestId.set("hz_request", { id, status })
      return { data: { id, status }, error: null }
    }),
  }

  return {
    repo,
    byRequestId,
    factsByCase,
    messagesByCase,
    auditByCase,
    failAuditOnce: (action: string) => { failNextAuditAction = action },
  }
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
    ]), expect.objectContaining({ auditIdempotencyKey: expect.stringContaining("audit:facts_added") }))
    expect(repo.addMessage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ role: "assistant", idempotencyKey: expect.stringContaining(":message:opening") }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "facts_added", expect.any(Object), expect.objectContaining({ idempotencyKey: expect.stringContaining(":audit:facts_added") }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "alpha_team_run_created", expect.objectContaining({ serviceKind: "steuererklaerung" }), expect.objectContaining({ idempotencyKey: expect.stringContaining(":audit:alpha_team_run_created") }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "quality_safety_blocked", expect.objectContaining({ externalActions: "blocked_until_human_approval" }), expect.objectContaining({ idempotencyKey: expect.stringContaining(":audit:quality_safety_blocked") }))
    expect(repo.advanceTo).toHaveBeenNthCalledWith(1, expect.any(String), "collecting_data")
    expect(repo.advanceTo).toHaveBeenNthCalledWith(2, expect.any(String), "waiting_for_user")
  })

  it("reuses the existing case for a repeated request id without scanning the case list", async () => {
    const repo = repository({
      cases: [{ id: CASE_ID }],
      // A fully provisioned case: all facts, the opening message and both audit
      // events are present, so the retry has nothing to repair.
      facts: {
        [CASE_ID]: [
          { key: "service_request_type", value: "steuererklaerung" },
          { key: SERVICE_REQUEST_ID_FACT, value: "hz_request" },
          { key: "alpha_team_lead", value: "finance-tax" },
          { key: "intake_serviceDetails", value: "Steuerjahr 2025" },
        ],
      },
      messages: { [CASE_ID]: [{ id: "m1", role: "assistant", content: "Създадох HORIZON case за steuererklaerung." }] },
      audit: { [CASE_ID]: [{ action: "facts_added" }, { action: "alpha_team_run_created" }, { action: "quality_safety_blocked" }] },
    })

    const result = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(result.reused).toBe(true)
    expect(result.data?.id).toBe(CASE_ID)
    // The bounded window scan is gone: the lookup is a targeted fact query.
    expect(repo.listMine).not.toHaveBeenCalled()
    expect(repo.findCaseByFact).toHaveBeenCalledWith(SERVICE_REQUEST_ID_FACT, "hz_request")
    // A complete case needs no repair: no new case, facts or message, and no
    // duplicate audit. Only the forward-only advance re-asserts the target.
    expect(repo.createCase).not.toHaveBeenCalled()
    expect(repo.addFacts).not.toHaveBeenCalled()
    expect(repo.addMessage).not.toHaveBeenCalled()
    expect(repo.appendAudit).not.toHaveBeenCalled()
    // Only the forward-only advance runs; it re-asserts the target (collecting_data
    // and waiting_for_user are no-ops once the case is already at waiting_for_user).
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
    // other with 23505. Both callers must resolve to the same case, and the repair
    // reads must not let the loser duplicate the artifacts.
    const byRequestId = new Map<string, { id: string; status: string }>()
    const factsByCase = new Map<string, Fact[]>()
    const messagesByCase = new Map<string, Array<{ id: string; role: string; content: string }>>()
    const auditByCase = new Map<string, Array<{ action: string }>>()
    let seq = 0
    let createCalls = 0
    let advanceCalls = 0

    const repo = {
      listMine: vi.fn().mockResolvedValue({ data: [], error: null }),
      listFacts: vi.fn().mockImplementation(async (caseId: string) => ({
        data: factsByCase.get(caseId) ?? [],
        error: null,
      })),
      listMessages: vi.fn().mockImplementation(async (caseId: string) => ({
        data: messagesByCase.get(caseId) ?? [],
        error: null,
      })),
      listAudit: vi.fn().mockImplementation(async (caseId: string) => ({
        data: auditByCase.get(caseId) ?? [],
        error: null,
      })),
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
        messagesByCase.set(id, [])
        auditByCase.set(id, [])
        return { data: { id, status: "draft" }, error: null, code: null }
      }),
      addFacts: vi.fn().mockImplementation(async (caseId: string, facts: Fact[]) => {
        factsByCase.set(caseId, [...(factsByCase.get(caseId) ?? []), ...facts])
        return { data: [], error: null }
      }),
      addMessage: vi.fn().mockImplementation(async (caseId: string, message: { role: string; content: string }) => {
        messagesByCase.set(caseId, [...(messagesByCase.get(caseId) ?? []), { id: "m", ...message }])
        return { data: { id: "message" }, error: null }
      }),
      appendAudit: vi.fn().mockImplementation(async (caseId: string, action: string) => {
        auditByCase.set(caseId, [...(auditByCase.get(caseId) ?? []), { action }])
        return { data: {}, error: null }
      }),
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
    // Exactly one case row exists. (Artifact de-duplication is guaranteed for
    // sequential retries; a truly concurrent repair is best-effort — see the
    // limitation noted on the repair suite below.)
    expect(factsByCase.size).toBe(1)
    expect(advanceCalls).toBeGreaterThanOrEqual(1)
  })
})

describe("Horizon service case provisioning repairs an incomplete case on retry", () => {
  const keysOf = (facts: Array<{ key: string }> | undefined) => (facts ?? []).map((fact) => fact.key).sort()
  const actionsOf = (audit: Array<{ action: string }> | undefined) => (audit ?? []).map((event) => event.action).sort()

  it("repairs a case left incomplete after the row was created (facts write failed)", async () => {
    const { repo, byRequestId, factsByCase, messagesByCase, auditByCase } = statefulRepository()
    // First attempt dies while writing the facts, before anything is stored.
    repo.addFacts.mockImplementationOnce(async () => ({ data: null, error: "FACTS_WRITE_FAILED" }))

    const first = await provisionHorizonServiceCase(repo as never, INPUT)
    expect(first.error).toBe("FACTS_WRITE_FAILED")
    const caseId = [...byRequestId.values()][0].id

    // Retry: same request id, same case, and the missing artifacts are written.
    const retry = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(retry.error).toBeNull()
    expect(retry.reused).toBe(true)
    expect(retry.data?.id).toBe(caseId)
    expect(byRequestId.size).toBe(1) // still exactly one case
    expect(keysOf(factsByCase.get(caseId))).toEqual([
      "alpha_team_lead",
      "intake_serviceDetails",
      SERVICE_REQUEST_ID_FACT,
      "service_request_type",
    ].sort())
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    expect(actionsOf(auditByCase.get(caseId))).toEqual(["alpha_team_run_created", "facts_added", "quality_safety_blocked"])
  })

  it("repairs the opening message after a failure during the message write", async () => {
    const { repo, byRequestId, factsByCase, messagesByCase } = statefulRepository()
    repo.addMessage.mockImplementationOnce(async () => ({ data: null, error: "MESSAGE_WRITE_FAILED" }))

    const first = await provisionHorizonServiceCase(repo as never, INPUT)
    expect(first.error).toBe("MESSAGE_WRITE_FAILED")
    const caseId = [...byRequestId.values()][0].id
    // The facts were stored before the message failed; they must not be duplicated.
    expect(factsByCase.get(caseId)).toHaveLength(4)
    expect(messagesByCase.get(caseId)).toHaveLength(0)

    const retry = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(retry.error).toBeNull()
    expect(retry.reused).toBe(true)
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    // The facts are topped up, not repeated: still exactly four keys, once each.
    expect(factsByCase.get(caseId)).toHaveLength(4)
  })

  it("does not duplicate facts, messages or audit entries on a retry after success", async () => {
    const { repo, byRequestId, factsByCase, messagesByCase, auditByCase } = statefulRepository()

    const first = await provisionHorizonServiceCase(repo as never, INPUT)
    expect(first.error).toBeNull()
    expect(first.reused).toBe(false)
    const caseId = [...byRequestId.values()][0].id
    const factsAfterFirst = factsByCase.get(caseId)?.length
    const messagesAfterFirst = messagesByCase.get(caseId)?.length
    const auditAfterFirst = auditByCase.get(caseId)?.length

    const retry = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(retry.error).toBeNull()
    expect(retry.reused).toBe(true)
    expect(byRequestId.size).toBe(1)
    expect(factsByCase.get(caseId)?.length).toBe(factsAfterFirst)
    expect(messagesByCase.get(caseId)?.length).toBe(messagesAfterFirst)
    expect(auditByCase.get(caseId)?.length).toBe(auditAfterFirst)
  })

  it("preserves a user-edited answer fact instead of overwriting it on retry", async () => {
    const { repo, byRequestId, factsByCase } = statefulRepository()
    // A previous attempt created the case and the user then edited an answer fact.
    const caseId = "case-edited"
    byRequestId.set(INPUT.requestId, { id: caseId, status: "draft" })
    factsByCase.set(caseId, [
      { key: SERVICE_REQUEST_ID_FACT, value: INPUT.requestId },
      { key: "intake_serviceDetails", value: "edited by the user" },
    ])

    const retry = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(retry.error).toBeNull()
    expect(retry.reused).toBe(true)
    // Only the genuinely missing facts are added; the edited one is untouched.
    const addedKeys = (repo.addFacts.mock.calls[0]?.[1] as Array<{ key: string }>).map((fact) => fact.key)
    expect(addedKeys).not.toContain("intake_serviceDetails")
    expect(addedKeys).toContain("service_request_type")
    expect(addedKeys).toContain("alpha_team_lead")
    expect(factsByCase.get(caseId)?.find((fact) => fact.key === "intake_serviceDetails")?.value).toBe(
      "edited by the user",
    )
  })

  it("repairs an incomplete case exactly once per artifact on a sequential retry", async () => {
    const { repo, byRequestId, factsByCase, messagesByCase, auditByCase } = statefulRepository()
    // The case exists but is empty: the first attempt died right after creating it.
    const caseId = "case-incomplete"
    byRequestId.set(INPUT.requestId, { id: caseId, status: "draft" })
    factsByCase.set(caseId, [])
    messagesByCase.set(caseId, [])
    auditByCase.set(caseId, [])

    const first = await provisionHorizonServiceCase(repo as never, INPUT)
    const second = await provisionHorizonServiceCase(repo as never, INPUT)

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(byRequestId.size).toBe(1)
    // Sequential retries never duplicate an artifact: each fact key, the message
    // and each audit action appear exactly once.
    const keys = keysOf(factsByCase.get(caseId))
    expect(keys).toEqual(["alpha_team_lead", "intake_serviceDetails", SERVICE_REQUEST_ID_FACT, "service_request_type"].sort())
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    expect(actionsOf(auditByCase.get(caseId))).toEqual(["alpha_team_run_created", "facts_added", "quality_safety_blocked"])
  })

  it("fails closed on a required audit write and repairs it on retry without duplicating artifacts", async () => {
    const { repo, byRequestId, factsByCase, messagesByCase, auditByCase, failAuditOnce } = statefulRepository()
    failAuditOnce("alpha_team_run_created")

    const first = await provisionHorizonServiceCase(repo as never, INPUT)
    expect(first.error).toBe("AUDIT_WRITE_FAILED")
    const caseId = [...byRequestId.values()][0].id
    expect(factsByCase.get(caseId)).toHaveLength(4)
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    expect(actionsOf(auditByCase.get(caseId))).toEqual(["facts_added"])

    const retry = await provisionHorizonServiceCase(repo as never, INPUT)
    expect(retry.error).toBeNull()
    expect(retry.reused).toBe(true)
    expect(factsByCase.get(caseId)).toHaveLength(4)
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    expect(actionsOf(auditByCase.get(caseId))).toEqual(["alpha_team_run_created", "facts_added", "quality_safety_blocked"].sort())
  })

  it("keeps exactly one case and fully provisions it when two retries run concurrently", async () => {
    // Both calls are forced to pass the same empty read snapshots before either
    // can write. The fake applies the same per-artifact uniqueness contract as
    // the database migration, so this proves the repair path never double-writes
    // a provisioning-owned artifact under an interleaving.
    const { repo, byRequestId, factsByCase, messagesByCase, auditByCase } = statefulRepository({ barrierReads: true })
    const caseId = "case-incomplete"
    byRequestId.set(INPUT.requestId, { id: caseId, status: "draft" })
    factsByCase.set(caseId, [])
    messagesByCase.set(caseId, [])

    const [a, b] = await Promise.all([
      provisionHorizonServiceCase(repo as never, INPUT),
      provisionHorizonServiceCase(repo as never, INPUT),
    ])

    expect(a.error).toBeNull()
    expect(b.error).toBeNull()
    expect(byRequestId.size).toBe(1)
    const facts = factsByCase.get(caseId) ?? []
    expect(keysOf(facts)).toEqual([
      "alpha_team_lead",
      "intake_serviceDetails",
      SERVICE_REQUEST_ID_FACT,
      "service_request_type",
    ].sort())
    expect(new Set(facts.map((fact) => fact.idempotencyKey)).size).toBe(4)
    expect(messagesByCase.get(caseId)).toHaveLength(1)
    expect(actionsOf(auditByCase.get(caseId))).toEqual(["alpha_team_run_created", "facts_added", "quality_safety_blocked"].sort())
    expect(new Set((auditByCase.get(caseId) ?? []).map((event) => event.idempotencyKey)).size).toBe(3)
  })
})
