import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { AgentRunService } from "./service"
import { AgentRunRepository } from "./repository"
import { createFakeDb, type FakeDb } from "./testing/fake-supabase"
import type { CaseEngineRepository } from "../case/repository"
import type { CaseContext } from "../ai/context"

/**
 * Service-layer behaviour: ownership validation before a run exists, and the
 * approval boundary.
 *
 * The case engine is the injected dependency here. Its own owner-scoped behaviour
 * is covered by its own tests, so it is stubbed to the exact shape the service
 * consumes (`loadCaseContext`); the property under test is the service's *ordering*
 * — that a foreign or missing case/document is refused before any run row is
 * written, and that a document is only accepted when it belongs to the validated
 * case.
 */

const OWNER_A = "a0000000-0000-4000-8000-00000000000a"
const CASE_A = "a0000000-0000-4000-8000-0000000000c1"
const DOC_A = "a0000000-0000-4000-8000-0000000000d1"
const DOC_FOREIGN = "b0000000-0000-4000-8000-0000000000d9"

const caseContext = (documentIds: string[]): CaseContext =>
  ({
    caseId: CASE_A,
    documentIds,
    conversationLocale: "bg",
  }) as unknown as CaseContext

function makeCaseRepository(options: {
  owned?: boolean
  documentIds?: string[]
  error?: string
} = {}): CaseEngineRepository {
  const owned = options.owned ?? true
  return {
    loadCaseContext: async () =>
      owned
        ? { data: caseContext(options.documentIds ?? [DOC_A]), error: null }
        : { data: null, error: options.error ?? "Case not found" },
  } as unknown as CaseEngineRepository
}

function makeService(
  db: FakeDb,
  caseRepository: CaseEngineRepository,
  ownerId = OWNER_A,
): AgentRunService {
  return new AgentRunService(new AgentRunRepository(db.client, ownerId), caseRepository, ownerId)
}

describe("agent runs service: case ownership validation", () => {
  let db: FakeDb
  beforeEach(() => {
    db = createFakeDb({ ownerId: OWNER_A })
  })

  it("creates a run for a case the caller owns", async () => {
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })
    expect(created.error).toBeNull()
    expect(created.data?.run.caseId).toBe(CASE_A)
    expect(db.tables.agent_runs).toHaveLength(1)
  })

  it("refuses a case the caller does not own, and writes nothing", async () => {
    const service = makeService(db, makeCaseRepository({ owned: false }))
    const created = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })
    expect(created.code).toBe("CASE_NOT_FOUND")
    // Ownership is proven before the insert, so no orphan run is left behind.
    expect(db.tables.agent_runs).toHaveLength(0)
  })

  it("refuses a document that does not belong to the validated case", async () => {
    const service = makeService(db, makeCaseRepository({ documentIds: [DOC_A] }))
    const created = await service.createRun({
      objective: "подготви отговор",
      caseId: CASE_A,
      documentIds: [DOC_A, DOC_FOREIGN],
    })
    expect(created.code).toBe("DOCUMENT_NOT_FOUND")
    expect(db.tables.agent_runs).toHaveLength(0)
  })

  it("refuses documents submitted without a case, since there is no context to validate against", async () => {
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "подготви отговор", documentIds: [DOC_A] })
    expect(created.code).toBe("CASE_NOT_FOUND")
    expect(db.tables.agent_runs).toHaveLength(0)
  })

  it("rejects an empty objective without touching the database", async () => {
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "   " })
    expect(created.code).toBe("INVALID_RUN_REQUEST")
    expect(db.tables.agent_runs).toHaveLength(0)
  })
})

describe("agent runs service: approval boundary", () => {
  it("starts a run in awaiting_approval and never executes it directly", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })

    // Every Conductor plan requires approval, so a new run must wait rather than
    // be executed by the create path.
    expect(created.data?.run.status).toBe("awaiting_approval")
  })
})

describe("agent runs service: idempotency", () => {
  it("collapses a repeated request onto the same run", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    const first = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })
    const second = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })

    expect(first.data?.duplicate).toBe(false)
    expect(second.data?.duplicate).toBe(true)
    expect(second.data?.run.id).toBe(first.data?.run.id)
    expect(db.tables.agent_runs).toHaveLength(1)
  })

  it("creates distinct runs for distinct objectives", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    await service.createRun({ objective: "подготви отговор", caseId: CASE_A })
    await service.createRun({ objective: "провери срока", caseId: CASE_A })
    expect(db.tables.agent_runs).toHaveLength(2)
  })

  it("honours a caller-supplied idempotency key", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    await service.createRun({ objective: "one", caseId: CASE_A, idempotencyKey: "explicit" })
    const again = await service.createRun({ objective: "two", caseId: CASE_A, idempotencyKey: "explicit" })
    expect(again.data?.duplicate).toBe(true)
    expect(db.tables.agent_runs).toHaveLength(1)
  })
})

describe("agent runs service: run history", () => {
  it("returns the run, its steps and its events from persisted rows", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })
    const runId = created.data!.run.id
    await service.runs.recordStep({
      runId,
      stepKey: "finance-tax:draft_content",
      agentId: "finance-tax",
      status: "completed",
    })
    await service.recordEvent({ eventType: "CASE_UPDATED", runId, subjectId: CASE_A })

    const history = await service.getRunHistory(runId)
    expect(history.data?.run.id).toBe(runId)
    expect(history.data?.steps).toHaveLength(1)
    expect(history.data?.events).toHaveLength(1)
  })

  it("reports a foreign run as not found", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    const created = await service.createRun({ objective: "подготви отговор", caseId: CASE_A })

    db.session.ownerId = "b0000000-0000-4000-8000-00000000000b"
    const foreign = makeService(db, makeCaseRepository(), "b0000000-0000-4000-8000-00000000000b")
    const history = await foreign.getRunHistory(created.data!.run.id)
    expect(history.data).toBeNull()
  })
})

describe("agent runs service: event recording", () => {
  it("deduplicates a re-delivered event", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    const first = await service.recordEvent({ eventType: "DOCUMENT_READY", subjectId: DOC_A })
    const second = await service.recordEvent({ eventType: "DOCUMENT_READY", subjectId: DOC_A })
    expect(first.data?.duplicate).toBe(false)
    expect(second.data?.duplicate).toBe(true)
    expect(db.tables.agent_run_events).toHaveLength(1)
  })

  it("treats a new subject as new work", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const service = makeService(db, makeCaseRepository())
    await service.recordEvent({ eventType: "DOCUMENT_READY", subjectId: DOC_A })
    await service.recordEvent({ eventType: "DOCUMENT_READY", subjectId: DOC_FOREIGN })
    expect(db.tables.agent_run_events).toHaveLength(2)
  })
})
