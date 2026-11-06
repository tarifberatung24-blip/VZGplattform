import { describe, expect, it } from "vitest"
import { CaseEngineRepository } from "./repository"

/**
 * `findCaseByFact` is the durable idempotency lookup: it must resolve the case
 * that carries a fact `key = value` through a targeted, owner-scoped query, and
 * must never fall back to scanning the case list. The fake below records the
 * exact chain so the test can prove the query shape (owner scope + limit 1) and
 * that the returned case is re-read through the owner-scoped `cases` read.
 */
function fakeClient(
  options: {
    factRow?: { case_id: string } | null
    factError?: { message: string } | null
    caseRow?: Record<string, unknown> | null
  } = {},
) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const record = (table: string, method: string, args: unknown[]) => calls.push({ table, method, args })

  const factChain = () => {
    const chain: Record<string, unknown> = {}
    const passthrough = (method: string) => (...args: unknown[]) => {
      record("extracted_facts", method, args)
      return chain
    }
    chain.select = passthrough("select")
    chain.eq = passthrough("eq")
    chain.order = passthrough("order")
    chain.limit = passthrough("limit")
    chain.maybeSingle = () =>
      Promise.resolve(
        options.factError
          ? { data: null, error: options.factError }
          : { data: options.factRow ?? null, error: null },
      )
    return chain
  }

  const caseChain = () => {
    const chain: Record<string, unknown> = {}
    const passthrough = (method: string) => (...args: unknown[]) => {
      record("cases", method, args)
      return chain
    }
    chain.select = passthrough("select")
    chain.eq = passthrough("eq")
    chain.maybeSingle = () =>
      Promise.resolve({ data: options.caseRow ?? null, error: null })
    return chain
  }

  return {
    from: (table: string) => (table === "extracted_facts" ? factChain() : caseChain()),
    calls,
  }
}

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
  institution: null,
  deadline: null,
  created_at: "2026-10-01T00:00:00.000Z",
}

describe("CaseEngineRepository.findCaseByFact", () => {
  it("finds the owner's case through an owner-scoped fact query limited to one row", async () => {
    const fake = fakeClient({ factRow: { case_id: "case-9" }, caseRow: CASE_ROW })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByFact("service_request_id", "hz_request")

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe("case-9")
    // The fact query is scoped to the owner, the key and the value, ordered and
    // limited to one row.
    const factCalls = fake.calls.filter((c) => c.table === "extracted_facts")
    expect(factCalls.find((c) => c.method === "eq")?.args).toEqual(["owner_id", "user-1"])
    expect(factCalls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["owner_id", "user-1"],
      ["key", "service_request_id"],
      ["value", "hz_request"],
    ])
    expect(factCalls.find((c) => c.method === "limit")?.args).toEqual([1])
    expect(factCalls.find((c) => c.method === "order")?.args).toEqual(["created_at", { ascending: false }])
    // The case is re-read through the owner-scoped cases read.
    expect(fake.calls.some((c) => c.table === "cases")).toBe(true)
    // It never enumerates the case list.
    expect(fake.calls.some((c) => c.method === "limit" && c.args[0] === 50)).toBe(false)
  })

  it("returns data null (not an error) when no fact matches", async () => {
    const fake = fakeClient({ factRow: null })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByFact("service_request_id", "hz_missing")

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
    // No case read happens when there is nothing to resolve.
    expect(fake.calls.some((c) => c.table === "cases")).toBe(false)
  })

  it("surfaces a query error so the caller can fail closed instead of duplicating", async () => {
    const fake = fakeClient({ factError: { message: "relation does not exist" } })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByFact("service_request_id", "hz_request")

    expect(result.data).toBeNull()
    expect(result.error).toBe("relation does not exist")
  })

  it("fails when the fact points at a case the owner cannot read", async () => {
    const fake = fakeClient({ factRow: { case_id: "case-9" }, caseRow: null })
    const repo = new CaseEngineRepository(fake as never, "user-1")

    const result = await repo.findCaseByFact("service_request_id", "hz_request")

    expect(result.data).toBeNull()
    expect(result.error).toBe("Case not found")
  })
})
