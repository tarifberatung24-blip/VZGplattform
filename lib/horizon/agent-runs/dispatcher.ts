import "server-only"
import type { CaseEngineRepository } from "../case/repository"
import { AgentRunRepository } from "./repository"
import { createAssistantStepRunner } from "./assistant"
import { executePlan, isRunnableStatus, type StepRunner } from "./executor"
import type { AgentRun, AgentRunEvent, EngineResult, RunReference, RunStepDescriptor } from "./contract"
import { RUN_REFERENCE_KINDS, ok, fail } from "./contract"
import { type AgentRunErrorCode, agentRunLog, classifyError, safeErrorMessage } from "./errors"
import { runStatusForEvent } from "./lifecycle"
import { planRun } from "./registry"

/**
 * HORIZON Agent Runs Engine — dispatcher.
 *
 * One pass of the dispatcher does exactly three bounded things:
 *   1. recovers a crashed worker's stale claims (visibility timeout);
 *   2. drains a bounded batch of due events for the owner;
 *   3. executes a bounded number of due runs for the owner.
 *
 * It is deliberately *pull*-based and finite. There is no autonomous loop, no
 * self-scheduling and no path by which the engine starts work that a user request
 * or a cron trigger did not create. Each pass returns what it did, so the caller
 * (a cron route) can log a truthful summary.
 *
 * Every write goes through the owner-scoped repository, so the dispatcher operates
 * under the same owner/RLS rule as a user session. There is no service-role bypass.
 */

export type DispatchSummary = {
  ownerId: string
  recovered: number
  eventsClaimed: number
  eventsProcessed: number
  eventsRetried: number
  eventsDeadLettered: number
  runsExecuted: number
  runsCompleted: number
  runsFailed: number
  runsDeadLettered: number
  runsPaused: number
  runsCancelled: number
  /** True when the engine's tables are not present yet (migration not applied). */
  schemaMissing: boolean
  /** Trace ids touched this pass, so an operator can follow one run end to end. */
  traces: string[]
}

export type DispatcherDeps = {
  runRepository: AgentRunRepository
  caseRepository: CaseEngineRepository
  /** Overridable in tests. Production uses the real assistant runner. */
  stepRunner?: StepRunner
  /**
   * Re-derives a run's steps. The default re-asks the existing Conductor, so the
   * stored run never becomes a second, competing plan.
   */
  resolveSteps?: (run: AgentRun) => RunStepDescriptor[]
  now?: () => number
  log?: (line: string) => void
}

/**
 * The default step resolver: re-asks Alpha Team's Conductor with the run's own
 * stored objective and case. The Conductor's routing is deterministic for a given
 * objective, so this reproduces the plan the run was created from without storing
 * a duplicate copy of it — the registry stays the single source of truth for what
 * a run does.
 */
function defaultResolveSteps(run: AgentRun): RunStepDescriptor[] {
  try {
    const planned = planRun({
      objective: run.objective,
      caseId: run.caseId,
      contextValidated: Boolean(run.caseId),
    })
    // The stored lead agent is authoritative. A mismatch would mean the routing
    // rules changed under a live run, so the run is not executed rather than run
    // under a plan the user did not approve.
    if (planned.plan.leadAgent.id !== run.leadAgent) return []
    return planned.steps
  } catch {
    return []
  }
}

/** Bounded so one pass cannot exhaust a serverless invocation. */
export const DEFAULT_EVENT_BATCH = 10
export const DEFAULT_RUN_BATCH = 5
export const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 300

/**
 * The statuses a run may be *executed* from. `awaiting_approval` and `paused` are
 * excluded on purpose: they wait for a human, and the dispatcher must not bypass
 * an approval boundary by running them anyway.
 */
function isDueForExecution(run: AgentRun, now: number): boolean {
  if (!isRunnableStatus(run.status)) return false
  if (!run.nextAttemptAt) return true
  return Date.parse(run.nextAttemptAt) <= now
}

