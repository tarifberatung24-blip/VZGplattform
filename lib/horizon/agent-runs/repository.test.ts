import { beforeEach, describe, expect, it, vi } from "vitest"

// `dispatcher.ts` is a server-only module. The guard exists to keep it out of a
// client bundle, which is not a concern in this test process, so it is stubbed the
// same way the existing server-module tests stub it.
vi.mock("server-only", () => ({}))

import { AgentRunRepository } from "./repository"
import { createDispatcher } from "./dispatcher"
import { deriveEventIdempotencyKey, deriveRunIdempotencyKey } from "./idempotency"
import { createFakeDb, type FakeDb } from "./testing/fake-supabase"
import type { StepRunner } from "./executor"
import type { CaseEngineRepository } from "../case/repository"

/**
 * Repository and dispatcher behaviour, exercised against the real modules with a
 * faithful in-memory PostgREST/SQL stand-in (`testing/fake-supabase.ts`).
 *
 * Scope, stated honestly: these tests prove the engine's *own* logic — owner
 * scoping in every query, idempotent create/consume, retry and terminal failure,
 * pause/resume, cancellation, recovery and concurrency limits. They do NOT prove
 * that Postgres enforces RLS; that is the rollback-only SQL suite under
 * `supabase/tests/rls`, reported separately.
 */

const OWNER_A = "a0000000-0000-4000-8000-00000000000a"
const OWNER_B = "b0000000-0000-4000-8000-00000000000b"
const CASE_A = "a0000000-0000-4000-8000-0000000000c1"
const DOC_A = "a0000000-0000-4000-8000-0000000000d1"

/** The case engine is only used by the assistant runner, which these tests inject. */
const unusedCaseRepository = {} as unknown as CaseEngineRepository

/** A runner that always completes, so run-level control flow is what is under test. */
const completingRunner: StepRunner = async ({ step }) => ({
  status: "completed",
  outputReference: { kind: "assistant_message", messageId: `msg-${step.stepKey}` },
})

function repo(db: FakeDb, ownerId: string) {
  return new AgentRunRepository(db.client, ownerId)
}

function dispatcherFor(db: FakeDb, ownerId: string, runner: StepRunner = completingRunner) {
  return createDispatcher({
    runRepository: repo(db, ownerId),
    caseRepository: unusedCaseRepository,
    stepRunner: runner,
    log: () => {},
  })
}

const runKey = (owner: string, objective: string) =>
  deriveRunIdempotencyKey({ ownerId: owner, objective, caseId: CASE_A, leadAgent: "finance-tax" })

describe("agent runs repository: duplicate run creation", () => {
  let db: FakeDb
  beforeEach(() => {
    db = createFakeDb({ ownerId: OWNER_A })
  })

  it("collapses a repeated create onto the existing run", async () => {
    const runs = repo(db, OWNER_A)
    const first = await runs.createRun({
      objective: "Prepare a reply",
      leadAgent: "finance-tax",
      idempotencyKey: runKey(OWNER_A, "Prepare a reply"),
      caseId: CASE_A,
    })
    const second = await runs.createRun({
      objective: "Prepare a reply",
      leadAgent: "finance-tax",
      idempotencyKey: runKey(OWNER_A, "Prepare a reply"),
      caseId: CASE_A,
    })

    expect(first.error).toBeNull()
    expect(first.data?.duplicate).toBe(false)
    expect(second.error).toBeNull()
    expect(second.data?.duplicate).toBe(true)
    // Exactly one run exists, and the second call returned the first one.
    expect(db.tables.agent_runs).toHaveLength(1)
    expect(second.data?.run.id).toBe(first.data?.run.id)
  })

  it("lets two different owners use the same logical request without collision", async () => {
    // The unique key is owner-scoped, so one owner's run cannot block another's.
    const a = repo(createFakeDb({ ownerId: OWNER_A }), OWNER_A)
    const b = repo(createFakeDb({ ownerId: OWNER_B }), OWNER_B)
    const key = "shared-key"
    const first = await a.createRun({ objective: "x", leadAgent: "finance-tax", idempotencyKey: key })
    const second = await b.createRun({ objective: "x", leadAgent: "finance-tax", idempotencyKey: key })
    expect(first.data?.duplicate).toBe(false)
    expect(second.data?.duplicate).toBe(false)
  })

  it("derives a different key for a different objective", () => {
    expect(runKey(OWNER_A, "one")).not.toBe(runKey(OWNER_A, "two"))
  })

  it("derives the same key for the same request regardless of case-insensitivity", () => {
    expect(runKey(OWNER_A, "Prepare A Reply")).toBe(runKey(OWNER_A, "prepare a reply"))
  })
})

