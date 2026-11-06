/**
 * HORIZON Agent Runs Engine — owner-scoped repository.
 *
 * Every method is bound to one `ownerId` and every query filters on `owner_id`,
 * so a caller cannot read or write another user's run even before RLS is
 * considered. RLS is the second, independent control (see
 * `supabase/migrations/20261107000000_horizon_agent_runs_engine.sql`).
 *
 * The repository is the only place that writes `agent_runs.status`. It asks
 * `lifecycle.ts` first, so an illegal transition is refused in code rather than
 * surfacing as a database CHECK violation.
 *
 * It never stores document content, prompts or raw error strings. Outputs are
 * references; failures are classified codes.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"
import {
  type AgentRun,
  type AgentRunEvent,
  type AgentRunEventType,
  type AgentRunStatus,
  type AgentStep,
  type AgentStepStatus,
  type EngineResult,
  type RunReference,
  DEFAULT_MAX_ATTEMPTS,
  fail,
  ok,
} from "./contract"
import { canTransitionRun, canTransitionStep, shouldRetry, backoffMs, runStatusForEvent } from "./lifecycle"
import { type AgentRunErrorCode, classifyError, safeErrorMessage } from "./errors"

type Db = Database["public"]
type RunRow = Db["Tables"]["agent_runs"]["Row"]
type StepRow = Db["Tables"]["agent_steps"]["Row"]
type EventRow = Db["Tables"]["agent_run_events"]["Row"]

const UNIQUE_VIOLATION = "23505"

/** A Postgres/PostgREST error meaning the additive migration is not applied yet. */
function isMissingSchema(error: { code?: string | null } | null): boolean {
  return error?.code === "42703" || error?.code === "42P01" || error?.code === "PGRST204" || error?.code === "PGRST205"
}