export function createDispatcher(deps: DispatcherDeps) {
  const now = deps.now ?? (() => Date.now())
  const log = deps.log ?? (() => {})
  const stepRunner =
    deps.stepRunner ?? createAssistantStepRunner({ repository: deps.caseRepository })

  async function processEvent(event: AgentRunEvent, summary: DispatchSummary): Promise<void> {
    try {
      const applied = await deps.runRepository.applyEventToRun(event)
      if (applied.error) {
        // An event that does not apply to its run's state is not a transient
        // failure: retrying it forever would be wrong, so it is dead-lettered
        // immediately instead of consuming a retry budget.
        if (applied.code === "EVENT_NOT_APPLICABLE") {
          await deps.runRepository.deadLetterEvent(event.id, "EVENT_NOT_APPLICABLE")
          summary.eventsDeadLettered += 1
          log(agentRunLog({
            event: "event_not_applicable", runId: event.runId, traceId: null, caseId: null,
            stepKey: null, ownerId: summary.ownerId, status: "dead_letter", attempt: event.attempt,
            errorCode: "EVENT_NOT_APPLICABLE", durationMs: null,
          }))
          return
        }
        throw new Error(applied.code ?? "DISPATCH_FAILED")
      }

      await deps.runRepository.markEventProcessed(event.id)
      summary.eventsProcessed += 1
      log(agentRunLog({
        event: "event_processed", runId: event.runId, traceId: null, caseId: null,
        stepKey: null, ownerId: summary.ownerId, status: "processed", attempt: event.attempt,
        errorCode: null, durationMs: null,
      }))
    } catch (error) {
      const code = classifyError(error)
      const failed = await deps.runRepository.markEventFailed(event.id, code)
      if (failed.data?.status === "dead_letter") {
        summary.eventsDeadLettered += 1
      } else {
        summary.eventsRetried += 1
      }
      log(agentRunLog({
        event: "event_failed", runId: event.runId, traceId: null, caseId: null,
        stepKey: null, ownerId: summary.ownerId, status: failed.data?.status ?? "unknown",
        attempt: event.attempt, errorCode: code, durationMs: null,
      }))
    }
  }

  async function executeRun(run: AgentRun, summary: DispatchSummary): Promise<void> {
    const startedAt = now()
    summary.traces.push(run.traceId)

    // A run whose plan can no longer be re-derived is not executed: an empty step
    // list means the routing rules changed under a live run, which is a blocker and
    // not something the engine may guess around.
    const steps = (deps.resolveSteps ?? defaultResolveSteps)(run)
    if (steps.length === 0) {
      const blocked = await deps.runRepository.recordRunFailure(run.id, "DISPATCH_FAILED")
      if (blocked.data?.status === "dead_letter") summary.runsDeadLettered += 1
      else summary.runsFailed += 1
      return
    }

    // `running` is written first and through the transition table, so a run can
    // never be observed executing without the state change that authorises it.
    const started = run.status === "queued" ? await deps.runRepository.resumeRun(run.id) : ok(run)
    if (started.error || !started.data) {
      summary.runsFailed += 1
      return
    }
    const activeRun = started.data

    const outcome = await executePlan(
      {
        runId: activeRun.id,
        ownerId: activeRun.ownerId,
        traceId: activeRun.traceId,
        caseId: activeRun.caseId,
        objective: activeRun.objective,
        leadAgent: activeRun.leadAgent,
        steps,
      },
      stepRunner,
      {
        now,
        // Re-read the run between steps so a cancellation or pause requested while
        // the run is executing takes effect at the next step boundary.
        shouldAbort: async () => {
          const fresh = await deps.runRepository.getRun(activeRun.id)
          if (!fresh.data) return "cancel"
          if (fresh.data.status === "cancelled") return "cancel"
          if (fresh.data.status === "paused") return "pause"
          return null
        },
        onStep: async (executed) => {
          await deps.runRepository.recordStep({
            runId: activeRun.id,
            stepKey: executed.step.stepKey,
            agentId: executed.step.agentId,
            status:
              executed.status === "completed" ? "completed"
              : executed.status === "skipped" ? "skipped"
              : "failed",
            attempt: executed.attempt,
            inputReference: { operation: executed.step.operation },
            outputReference: executed.outputReference,
            errorCode: executed.errorCode,
          })
          log(agentRunLog({
            event: "step_finished", runId: activeRun.id, traceId: activeRun.traceId,
            caseId: activeRun.caseId, stepKey: executed.step.stepKey, ownerId: activeRun.ownerId,
            status: executed.status, attempt: executed.attempt, errorCode: executed.errorCode,
            durationMs: executed.durationMs,
          }))
        },
      },
    )

    // Only references to existing HORIZON entities are stored — never content.
    const outputReferences: RunReference[] = outcome.steps
      .map((step) => step.outputReference)
      .map((ref): RunReference | null => {
        const kind = typeof ref.kind === "string" ? ref.kind : "assistant_message"
        const id = typeof ref.messageId === "string" ? ref.messageId : typeof ref.id === "string" ? ref.id : ""
        if (!id) return null
        if (!(RUN_REFERENCE_KINDS as readonly string[]).includes(kind)) return null
        return { kind: kind as RunReference["kind"], id }
      })
      .filter((ref): ref is RunReference => ref !== null)

    switch (outcome.status) {
      case "completed": {
        await deps.runRepository.transitionRun(activeRun.id, "completed", {
          outputReferences,
          errorCode: null,
          markCompleted: true,
        })
        summary.runsCompleted += 1
        break
      }
      case "paused": {
        summary.runsPaused += 1
        break
      }
      case "cancelled": {
        summary.runsCancelled += 1
        break
      }
      default: {
        const failedRun = await deps.runRepository.recordRunFailure(
          activeRun.id,
          outcome.errorCode ?? "STEP_OPERATION_FAILED",
        )
        if (failedRun.data?.status === "dead_letter") summary.runsDeadLettered += 1
        else summary.runsFailed += 1
      }
    }

    log(agentRunLog({
      event: "run_finished", runId: activeRun.id, traceId: activeRun.traceId,
      caseId: activeRun.caseId, stepKey: null, ownerId: activeRun.ownerId,
      status: outcome.status, attempt: activeRun.attempt,
      errorCode: outcome.errorCode, durationMs: now() - startedAt,
    }))
  }

  return async function dispatch(options: {
    runLimit?: number
    eventLimit?: number
    visibilityTimeoutSeconds?: number
  } = {}): Promise<DispatchSummary> {
    const summary: DispatchSummary = {
      ownerId: deps.runRepository.ownerId,
      recovered: 0,
      eventsClaimed: 0,
      eventsProcessed: 0,
      eventsRetried: 0,
      eventsDeadLettered: 0,
      runsExecuted: 0,
      runsCompleted: 0,
      runsFailed: 0,
      runsDeadLettered: 0,
      runsPaused: 0,
      runsCancelled: 0,
      schemaMissing: false,
      traces: [],
    }

    if (!(await deps.runRepository.isSchemaReady())) {
      summary.schemaMissing = true
      return summary
    }

    // 1. Recover a crashed worker's claims before claiming new work, so an
    //    interrupted event is retried rather than stuck in `processing`.
    const ownerId = deps.runRepository.ownerId
    const recovered = await deps.runRepository.recoverStaleEvents(
      options.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
      ownerId,
    )
    if (recovered.data) summary.recovered = recovered.data

    // 2. Drain a bounded batch of due events. The owner argument is what lets a
    //    scheduled pass find work at all (a service-role session has no
    //    `auth.uid()`); for a user session the SQL function ignores it and uses
    //    `auth.uid()`, which is the same owner, so this cannot widen access.
    const claimed = await deps.runRepository.claimEvents(options.eventLimit ?? DEFAULT_EVENT_BATCH, ownerId)
    if (claimed.error || !claimed.data) {
      return summary
    }
    summary.eventsClaimed = claimed.data.length
    for (const event of claimed.data) {
      await processEvent(event, summary)
    }

    // 3. Execute a bounded batch of due runs. A run that is not due yet (backoff)
    //    is left for a later pass rather than forced.
    const runs = await deps.runRepository.listRuns({ limit: 200 })
    if (runs.error || !runs.data) return summary

    const due = runs.data.filter((run) => isDueForExecution(run, now()))
    for (const run of due.slice(0, options.runLimit ?? DEFAULT_RUN_BATCH)) {
      summary.runsExecuted += 1
      await executeRun(run, summary)
    }

    return summary
  }
}

/**
 * Builds a dispatcher bound to one owner session. Exported so a cron route and a
 * test construct it the same way.
 */
export function createOwnerDispatcher(input: {
  runRepository: AgentRunRepository
  caseRepository: CaseEngineRepository
  stepRunner?: StepRunner
  now?: () => number
  log?: (line: string) => void
}) {
  return createDispatcher(input)
}

/** Re-exported so a caller can describe an event's effect without importing lifecycle. */
export { runStatusForEvent }

export function dispatchFailure(code: AgentRunErrorCode): EngineResult<never> {
  return fail(safeErrorMessage(code), code)
}
