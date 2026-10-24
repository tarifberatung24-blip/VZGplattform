import { describe, expect, it } from "vitest"
import { CaseEngineRepository } from "./repository"

/**
 * A stateful fake of the three call shapes `advanceTo` uses: an owner-scoped
 * `cases` read, a `cases` update, and an `audit_events` insert. The status is
 * kept in one mutable row so the test can prove the sequence of writes rather
 * than only the shape of a single call.
 */
function fakeCaseClient(status: string, horizonStatus: string | null = null) {
  const row: Record<string, unknown> = {
    id: "case-1",
    owner_id: "user-1",
    title: "Test",
    intent: "explanation",
    ui_locale: "bg",
    conversation_locale: "bg",
    status,
    horizon_status: horizonStatus,
    horizon_module: "general",
    institution: null,
    deadline: null,
    created_at: "2026-10-01T00:00:00.000Z",
  }
  const auditInserts: Array<Record<string, unknown>> = []
  const caseUpdates: Array<Record<string, unknown>> = []

  const from = (table: string) => {
    if (table === "audit_events") {
      return {
        insert: (payload: Record<string, unknown>) => {
          auditInserts.push(payload)
          const single = () =>
            Promise.resolve({
              data: { id: `audit-${auditInserts.length}`, created_at: "2026-10-01T00:00:00.000Z", ...payload },
              error: null,
            })
          return { select: () => ({ single }) }
        },
      }
    }

    // `cases`: read is `select("*").eq("id",…).eq("owner_id",…).maybeSingle()`;
    // write is `update(patch).eq("id",…).eq("owner_id",…).select("*").maybeSingle()`.
    const eqChain = (terminal: () => Promise<{ data: unknown; error: null }>) => {
      const chain: Record<string, unknown> = {}
      chain.eq = () => chain
      chain.maybeSingle = terminal
      chain.select = () => eqChain(terminal)
      return chain
    }
    return {
      select: () => eqChain(() => Promise.resolve({ data: { ...row }, error: null })),
      update: (patch: Record<string, unknown>) => {
        caseUpdates.push(patch)
        Object.assign(row, patch)
        return eqChain(() => Promise.resolve({ data: { ...row }, error: null }))
      },
    }
  }

  return {
    client: { from } as never,
    row,
    auditInserts,
    caseUpdates,
  }
}

describe("advanceTo", () => {
  it("moves a fresh draft case to collecting_data on intake", async () => {
    const fake = fakeCaseClient("NEW", "draft")
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "collecting_data")

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe("collecting_data")
    expect(fake.caseUpdates.at(-1)).toEqual({
      horizon_status: "collecting_data",
      status: "UPLOADED",
    })
    // The move is audited, so the history explains how the status changed.
    expect(fake.auditInserts.some((a) => a.action === "case_status_changed")).toBe(true)
  })

  it("walks the full path to action_ready and passes through approve", async () => {
    const fake = fakeCaseClient("NEW", "draft")
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "action_ready")

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe("action_ready")
    const actions = fake.auditInserts
      .filter((a) => a.action === "case_status_changed")
      .map((a) => (a.metadata as { action: string }).action)
    expect(actions).toEqual(["start_collecting", "mark_draft_ready", "approve", "mark_action_ready"])
  })

  it("does not move a case that is already past the target", async () => {
    const fake = fakeCaseClient("EXPORTED", "action_ready")
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "draft_ready")

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe("action_ready")
    expect(fake.caseUpdates).toHaveLength(0)
    expect(fake.auditInserts).toHaveLength(0)
  })

  it("is a no-op when the case is already at the target", async () => {
    const fake = fakeCaseClient("UPLOADED", "collecting_data")
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "collecting_data")

    expect(result.error).toBeNull()
    expect(fake.caseUpdates).toHaveLength(0)
  })

  it("never moves a cancelled case forward", async () => {
    const fake = fakeCaseClient("CLOSED", "cancelled")
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "action_ready")

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe("cancelled")
    expect(fake.caseUpdates).toHaveLength(0)
  })

  it("maps a legacy row with no horizon_status before advancing", async () => {
    const fake = fakeCaseClient("NEW", null)
    const repo = new CaseEngineRepository(fake.client, "user-1")

    const result = await repo.advanceTo("case-1", "collecting_data")

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe("collecting_data")
  })
})