function asReferences(value: unknown): RunReference[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is RunReference =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as RunReference).kind === "string" &&
      typeof (item as RunReference).id === "string",
  )
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function mapRun(row: RunRow): AgentRun {
  return {
    id: row.id,
    ownerId: row.owner_id,
    caseId: row.case_id,
    serviceRequestId: row.service_request_id,
    traceId: row.trace_id,
    status: row.status as AgentRunStatus,
    objective: row.objective,
    leadAgent: row.lead_agent,
    idempotencyKey: row.idempotency_key,
    promptVersion: row.prompt_version,
    modelVersion: row.model_version,
    skillVersion: row.skill_version,
    inputReferences: asReferences(row.input_references),
    outputReferences: asReferences(row.output_references),
    errorCode: row.error_code,
    errorMessageSafe: row.error_message_safe,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapStep(row: StepRow): AgentStep {
  return {
    id: row.id,
    runId: row.run_id,
    ownerId: row.owner_id,
    stepKey: row.step_key,
    agentId: row.agent_id,
    status: row.status as AgentStepStatus,
    attempt: row.attempt,
    inputReference: asObject(row.input_reference),
    outputReference: asObject(row.output_reference),
    errorCode: row.error_code,
    errorMessageSafe: row.error_message_safe,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEvent(row: EventRow): AgentRunEvent {
  return {
    id: row.id,
    ownerId: row.owner_id,
    runId: row.run_id,
    eventType: row.event_type as AgentRunEventType,
    idempotencyKey: row.idempotency_key,
    payload: asObject(row.payload),
    status: row.status as AgentRunEvent["status"],
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lastErrorCode: row.last_error_code,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type NewRunInput = {
  objective: string
  leadAgent: string
  idempotencyKey: string
  caseId?: string | null
  serviceRequestId?: string | null
  traceId?: string | null
  promptVersion?: string | null
  modelVersion?: string | null
  skillVersion?: string | null
  inputReferences?: RunReference[]
  maxAttempts?: number
  /** When true the run starts in `awaiting_approval` instead of `queued`. */
  approvalRequired?: boolean
  /** Safe codes explaining why the run is held. Stored on the run, never free text. */
  blockers?: string[]
}

export class AgentRunRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  /** The owner this repository is bound to. Read-only; it can never be reassigned. */
  get ownerId(): string {
    return this.userId
  }

  /** True when the agent-runs migration has been applied to this database. */
  async isSchemaReady(): Promise<boolean> {
    const { error } = await this.client.from("agent_runs").select("id").limit(1)
    return !error || !isMissingSchema(error)
  }

  // ---------------------------------------------------------------------------
  // Runs
  // ---------------------------------------------------------------------------

  /**
   * Creates a run, or returns the existing one for a repeated idempotency key.
   *
   * The `unique (owner_id, idempotency_key)` constraint is what makes this
   * duplicate-safe under concurrency: two simultaneous requests both insert, one
   * wins and the loser's `23505` is resolved by reading the winner's row. That is
   * the same recovery pattern the case engine uses for `service_request_id`.
   */
  async createRun(input: NewRunInput): Promise<EngineResult<{ run: AgentRun; duplicate: boolean }>> {
    const { data, error } = await this.client
      .from("agent_runs")
      .insert({
        owner_id: this.userId,
        case_id: input.caseId ?? null,
        service_request_id: input.serviceRequestId ?? null,
        ...(input.traceId ? { trace_id: input.traceId } : {}),
        status: input.approvalRequired ? "awaiting_approval" : "queued",
        objective: input.objective,
        lead_agent: input.leadAgent,
        idempotency_key: input.idempotencyKey,
        prompt_version: input.promptVersion ?? null,
        model_version: input.modelVersion ?? null,
        skill_version: input.skillVersion ?? null,
        input_references: (input.inputReferences ?? []) as unknown as Db["Tables"]["agent_runs"]["Insert"]["input_references"],
        max_attempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      })
      .select("*")
      .single()

    if (error?.code === UNIQUE_VIOLATION) {
      const existing = await this.getRunByIdempotencyKey(input.idempotencyKey)
      if (existing.data) return ok({ run: existing.data, duplicate: true })
      return fail("DUPLICATE_RUN_LOOKUP_FAILED", error.code)
    }
    if (error) return fail(error.message, error.code)
    return ok({ run: mapRun(data), duplicate: false })
  }

  async getRunByIdempotencyKey(idempotencyKey: string): Promise<EngineResult<AgentRun>> {
    const { data, error } = await this.client
      .from("agent_runs")
      .select("*")
      .eq("owner_id", this.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Run not found")
    return ok(mapRun(data))
  }

  async getRun(runId: string): Promise<EngineResult<AgentRun>> {
    const { data, error } = await this.client
      .from("agent_runs")
      .select("*")
      .eq("id", runId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Run not found")
    return ok(mapRun(data))
  }

  async listRuns(options: { status?: AgentRunStatus; limit?: number } = {}): Promise<EngineResult<AgentRun[]>> {
    let query = this.client
      .from("agent_runs")
      .select("*")
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 50, 200))
    if (options.status) query = query.eq("status", options.status)
    const { data, error } = await query
    if (error) return fail(error.message, error.code)
    return ok((data ?? []).map(mapRun))
  }

  /** The operator-console aggregate. Counts only, never content. */
  async summarizeRuns(): Promise<
    EngineResult<{ byStatus: Record<string, number>; total: number; retrying: number; blocked: number }>
  > {
    const runs = await this.listRuns({ limit: 200 })
    if (runs.error || !runs.data) return fail(runs.error ?? "Run list unavailable", runs.code)
    const byStatus: Record<string, number> = {}
    let retrying = 0
    let blocked = 0
    for (const run of runs.data) {
      byStatus[run.status] = (byStatus[run.status] ?? 0) + 1
      if (run.status === "failed") retrying += 1
      if (run.status === "awaiting_approval" || run.status === "paused") blocked += 1
    }
    return ok({ byStatus, total: runs.data.length, retrying, blocked })
  }

  /**
   * Moves a run to a new status through the declared transition table.
   *
   * `nextAttemptAt` is set for a retryable failure and cleared otherwise, so a
   * run is either scheduled or final — never both.
   */
  async transitionRun(
    runId: string,
    to: AgentRunStatus,
    patch: {
      errorCode?: AgentRunErrorCode | null
      outputReferences?: RunReference[]
      nextAttemptAt?: string | null
      markStarted?: boolean
      markCompleted?: boolean
      bumpAttempt?: boolean
    } = {},
  ): Promise<EngineResult<AgentRun>> {
    const current = await this.getRun(runId)
    if (current.error || !current.data) return fail(current.error ?? "Run not found", current.code)
    if (!canTransitionRun(current.data.status, to)) {
      return fail(`Illegal run transition ${current.data.status} -> ${to}`, "ILLEGAL_TRANSITION")
    }

    const nowIso = new Date().toISOString()
    const update: Db["Tables"]["agent_runs"]["Update"] = { status: to }
    if (patch.bumpAttempt) update.attempt = current.data.attempt + 1
    if (patch.errorCode !== undefined) {
      update.error_code = patch.errorCode
      update.error_message_safe = patch.errorCode ? safeErrorMessage(patch.errorCode) : null
    }
    if (patch.outputReferences) update.output_references = patch.outputReferences as unknown as Db["Tables"]["agent_runs"]["Update"]["output_references"]
    if (patch.nextAttemptAt !== undefined) update.next_attempt_at = patch.nextAttemptAt
    if (patch.markStarted && !current.data.startedAt) update.started_at = nowIso
    if (patch.markCompleted) update.completed_at = nowIso
    if (to === "completed" || to === "cancelled" || to === "dead_letter") update.next_attempt_at = null

    const { data, error } = await this.client
      .from("agent_runs")
      .update(update)
      .eq("id", runId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Run not found")
    return ok(mapRun(data))
  }

  /** Records a retryable failure, or dead-letters the run when attempts are spent. */
  async recordRunFailure(runId: string, errorCode: AgentRunErrorCode): Promise<EngineResult<AgentRun>> {
    const current = await this.getRun(runId)
    if (current.error || !current.data) return fail(current.error ?? "Run not found", current.code)

    const nextAttempt = current.data.attempt + 1
    if (!shouldRetry(nextAttempt, current.data.maxAttempts)) {
      return this.transitionRun(runId, "dead_letter", {
        errorCode: "ATTEMPTS_EXHAUSTED",
        bumpAttempt: true,
        markCompleted: true,
      })
    }

    const nextAttemptAt = new Date(Date.now() + backoffMs(current.data.attempt)).toISOString()
    return this.transitionRun(runId, "failed", { errorCode, bumpAttempt: true, nextAttemptAt })
  }

  async cancelRun(runId: string): Promise<EngineResult<AgentRun>> {
    return this.transitionRun(runId, "cancelled", { markCompleted: true })
  }

  async pauseRun(runId: string): Promise<EngineResult<AgentRun>> {
    return this.transitionRun(runId, "paused")
  }

  async resumeRun(runId: string): Promise<EngineResult<AgentRun>> {
    return this.transitionRun(runId, "running", { markStarted: true })
  }

  /** Re-queues a failed run so the dispatcher picks it up again. */
  async retryRun(runId: string): Promise<EngineResult<AgentRun>> {
    const current = await this.getRun(runId)
    if (current.error || !current.data) return fail(current.error ?? "Run not found", current.code)
    if (current.data.status !== "failed") {
      return fail("RUN_NOT_RETRYABLE", "RUN_NOT_RETRYABLE")
    }
    return this.transitionRun(runId, "queued", { nextAttemptAt: new Date().toISOString(), errorCode: null })
  }

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------

  /**
   * Records a step. A retry of the same step is a *new attempt row*, so step
   * history is append-only and a completed step is never overwritten.
   */
  async recordStep(input: {
    runId: string
    stepKey: string
    agentId: string
    status: AgentStepStatus
    attempt?: number
    inputReference?: Record<string, unknown>
    outputReference?: Record<string, unknown>
    errorCode?: AgentRunErrorCode | null
  }): Promise<EngineResult<AgentStep>> {
    const attempt = input.attempt ?? (await this.nextStepAttempt(input.runId, input.stepKey))
    const terminal = input.status === "completed" || input.status === "failed" || input.status === "skipped"
    const nowIso = new Date().toISOString()

    const { data, error } = await this.client
      .from("agent_steps")
      .insert({
        run_id: input.runId,
        owner_id: this.userId,
        step_key: input.stepKey,
        agent_id: input.agentId,
        status: input.status,
        attempt,
        input_reference: (input.inputReference ?? {}) as Db["Tables"]["agent_steps"]["Insert"]["input_reference"],
        output_reference: (input.outputReference ?? {}) as Db["Tables"]["agent_steps"]["Insert"]["output_reference"],
        error_code: input.errorCode ?? null,
        error_message_safe: input.errorCode ? safeErrorMessage(input.errorCode) : null,
        started_at: nowIso,
        completed_at: terminal ? nowIso : null,
      })
      .select("*")
      .single()

    if (error?.code === UNIQUE_VIOLATION) {
      return fail("DUPLICATE_STEP_ATTEMPT", error.code)
    }
    if (error) return fail(error.message, error.code)
    return ok(mapStep(data))
  }

  private async nextStepAttempt(runId: string, stepKey: string): Promise<number> {
    const { data, error } = await this.client
      .from("agent_steps")
      .select("attempt")
      .eq("owner_id", this.userId)
      .eq("run_id", runId)
      .eq("step_key", stepKey)
      .order("attempt", { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return 1
    return (data[0].attempt ?? 0) + 1
  }

  async listSteps(runId: string): Promise<EngineResult<AgentStep[]>> {
    const { data, error } = await this.client
      .from("agent_steps")
      .select("*")
      .eq("owner_id", this.userId)
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
    if (error) return fail(error.message, error.code)
    return ok((data ?? []).map(mapStep))
  }

  /** Updates a step's status through the declared step transition table. */
  async transitionStep(
    stepId: string,
    to: AgentStepStatus,
    patch: { errorCode?: AgentRunErrorCode | null; outputReference?: Record<string, unknown> } = {},
  ): Promise<EngineResult<AgentStep>> {
    const { data: existing, error: readError } = await this.client
      .from("agent_steps")
      .select("*")
      .eq("id", stepId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (readError) return fail(readError.message, readError.code)
    if (!existing) return fail("Step not found")
    if (!canTransitionStep(existing.status as AgentStepStatus, to)) {
      return fail(`Illegal step transition ${existing.status} -> ${to}`, "ILLEGAL_TRANSITION")
    }

    const update: Db["Tables"]["agent_steps"]["Update"] = { status: to }
    if (patch.errorCode !== undefined) {
      update.error_code = patch.errorCode
      update.error_message_safe = patch.errorCode ? safeErrorMessage(patch.errorCode) : null
    }
    if (patch.outputReference) update.output_reference = patch.outputReference as Db["Tables"]["agent_steps"]["Update"]["output_reference"]
    if (to === "completed" || to === "failed" || to === "skipped" || to === "dead_letter") {
      update.completed_at = new Date().toISOString()
    }

    const { data, error } = await this.client
      .from("agent_steps")
      .update(update)
      .eq("id", stepId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Step not found")
    return ok(mapStep(data))
  }

  // ---------------------------------------------------------------------------
  // Events (outbox)
  // ---------------------------------------------------------------------------

  /**
   * Records an event. A repeated delivery is refused by the unique constraint and
   * reported as a duplicate rather than an error, so a re-delivered webhook is a
   * no-op instead of a failure.
   */
  async recordEvent(input: {
    eventType: AgentRunEventType
    idempotencyKey: string
    runId?: string | null
    payload?: Record<string, unknown>
    availableAt?: string
    maxAttempts?: number
  }): Promise<EngineResult<{ event: AgentRunEvent; duplicate: boolean }>> {
    const { data, error } = await this.client
      .from("agent_run_events")
      .insert({
        owner_id: this.userId,
        run_id: input.runId ?? null,
        event_type: input.eventType,
        idempotency_key: input.idempotencyKey,
        payload: (input.payload ?? {}) as Db["Tables"]["agent_run_events"]["Insert"]["payload"],
        available_at: input.availableAt ?? new Date().toISOString(),
        max_attempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      })
      .select("*")
      .single()

    if (error?.code === UNIQUE_VIOLATION) {
      const existing = await this.getEventByIdempotencyKey(input.idempotencyKey)
      if (existing.data) return ok({ event: existing.data, duplicate: true })
      return fail("DUPLICATE_EVENT_LOOKUP_FAILED", error.code)
    }
    if (error) return fail(error.message, error.code)
    return ok({ event: mapEvent(data), duplicate: false })
  }

  async getEventByIdempotencyKey(idempotencyKey: string): Promise<EngineResult<AgentRunEvent>> {
    const { data, error } = await this.client
      .from("agent_run_events")
      .select("*")
      .eq("owner_id", this.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Event not found")
    return ok(mapEvent(data))
  }

  async listEvents(options: { runId?: string; limit?: number } = {}): Promise<EngineResult<AgentRunEvent[]>> {
    let query = this.client
      .from("agent_run_events")
      .select("*")
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 50, 200))
    if (options.runId) query = query.eq("run_id", options.runId)
    const { data, error } = await query
    if (error) return fail(error.message, error.code)
    return ok((data ?? []).map(mapEvent))
  }

  /**
   * Claims due events for this owner through the owner-scoped SQL helper.
   *
   * `FOR UPDATE SKIP LOCKED` cannot be expressed in PostgREST, so the claim runs
   * in `claim_agent_run_events()`, which is SECURITY INVOKER and keyed on
   * `auth.uid()`. The attempt counter is incremented by the claim, which is what
   * bounds a crashed worker's retries.
   */
  async claimEvents(limit = 10, ownerIdOverride?: string): Promise<EngineResult<AgentRunEvent[]>> {
    // `p_owner_id` is honoured by the SQL function only for the service role, so
    // passing it from a user session cannot widen access.
    const args = ownerIdOverride
      ? { p_limit: limit, p_owner_id: ownerIdOverride }
      : { p_limit: limit }
    const { data, error } = await this.client.rpc("claim_agent_run_events", args)
    if (error) return fail(error.message, error.code)
    return ok(((data ?? []) as EventRow[]).map(mapEvent))
  }

  /** Returns a crashed worker's stale claims to `received`. */
  async recoverStaleEvents(
    visibilityTimeoutSeconds = 300,
    ownerIdOverride?: string,
  ): Promise<EngineResult<number>> {
    const args = ownerIdOverride
      ? { p_visibility_timeout_seconds: visibilityTimeoutSeconds, p_owner_id: ownerIdOverride }
      : { p_visibility_timeout_seconds: visibilityTimeoutSeconds }
    const { data, error } = await this.client.rpc("recover_stale_agent_run_events", args)
    if (error) return fail(error.message, error.code)
    return ok(typeof data === "number" ? data : 0)
  }

  async markEventProcessed(eventId: string): Promise<EngineResult<AgentRunEvent>> {
    return this.updateEvent(eventId, { status: "processed", processed_at: new Date().toISOString() })
  }

  /**
   * Terminal failure for an event. Used when retrying cannot help — for example an
   * event that does not apply to its run's state — so it must not consume the
   * retry budget of a transient failure.
   */
  async deadLetterEvent(eventId: string, errorCode: AgentRunErrorCode): Promise<EngineResult<AgentRunEvent>> {
    return this.updateEvent(eventId, {
      status: "dead_letter",
      last_error_code: errorCode,
      processed_at: new Date().toISOString(),
    })
  }

  /** Retries an event, or dead-letters it when its attempts are spent. */
  async markEventFailed(
    eventId: string,
    errorCode: AgentRunErrorCode,
  ): Promise<EngineResult<AgentRunEvent>> {
    const { data: existing, error } = await this.client
      .from("agent_run_events")
      .select("*")
      .eq("id", eventId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!existing) return fail("Event not found")

    if (!shouldRetry(existing.attempt, existing.max_attempts)) {
      return this.updateEvent(eventId, {
        status: "dead_letter",
        last_error_code: "ATTEMPTS_EXHAUSTED",
        processed_at: new Date().toISOString(),
      })
    }

    return this.updateEvent(eventId, {
      status: "received",
      last_error_code: errorCode,
      available_at: new Date(Date.now() + backoffMs(existing.attempt - 1)).toISOString(),
    })
  }

  private async updateEvent(
    eventId: string,
    update: Db["Tables"]["agent_run_events"]["Update"],
  ): Promise<EngineResult<AgentRunEvent>> {
    const { data, error } = await this.client
      .from("agent_run_events")
      .update(update)
      .eq("id", eventId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    if (!data) return fail("Event not found")
    return ok(mapEvent(data))
  }

  /**
   * Applies an event to its run: the event says *what happened*, and the run's
   * resulting status is derived by `lifecycle.ts`. An event that does not apply to
   * the run's current state is refused, so a late delivery cannot revive a
   * finished or cancelled run.
   */
  async applyEventToRun(event: AgentRunEvent): Promise<EngineResult<AgentRun | null>> {
    if (!event.runId) return ok(null)
    const run = await this.getRun(event.runId)
    if (run.error || !run.data) return fail(run.error ?? "Run not found", run.code)

    const target = runStatusForEvent(event.eventType)
    if (!target) return ok(run.data)
    if (!canTransitionRun(run.data.status, target)) {
      return fail("EVENT_NOT_APPLICABLE", "EVENT_NOT_APPLICABLE")
    }
    return this.transitionRun(event.runId, target, { markStarted: target === "running" })
  }

  /** Exposed so a caller can classify a failure the same way the engine does. */
  classify(error: unknown): AgentRunErrorCode {
    return classifyError(error)
  }
}