describe("agent runs repository: owner isolation", () => {
  it("cannot read another owner's run", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const a = repo(db, OWNER_A)
    const created = await a.createRun({
      objective: "secret objective",
      leadAgent: "finance-tax",
      idempotencyKey: "a-key",
    })
    const runId = created.data!.run.id

    // Same database, different session owner.
    db.session.ownerId = OWNER_B
    const b = repo(db, OWNER_B)
    const read = await b.getRun(runId)
    expect(read.data).toBeNull()
    expect(read.error).toBe("Run not found")
  })

  it("cannot modify another owner's run", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const a = repo(db, OWNER_A)
    const created = await a.createRun({ objective: "obj", leadAgent: "finance-tax", idempotencyKey: "k" })
    const runId = created.data!.run.id

    db.session.ownerId = OWNER_B
    const b = repo(db, OWNER_B)
    const cancelled = await b.cancelRun(runId)
    expect(cancelled.error).toBeTruthy()

    // The row is untouched.
    const row = db.tables.agent_runs.find((r) => r.id === runId)
    expect(row?.status).toBe("queued")
  })

  it("never lists another owner's runs", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    await repo(db, OWNER_A).createRun({ objective: "a", leadAgent: "finance-tax", idempotencyKey: "a" })
    db.session.ownerId = OWNER_B
    await repo(db, OWNER_B).createRun({ objective: "b", leadAgent: "finance-tax", idempotencyKey: "b" })

    db.session.ownerId = OWNER_A
    const listA = await repo(db, OWNER_A).listRuns()
    expect(listA.data).toHaveLength(1)
    expect(listA.data?.[0]?.objective).toBe("a")
  })

  it("reports a missing migration rather than throwing", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    db.failNext("agent_runs", "42P01")
    expect(await repo(db, OWNER_A).isSchemaReady()).toBe(false)
  })
})

describe("agent runs repository: lifecycle", () => {
  let db: FakeDb
  let runs: AgentRunRepository
  let runId: string

  beforeEach(async () => {
    db = createFakeDb({ ownerId: OWNER_A })
    runs = repo(db, OWNER_A)
    const created = await runs.createRun({
      objective: "obj",
      leadAgent: "finance-tax",
      idempotencyKey: "k",
      maxAttempts: 2,
    })
    runId = created.data!.run.id
  })

  it("pauses and resumes", async () => {
    await runs.resumeRun(runId)
    const paused = await runs.pauseRun(runId)
    expect(paused.data?.status).toBe("paused")
    const resumed = await runs.resumeRun(runId)
    expect(resumed.data?.status).toBe("running")
  })

  it("cancels and then refuses any further move", async () => {
    await runs.resumeRun(runId)
    const cancelled = await runs.cancelRun(runId)
    expect(cancelled.data?.status).toBe("cancelled")
    expect(cancelled.data?.completedAt).toBeTruthy()

    const retried = await runs.resumeRun(runId)
    expect(retried.error).toBeTruthy()
  })

  it("refuses to retry a completed run", async () => {
    await runs.resumeRun(runId)
    await runs.transitionRun(runId, "completed", { markCompleted: true })
    const retried = await runs.retryRun(runId)
    expect(retried.error).toBe("RUN_NOT_RETRYABLE")
  })

  it("retries a failed run by re-queuing it", async () => {
    await runs.resumeRun(runId)
    const failed = await runs.recordRunFailure(runId, "STEP_OPERATION_FAILED")
    expect(failed.data?.status).toBe("failed")
    expect(failed.data?.nextAttemptAt).toBeTruthy()

    const retried = await runs.retryRun(runId)
    expect(retried.data?.status).toBe("queued")
  })

  it("dead-letters a run once its attempts are exhausted, never looping forever", async () => {
    await runs.resumeRun(runId)
    // maxAttempts is 2, so the second failure is terminal.
    await runs.recordRunFailure(runId, "STEP_OPERATION_FAILED")
    const second = await runs.recordRunFailure(runId, "STEP_OPERATION_FAILED")
    expect(second.data?.status).toBe("dead_letter")
    expect(second.data?.errorCode).toBe("ATTEMPTS_EXHAUSTED")
  })

  it("refuses an illegal transition instead of writing it", async () => {
    // queued -> completed is not in the table.
    const illegal = await runs.transitionRun(runId, "completed")
    expect(illegal.error).toBeTruthy()
    const row = db.tables.agent_runs.find((r) => r.id === runId)
    expect(row?.status).toBe("queued")
  })
})

