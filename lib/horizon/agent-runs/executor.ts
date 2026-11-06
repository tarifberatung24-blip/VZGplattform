/**
 * HORIZON Agent Runs Engine — bounded plan executor.
 *
 * Pure orchestration over an injected `StepRunner`. It owns ordering, timeouts,
 * cancellation, pause points and attempt bookkeeping, and nothing else: it never
 * talks to a model, a database or an HTTP endpoint itself. That keeps the control
 * flow exhaustively testable without infrastructure, and keeps the model call in
 * one auditable place (`assistant.ts`).
 *
 * Hard limits enforced here, so no caller can bypass them:
 * - a run executes at most `MAX_STEPS_PER_RUN` steps;
 * - each step has a deadline and is aborted when it elapses;
 * - the executor re-checks a `shouldAbort` hook between steps, which is how a
 *   cancellation or a pause stops the run without killing the process;
 * - a terminal run never executes again.
 */

import type { AgentRunErrorCode } from "./errors"
import {
  type AgentRunStatus,
  type RunExecutionPlan,
  type RunStepDescriptor,
  isTerminalRunStatus,
} from "./contract"

/** Bounded, so a malformed plan cannot turn into unbounded work. */
export const MAX_STEPS_PER_RUN = 12
export const DEFAULT_STEP_TIMEOUT_MS = 25_000
export const DEFAULT_RUN_TIMEOUT_MS = 120_000

export type StepOutcome = {
  status: "completed" | "failed" | "skipped"
  /** References to stored artefacts — never the artefact content itself. */
  outputReference?: Record<string, unknown>
  errorCode?: AgentRunErrorCode
}

export type StepContext = {
  plan: RunExecutionPlan
  step: RunStepDescriptor
  attempt: number
  /** Aborted when the step deadline elapses; a runner must honour it. */
  signal: AbortSignal
}

export type StepRunner = (context: StepContext) => Promise<StepOutcome>

export type ExecutedStep = {
  step: RunStepDescriptor
  attempt: number
  status: StepOutcome["status"] | "aborted"
  outputReference: Record<string, unknown>
  errorCode: AgentRunErrorCode | null
  durationMs: number
}

export type RunOutcome = {
  /** `paused` and `cancelled` mean the run stopped early but is not a failure. */
  status: Extract<AgentRunStatus, "completed" | "failed" | "paused" | "cancelled" | "awaiting_approval">
  steps: ExecutedStep[]
  errorCode: AgentRunErrorCode | null
  durationMs: number
}

export type ExecutePlanOptions = {
  /** Re-read before each step. Lets a cancel or pause take effect promptly. */
  shouldAbort?: () => Promise<"cancel" | "pause" | null>
  stepTimeoutMs?: number
  runTimeoutMs?: number
  now?: () => number
  /** Called as each step finishes, so a caller can persist progress incrementally. */
  onStep?: (executed: ExecutedStep) => Promise<void>
}

/**
 * Runs one step under a deadline.
 *
 * The timer is always cleared, so a fast step does not leave a pending timer that
 * would keep a serverless invocation alive. A runner that ignores its signal
 * still cannot hold the run: the race resolves on the deadline either way, which
 * is why the timeout is enforced here rather than trusted to the runner.
 */
async function runStepWithTimeout(
  runner: StepRunner,
  context: Omit<StepContext, "signal">,
  timeoutMs: number,
): Promise<{ outcome: StepOutcome; timedOut: boolean }> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ outcome: StepOutcome; timedOut: boolean }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve({ outcome: { status: "failed", errorCode: "EXECUTION_TIMEOUT" }, timedOut: true })
    }, timeoutMs)
  })

  try {
    const work = runner({ ...context, signal: controller.signal }).then((outcome) => ({
      outcome,
      timedOut: false,
    }))
    return await Promise.race([work, timeout])
  } catch (error) {
    // A thrown runner is a failed step, never a thrown executor: the run must
    // still be recorded so the failure is visible.
    const code: AgentRunErrorCode =
      error instanceof Error && error.name === "AbortError" ? "EXECUTION_TIMEOUT" : "STEP_OPERATION_FAILED"
    return { outcome: { status: "failed", errorCode: code }, timedOut: false }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Executes a plan's steps in order, stopping at the first failure so a later step
 * never runs on the output of a step that did not succeed.
 */
export async function executePlan(
  plan: RunExecutionPlan,
  runner: StepRunner,
  options: ExecutePlanOptions = {},
): Promise<RunOutcome> {
  const now = options.now ?? (() => Date.now())
  const stepTimeoutMs = options.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS
  const runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS
  const startedAt = now()

  const executed: ExecutedStep[] = []
  const steps = plan.steps.slice(0, MAX_STEPS_PER_RUN)

  const finish = (
    status: RunOutcome["status"],
    errorCode: AgentRunErrorCode | null,
  ): RunOutcome => ({
    status,
    steps: executed,
    errorCode,
    durationMs: now() - startedAt,
  })

  for (const step of steps) {
    // A pause or cancellation between steps stops the run without touching the
    // in-flight step, so no partially-applied step is ever recorded as complete.
    if (options.shouldAbort) {
      const verdict = await options.shouldAbort()
      if (verdict === "cancel") return finish("cancelled", null)
      if (verdict === "pause") return finish("paused", null)
    }

    if (now() - startedAt > runTimeoutMs) {
      return finish("failed", "EXECUTION_TIMEOUT")
    }

    const attempt = 1
    const stepStartedAt = now()
    const { outcome, timedOut } = await runStepWithTimeout(
      runner,
      { plan, step, attempt },
      stepTimeoutMs,
    )
    const record: ExecutedStep = {
      step,
      attempt,
      status: timedOut ? "aborted" : outcome.status,
      outputReference: outcome.outputReference ?? {},
      errorCode: outcome.errorCode ?? null,
      durationMs: now() - stepStartedAt,
    }
    executed.push(record)
    if (options.onStep) await options.onStep(record)

    if (record.status === "failed" || record.status === "aborted") {
      return finish("failed", record.errorCode ?? "STEP_OPERATION_FAILED")
    }
  }

  return finish("completed", null)
}

/**
 * Whether a run in this status may be executed by the dispatcher. Kept next to
 * the executor so "who may run" and "how it runs" cannot drift apart.
 */
export function isRunnableStatus(status: AgentRunStatus): boolean {
  return status === "queued" || status === "running"
}

export function isTerminal(status: AgentRunStatus): boolean {
  return isTerminalRunStatus(status)
}
