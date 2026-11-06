import { describe, expect, it } from "vitest"
import { CaseEngineRepository } from "./repository"

const CASE_ROW = {
  id: "case-9",
  owner_id: "user-1",
  title: "Steuererklaerung",
  intent: "application",
  ui_locale: "bg",
  conversation_locale: "bg",
  status: "UPLOADED",
  horizon_status: "waiting_for_user",
  horizon_module: "general",
  service_request_id: "hz_1",
  institution: null,
  deadline: null,
  created_at: "2026-10-01T00:00:00.000Z",
}

/**
 * A fake of the two `cases` call shapes used here: the owner-scoped read for
 * `findCaseByServiceRequestId`, and the insert for `createCase`. `insertError`
 * simulates the idempotency migration not being applied (an undefined-column
 * error) so the degradation path can be asserted.
 */
function fakeCaseClient(options: {
  row?: Record<string, unknown> | null
  insertError?: { message: string; code: string } | null
  fallbackInsertError?: { message: string; code: string } | null
} = {}) {
  const caseInserts: Array<Record<string, unknown>> = []
  const from = (table: string) => {
    if (table !== "cases") {
      // audit_events and any other table: accept the write, echo it back.
      return {
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({ single: () => Promise.resolve({ data: { id: "audit-1", ...payload }, error: null }) }),
        }),
      }
    }
    const readChain: Record<string, unknown> = {}
    readChain.select = () => readChain
    readChain.eq = () => readChain
    readChain.maybeSingle = () => Promise.resolve({ data: options.row ?? null, error: null })
    return {
      ...readChain,
      insert: (payload: Record<string, unknown>) => {
        caseInserts.push(payload)
        const error = caseInserts.length === 1 ? (options.insertError ?? null) : (options.fallbackInsertError ?? null)
        return {
          select: () => ({
            single: () =>
              Promise.resolve(error ? { data: null, error } : { data: { ...CASE_ROW, ...payload }, error: null }),
          }),
        }
      },
    }
  }
  return { from, caseInserts }
}

describe("CaseEngineRepository.findCaseByServiceRequestId", () => {
  it("returns the owner's case bound to the request id", async () => {
    const fake = fakeCaseClient({ row: CASE_ROW })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByServiceRequestId("hz_1")

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe("case-9")
  })

  it("returns data null when no case carries the request id", async () => {
    const fake = fakeCaseClient({ row: null })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByServiceRequestId("hz_missing")

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it("degrades to data null when the idempotency migration is not applied", async () => {
    // A client that reports the column as undefined: the lookup must not throw,
    // so the caller falls back to the fact lookup.
    const repo = new CaseEngineRepository(
      {
        from: () => {
          const chain: Record<string, unknown> = {}
          chain.select = () => chain
          chain.eq = () => chain
          chain.maybeSingle = () =>
            Promise.resolve({ data: null, error: { message: "column cases.service_request_id does not exist", code: "42703" } })
          return chain
        },
      } as never,
      "user-1",
    )

    const result = await repo.findCaseByServiceRequestId("hz_1")

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })
})

describe("CaseEngineRepository.createCase idempotency column", () => {
  it("writes the request id into the insert so the unique index can enforce it", async () => {
    const fake = fakeCaseClient()
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.createCase({
      title: "t",
      module: "general",
      intent: "application",
      uiLocale: "bg",
      conversationLocale: "bg",
      serviceRequestId: "hz_1",
    })

    expect(result.error).toBeNull()
    expect(fake.caseInserts[0].service_request_id).toBe("hz_1")
  })

  it("surfaces the 23505 code so the caller can recover the winner's case", async () => {
    const fake = fakeCaseClient({ insertError: { message: "duplicate key value violates unique constraint", code: "23505" } })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.createCase({
      title: "t",
      module: "general",
      intent: "application",
      uiLocale: "bg",
      conversationLocale: "bg",
      serviceRequestId: "hz_1",
    })

    expect(result.data).toBeNull()
    expect(result.code).toBe("23505")
  })

  it("falls back to a column-less insert when the migration is not applied", async () => {
    const fake = fakeCaseClient({ insertError: { message: "column does not exist", code: "42703" } })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.createCase({
      title: "t",
      module: "general",
      intent: "application",
      uiLocale: "bg",
      conversationLocale: "bg",
      serviceRequestId: "hz_1",
    })

    // Intake keeps working; the second insert omits the absent column.
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe("case-9")
    expect(fake.caseInserts).toHaveLength(2)
    expect("service_request_id" in fake.caseInserts[1]).toBe(false)
  })
})