describe("agent runs repository: events", () => {
  let db: FakeDb
  let runs: AgentRunRepository

  beforeEach(() => {
    db = createFakeDb({ ownerId: OWNER_A })
    runs = repo(db, OWNER_A)
  })

  it("refuses a duplicate event delivery through the idempotency key", async () => {
    const key = deriveEventIdempotencyKey({
      ownerId: OWNER_A,
      eventType: "DOCUMENT_READY",
      subjectId: DOC_A,
    })
    const first = await runs.recordEvent({ eventType: "DOCUMENT_READY", idempotencyKey: key })
    const second = await runs.recordEvent({ eventType: "DOCUMENT_READY", idempotencyKey: key })

    expect(first.data?.duplicate).toBe(false)
    expect(second.data?.duplicate).toBe(true)
    expect(db.tables.agent_run_events).toHaveLength(1)
  })

  it("claims only due events and marks them processing with a bumped attempt", async () => {
    await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e1" })
    const claimed = await runs.claimEvents(10)
    expect(claimed.data).toHaveLength(1)
    expect(claimed.data?.[0]?.status).toBe("processing")
    expect(claimed.data?.[0]?.attempt).toBe(1)

    // A second claim finds nothing, so an event is not processed twice.
    const again = await runs.claimEvents(10)
    expect(again.data).toHaveLength(0)
  })

  it("leaves a not-yet-due event for a later pass", async () => {
    await runs.recordEvent({
      eventType: "CASE_UPDATED",
      idempotencyKey: "e1",
      availableAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const claimed = await runs.claimEvents(10)
    expect(claimed.data).toHaveLength(0)
  })

  it("backs off a failed event and dead-letters it at the attempt limit", async () => {
    const recorded = await runs.recordEvent({
      eventType: "CASE_UPDATED",
      idempotencyKey: "e1",
      maxAttempts: 1,
    })
    const eventId = recorded.data!.event.id
    await runs.claimEvents(10) // attempt becomes 1

    const failed = await runs.markEventFailed(eventId, "DISPATCH_FAILED")
    expect(failed.data?.status).toBe("dead_letter")
    expect(failed.data?.lastErrorCode).toBe("ATTEMPTS_EXHAUSTED")
  })

  it("requeues a failed event while attempts remain", async () => {
    const recorded = await runs.recordEvent({
      eventType: "CASE_UPDATED",
      idempotencyKey: "e1",
      maxAttempts: 3,
    })
    const eventId = recorded.data!.event.id
    await runs.claimEvents(10)

    const failed = await runs.markEventFailed(eventId, "DISPATCH_FAILED")
    expect(failed.data?.status).toBe("received")
    expect(failed.data?.lastErrorCode).toBe("DISPATCH_FAILED")
  })

  it("dead-letters an event that cannot apply to its run's state", async () => {
    const created = await runs.createRun({ objective: "o", leadAgent: "finance-tax", idempotencyKey: "k" })
    const runId = created.data!.run.id
    // A completed run must not be moved by a late event.
    await runs.resumeRun(runId)
    await runs.transitionRun(runId, "completed", { markCompleted: true })

    const event = await runs.recordEvent({
      eventType: "USER_APPROVAL_GRANTED",
      idempotencyKey: "e1",
      runId,
    })
    const applied = await runs.applyEventToRun(event.data!.event)
    expect(applied.code).toBe("EVENT_NOT_APPLICABLE")
    expect(db.tables.agent_runs.find((r) => r.id === runId)?.status).toBe("completed")
  })

  it("applies an approval event to a waiting run", async () => {
    const created = await runs.createRun({
      objective: "o",
      leadAgent: "finance-tax",
      idempotencyKey: "k",
      approvalRequired: true,
    })
    const runId = created.data!.run.id
    expect(created.data!.run.status).toBe("awaiting_approval")

    const event = await runs.recordEvent({
      eventType: "USER_APPROVAL_GRANTED",
      idempotencyKey: "e1",
      runId,
    })
    const applied = await runs.applyEventToRun(event.data!.event)
    expect(applied.data?.status).toBe("running")
  })
})

describe("agent runs repository: steps are append-only", () => {
  it("records a retry of the same step as a new attempt row", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const runs = repo(db, OWNER_A)
    const created = await runs.createRun({ objective: "o", leadAgent: "finance-tax", idempotencyKey: "k" })
    const runId = created.data!.run.id

    const first = await runs.recordStep({
      runId,
      stepKey: "finance-tax:draft_content",
      agentId: "finance-tax",
      status: "failed",
      errorCode: "STEP_OPERATION_FAILED",
    })
    const second = await runs.recordStep({
      runId,
      stepKey: "finance-tax:draft_content",
      agentId: "finance-tax",
      status: "completed",
    })

    expect(first.data?.attempt).toBe(1)
    expect(second.data?.attempt).toBe(2)
    expect(db.tables.agent_steps).toHaveLength(2)
    // The failed attempt is preserved, so history is not overwritten.
    expect(db.tables.agent_steps[0]?.status).toBe("failed")
  })
})

describe("agent runs dispatcher", () => {
  let db: FakeDb
  let runs: AgentRunRepository

  beforeEach(async () => {
    db = createFakeDb({ ownerId: OWNER_A })
    runs = repo(db, OWNER_A)
  })

  async function createRunnableRun() {
    const created = await runs.createRun({
      objective: "подготви отговор до jobcenter",
      leadAgent: "social-benefits",
      idempotencyKey: "k",
      caseId: CASE_A,
    })
    return created.data!.run.id
  }

  it("executes a queued run and records its steps and completion", async () => {
    const runId = await createRunnableRun()
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 5 })

    expect(summary.runsExecuted).toBe(1)
    expect(summary.runsCompleted).toBe(1)
    expect(summary.traces.length).toBe(1)
    expect(db.tables.agent_runs.find((r) => r.id === runId)?.status).toBe("completed")
    expect(db.tables.agent_steps.length).toBeGreaterThan(0)
    // Output is stored as references, never content.
    const row = db.tables.agent_runs.find((r) => r.id === runId)
    expect(JSON.stringify(row?.output_references)).toContain("assistant_message")
  })

  it("does not execute a run that is waiting for approval", async () => {
    await runs.createRun({
      objective: "подготви отговор",
      leadAgent: "finance-tax",
      idempotencyKey: "k",
      caseId: CASE_A,
      approvalRequired: true,
    })
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 5 })
    expect(summary.runsExecuted).toBe(0)
  })

  it("does not execute a paused run", async () => {
    const runId = await createRunnableRun()
    await runs.pauseRun(runId)
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 5 })
    expect(summary.runsExecuted).toBe(0)
  })

  it("stops a run that is cancelled mid-execution", async () => {
    const runId = await createRunnableRun()
    let calls = 0
    const runner: StepRunner = async () => {
      calls += 1
      // Cancel after the first step, as a user would from the console.
      if (calls === 1) await runs.cancelRun(runId)
      return { status: "completed" }
    }

    const summary = await dispatcherFor(db, OWNER_A, runner)({ runLimit: 5 })
    expect(summary.runsCancelled).toBe(1)
    expect(db.tables.agent_runs.find((r) => r.id === runId)?.status).toBe("cancelled")
    // Only the first step ran; cancellation took effect at the next boundary.
    expect(db.tables.agent_steps).toHaveLength(1)
  })

  it("fails a run when a step fails and schedules a retry", async () => {
    const runId = await createRunnableRun()
    const failing: StepRunner = async () => ({ status: "failed", errorCode: "STEP_OPERATION_FAILED" })

    const summary = await dispatcherFor(db, OWNER_A, failing)({ runLimit: 5 })
    expect(summary.runsFailed).toBe(1)
    const row = db.tables.agent_runs.find((r) => r.id === runId)
    expect(row?.status).toBe("failed")
    expect(row?.next_attempt_at).toBeTruthy()
    expect(row?.error_message_safe).toBe("A run step failed.")
  })

  it("does not re-run a failed run before its backoff elapses", async () => {
    await createRunnableRun()
    const failing: StepRunner = async () => ({ status: "failed", errorCode: "STEP_OPERATION_FAILED" })
    const dispatch = dispatcherFor(db, OWNER_A, failing)
    await dispatch({ runLimit: 5 })

    // The retry is scheduled in the future, so a second pass leaves it alone.
    const second = await dispatch({ runLimit: 5 })
    expect(second.runsExecuted).toBe(0)
  })

  it("dead-letters a run when its attempts are exhausted", async () => {
    const created = await runs.createRun({
      objective: "подготви отговор до jobcenter",
      leadAgent: "social-benefits",
      idempotencyKey: "k",
      caseId: CASE_A,
      maxAttempts: 1,
    })
    const runId = created.data!.run.id
    const failing: StepRunner = async () => ({ status: "failed", errorCode: "STEP_OPERATION_FAILED" })

    const summary = await dispatcherFor(db, OWNER_A, failing)({ runLimit: 5 })
    expect(summary.runsDeadLettered).toBe(1)
    expect(db.tables.agent_runs.find((r) => r.id === runId)?.status).toBe("dead_letter")
  })

  it("processes a claimed event and marks it processed", async () => {
    const runId = await createRunnableRun()
    await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e1", runId })

    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 0 })
    expect(summary.eventsClaimed).toBe(1)
    expect(summary.eventsProcessed).toBe(1)
    expect(db.tables.agent_run_events[0]?.status).toBe("processed")
  })

  it("dead-letters an event that does not apply rather than retrying it forever", async () => {
    const created = await runs.createRun({
      objective: "o",
      leadAgent: "finance-tax",
      idempotencyKey: "k",
    })
    const runId = created.data!.run.id
    await runs.resumeRun(runId)
    await runs.transitionRun(runId, "completed", { markCompleted: true })
    await runs.recordEvent({ eventType: "USER_APPROVAL_GRANTED", idempotencyKey: "e1", runId })

    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 0 })
    expect(summary.eventsDeadLettered).toBe(1)
    expect(db.tables.agent_run_events[0]?.status).toBe("dead_letter")
  })

  it("bounds how many runs one pass executes", async () => {
    for (let i = 0; i < 8; i += 1) {
      await runs.createRun({
        objective: `подготви отговор до jobcenter ${i}`,
        leadAgent: "social-benefits",
        idempotencyKey: `k${i}`,
        caseId: CASE_A,
      })
    }
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 3 })
    expect(summary.runsExecuted).toBe(3)
    const completed = db.tables.agent_runs.filter((r) => r.status === "completed")
    expect(completed).toHaveLength(3)
  })

  it("bounds how many events one pass claims", async () => {
    const created = await runs.createRun({ objective: "o", leadAgent: "finance-tax", idempotencyKey: "k" })
    const runId = created.data!.run.id
    for (let i = 0; i < 15; i += 1) {
      await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: `e${i}`, runId })
    }
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 0, eventLimit: 4 })
    expect(summary.eventsClaimed).toBe(4)
  })

  it("reports a missing migration instead of failing", async () => {
    db.failNext("agent_runs", "42P01")
    const summary = await dispatcherFor(db, OWNER_A)()
    expect(summary.schemaMissing).toBe(true)
    expect(summary.runsExecuted).toBe(0)
  })

  it("does not execute a run whose plan can no longer be re-derived", async () => {
    // A stored lead agent that the Conductor no longer routes to means the routing
    // rules changed under a live run, so the run is not executed.
    const created = await runs.createRun({
      objective: "подготви отговор до jobcenter",
      leadAgent: "not-the-lead",
      idempotencyKey: "k",
      caseId: CASE_A,
    })
    const runId = created.data!.run.id
    const summary = await dispatcherFor(db, OWNER_A)({ runLimit: 5 })
    expect(summary.runsExecuted).toBe(1)
    expect(summary.runsCompleted).toBe(0)
    expect(db.tables.agent_runs.find((r) => r.id === runId)?.status).not.toBe("completed")
  })
})

