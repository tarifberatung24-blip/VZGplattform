import "server-only"
import { createClient } from "@/lib/supabase/server"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { CaseEngineRepository } from "../case/repository"
import { AgentRunRepository } from "./repository"
import { planRun } from "./registry"
import { deriveRunIdempotencyKey, deriveEventIdempotencyKey } from "./idempotency"
import { createDispatcher, type DispatchSummary } from "./dispatcher"
import type { StepRunner } from "./executor"
import {
  type AgentRun,
  type AgentRunEventType,
  type EngineResult,
  type RunReference,
  fail,
  ok,
} from "./contract"
import { safeErrorMessage } from "./errors"

/**
 * HORIZON Agent Runs Engine — service facade.
 *
 * This is the module an API route talks to. It owns the create → plan → persist
 * sequence and the ownership checks that must happen *before* a run exists:
 *
 * - the case and every document are validated through the owner-scoped case
 *   engine, so a foreign or missing id is rejected before anything is written;
 * - the Conductor is consulted once, and its routing decision is stored on the run;
 * - a repeated request collapses onto the existing run through the unique
 *   `(owner_id, idempotency_key)` constraint.
 *
 * The engine never trusts an owner id, case id or document id supplied by the
 * client: `userId` comes from the session and the ids are re-checked against rows
 * the user actually owns.
 */

export type AgentRunsContext = {
  service: AgentRunService | null
  userId: string | null
  configured: boolean
  /** False when the agent-runs migration has not been applied to this database. */
  schemaReady: boolean
}

export type CreateRunRequest = {
  objective: string
  caseId?: string | null
  documentIds?: string[]
  locale?: "bg" | "de"
  /** Optional caller key; a derived key is used when it is absent. */
  idempotencyKey?: string | null
}

export class AgentRunService {
  constructor(
    readonly runs: AgentRunRepository,
    readonly cases: CaseEngineRepository,
    private readonly userId: string,
  ) {}

  /**
   * Creates a run, or returns the existing one for a repeated request.
   *
   * Order matters: ownership is proven first, so an unauthorised request is
   * refused without leaving a run behind, and the idempotency key is derived from
   * the *validated* case id, not from the raw input.
   */
  async createRun(request: CreateRunRequest): Promise<EngineResult<{ run: AgentRun; duplicate: boolean }>> {
    const objective = request.objective.trim()
    if (!objective) return fail(safeErrorMessage("INVALID_RUN_REQUEST"), "INVALID_RUN_REQUEST")

    let validatedCaseId: string | null = null
    if (request.caseId) {
      const loaded = await this.cases.loadCaseContext(request.caseId)
      if (loaded.error || !loaded.data) {
        // A foreign case is indistinguishable from a missing one.
        return fail(safeErrorMessage("CASE_NOT_FOUND"), "CASE_NOT_FOUND")
      }
      validatedCaseId = loaded.data.caseId

      const owned = new Set(loaded.data.documentIds)
      const submitted = request.documentIds ?? []
      if (submitted.some((id) => !owned.has(id))) {
        return fail(safeErrorMessage("DOCUMENT_NOT_FOUND"), "DOCUMENT_NOT_FOUND")
      }
    } else if (request.documentIds?.length) {
      // Documents without a case have no ownership context to validate against.
      return fail(safeErrorMessage("CASE_NOT_FOUND"), "CASE_NOT_FOUND")
    }

    let planned
    try {
      planned = planRun({
        objective,
        caseId: validatedCaseId,
        documentIds: request.documentIds,
        locale: request.locale,
        contextValidated: Boolean(validatedCaseId),
      })
    } catch {
      return fail(safeErrorMessage("INVALID_RUN_REQUEST"), "INVALID_RUN_REQUEST")
    }

    const inputReferences: RunReference[] = [
      ...(validatedCaseId ? [{ kind: "case" as const, id: validatedCaseId }] : []),
      ...(request.documentIds ?? []).map((id) => ({ kind: "document" as const, id })),
    ]

    const idempotencyKey =
      request.idempotencyKey ??
      deriveRunIdempotencyKey({
        ownerId: this.userId,
        objective,
        caseId: validatedCaseId,
        leadAgent: planned.plan.leadAgent.id,
      })

    const created = await this.runs.createRun({
      objective,
      leadAgent: planned.plan.leadAgent.id,
      idempotencyKey,
      caseId: validatedCaseId,
      traceId: planned.plan.traceId,
      skillVersion: planned.skillVersion,
      inputReferences,
      approvalRequired: planned.approvalRequired,
    })
    if (created.error || !created.data) {
      return fail(created.error ?? safeErrorMessage("ENGINE_UNAVAILABLE"), created.code)
    }

    return ok({ run: created.data.run, duplicate: created.data.duplicate })
  }

  /** Records a validated lifecycle event for this owner. */
  async recordEvent(input: {
    eventType: AgentRunEventType
    subjectId?: string | null
    runId?: string | null
    payload?: Record<string, unknown>
    discriminator?: string | null
  }): Promise<EngineResult<{ event: unknown; duplicate: boolean }>> {
    const idempotencyKey = deriveEventIdempotencyKey({
      ownerId: this.userId,
      eventType: input.eventType,
      subjectId: input.subjectId ?? input.runId ?? null,
      discriminator: input.discriminator ?? null,
    })
    return this.runs.recordEvent({
      eventType: input.eventType,
      idempotencyKey,
      runId: input.runId ?? null,
      payload: input.payload,
    })
  }

  /** Execution history for one run: the run, its steps and its events. */
  async getRunHistory(runId: string): Promise<
    EngineResult<{ run: AgentRun; steps: unknown[]; events: unknown[] }>
  > {
    const run = await this.runs.getRun(runId)
    if (run.error || !run.data) return fail(run.error ?? "Run not found", run.code)
    const [steps, events] = await Promise.all([
      this.runs.listSteps(runId),
      this.runs.listEvents({ runId, limit: 200 }),
    ])
    if (steps.error) return fail(steps.error, steps.code)
    if (events.error) return fail(events.error, events.code)
    return ok({ run: run.data, steps: steps.data ?? [], events: events.data ?? [] })
  }

  /** One dispatch pass for this owner. Used by the cron worker. */
  async dispatch(
    options: { runLimit?: number; eventLimit?: number; stepRunner?: StepRunner; log?: (line: string) => void } = {},
  ): Promise<DispatchSummary> {
    const dispatcher = createDispatcher({
      runRepository: this.runs,
      caseRepository: this.cases,
      stepRunner: options.stepRunner,
      log: options.log,
    })
    return dispatcher({ runLimit: options.runLimit, eventLimit: options.eventLimit })
  }
}

/**
 * Builds the engine bound to the authenticated user.
 *
 * Returns `service: null` when there is no session, so a route cannot operate an
 * unauthenticated engine. Uses the request-scoped session client (RLS enforced),
 * never a service-role client.
 */
export async function createAgentRunService(): Promise<AgentRunsContext> {
  if (!hasSupabaseConfig()) {
    return { service: null, userId: null, configured: false, schemaReady: false }
  }

  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return { service: null, userId: null, configured: true, schemaReady: false }

  const runs = new AgentRunRepository(client, user.id)
  const cases = new CaseEngineRepository(client, user.id)
  return {
    service: new AgentRunService(runs, cases, user.id),
    userId: user.id,
    configured: true,
    schemaReady: await runs.isSchemaReady(),
  }
}