describe("agent runs dispatcher: worker recovery", () => {
  it("requeues a crashed worker's stale claim", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const runs = repo(db, OWNER_A)
    await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e1" })
    await runs.claimEvents(10)

    const row = db.tables.agent_run_events[0]
    expect(row?.status).toBe("processing")

    // Simulate a crash: the claim goes stale.
    row.updated_at = new Date(Date.now() - 3_600_000).toISOString()

    const recovered = await runs.recoverStaleEvents(60, OWNER_A)
    expect(recovered.data).toBe(1)
    expect(row?.status).toBe("received")

    // The attempt bump from the crashed claim is what bounds a crash loop.
    const claimed = await runs.claimEvents(10)
    expect(claimed.data?.[0]?.attempt).toBe(2)
  })

  it("does not reclaim a fresh claim", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    const runs = repo(db, OWNER_A)
    await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e1" })
    await runs.claimEvents(10)
    const recovered = await runs.recoverStaleEvents(300, OWNER_A)
    expect(recovered.data).toBe(0)
  })

  it("does not let a user session reclaim another owner's work", async () => {
    // The owner argument is ignored for a user session, exactly as the SQL does: the
    // session owner is used instead, so passing another owner's id changes nothing.
    const db = createFakeDb({ ownerId: OWNER_A })
    const runs = repo(db, OWNER_A)
    await runs.recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e-a" })
    await runs.claimEvents(10)
    db.tables.agent_run_events[0]!.updated_at = new Date(Date.now() - 3_600_000).toISOString()

    // A second owner's stale claim sits in the same database.
    db.tables.agent_run_events.push({
      id: "b-event", owner_id: OWNER_B, run_id: null, event_type: "CASE_UPDATED",
      idempotency_key: "e-b", payload: {}, status: "processing", attempt: 1, max_attempts: 5,
      available_at: new Date().toISOString(), last_error_code: null, processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date(Date.now() - 3_600_000).toISOString(),
    })

    const recovered = await runs.recoverStaleEvents(60, OWNER_B)
    // Only A's own row is reclaimed, even though B's owner id was passed.
    expect(recovered.data).toBe(1)
    expect(db.tables.agent_run_events.find((r) => r.id === "b-event")?.status).toBe("processing")
  })

  it("lets a service-role worker claim for a named owner", async () => {
    const db = createFakeDb({ ownerId: OWNER_A })
    await repo(db, OWNER_A).recordEvent({ eventType: "CASE_UPDATED", idempotencyKey: "e1" })

    // The worker has no session owner; it names the owner it dispatches for.
    const worker = createFakeDb({ ownerId: null, isServiceRole: true })
    worker.tables.agent_run_events = db.tables.agent_run_events
    const workerRepo = new AgentRunRepository(worker.client, OWNER_A)

    const claimed = await workerRepo.claimEvents(10, OWNER_A)
    expect(claimed.data).toHaveLength(1)

    // Without a named owner a service-role session must claim nothing, so a worker
    // cannot silently sweep across owners.
    const sweep = await workerRepo.claimEvents(10)
    expect(sweep.data).toHaveLength(0)
  })
})
