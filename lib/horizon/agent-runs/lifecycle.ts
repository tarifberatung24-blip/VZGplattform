/**
 * HORIZON Agent Runs Engine — run and step lifecycle.
 *
 * Pure and total, like `lib/horizon/case/lifecycle.ts`. The database CHECK
 * constraints are the last line of defence; this table is the declared behaviour
 * that tests pin down. Every transition is explicit, so a status can never be
 * written from an arbitrary place — the repository asks this module first.
 */

import {
  type AgentRunStatus,
  type AgentStepStatus,
  isTerminalRunStatus,
  isTerminalStepStatus,
} from "./contract"

/**
 * Allowed run transitions.
 *
 * Notes that matter for correctness:
 * - `failed` is retryable, not terminal: a failed run may be re-queued while
 *   attempts remain, and only becomes `dead_letter` when they are exhausted.
 * - `paused` and `awaiting_approval` are the two human-in-the-loop states. They
 *   are reachable from `queued`/`running` and return to `running`.
 * - Nothing transitions out of a terminal status. A retry of a completed run is
 *   refused rather than silently re-run, which is what stops duplicate work.
 */
const RUN_TRANSITIONS: Record<AgentRunStatus, readonly AgentRunStatus[]> = {
  queued: ["running", "paused", "cancelled", "failed", "dead_letter"],
  running: ["completed", "failed", "paused", "awaiting_approval", "cancelled", "dead_letter"],
  paused: ["running", "cancelled", "failed"],
  awaiting_approval: ["running", "completed", "cancelled", "failed"],
  failed: ["queued", "running", "dead_letter", "cancelled"],
  completed: [],
  cancelled: [],
  dead_letter: [],
}

const STEP_TRANSITIONS: Record<AgentStepStatus, readonly AgentStepStatus[]> = {
  pending: ["running", "skipped", "failed", "dead_letter"],
  running: ["completed", "failed", "dead_letter"],
  failed: ["running", "dead_letter"],
  completed: [],
  skipped: [],
  dead_letter: [],
}

export function canTransitionRun(from: AgentRunStatus, to: AgentRunStatus): boolean {
  if (from === to) return false
  return RUN_TRANSITIONS[from].includes(to)
}

export function canTransitionStep(from: AgentStepStatus, to: AgentStepStatus): boolean {
  if (from === to) return false
  return STEP_TRANSITIONS[from].includes(to)
}

export function allowedRunTransitions(from: AgentRunStatus): readonly AgentRunStatus[] {
  return RUN_TRANSITIONS[from]
}

export function allowedStepTransitions(from: AgentStepStatus): readonly AgentStepStatus[] {
  return STEP_TRANSITIONS[from]
}

/**
 * Terminal statuses are declared in one place. This re-export exists so a caller
 * does not have to know which module owns the list.
 */
export function isRunTerminal(status: AgentRunStatus): boolean {
  return isTerminalRunStatus(status)
}

export function isStepTerminal(status: AgentStepStatus): boolean {
  return isTerminalStepStatus(status)
}

/**
 * Exponential backoff, bounded. The exponent is clamped before the shift so a
 * large attempt count cannot produce `Infinity`, and the result is clamped to
 * `maxMs` so a stuck row cannot be scheduled arbitrarily far into the future.
 */
export function backoffMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number } = {},
): number {
  const baseMs = options.baseMs ?? 30_000
  const maxMs = options.maxMs ?? 30 * 60_000
  const exponent = Math.min(Math.max(Math.trunc(attempt), 0), 10)
  return Math.min(baseMs * 2 ** exponent, maxMs)
}

/**
 * Whether a failure at this attempt should be retried.
 *
 * `maxAttempts` counts total attempts, so an attempt index at or above the limit
 * is exhausted. A value below 1 is treated as exhausted rather than as "unlimited",
 * because an unlimited retry loop is exactly what the brief forbids.
 */
export function shouldRetry(attempt: number, maxAttempts: number): boolean {
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1) return false
  return attempt < maxAttempts
}

/**
 * The run status an event type implies, or `null` when the event does not move
 * the run. Mirrors the case engine's rule that a caller says *what happened* and
 * the engine decides the resulting state.
 */
export function runStatusForEvent(eventType: string): AgentRunStatus | null {
  switch (eventType) {
    case "USER_APPROVAL_GRANTED":
      return "running"
    case "USER_APPROVAL_REJECTED":
      return "cancelled"
    case "DEADLINE_APPROACHING":
      return "running"
    default:
      return null
  }
}

/**
 * Whether an event type may be accepted for a run in this status. An event that
 * arrives for a terminal run is refused rather than recorded as work, so a late
 * delivery cannot resurrect finished or cancelled work.
 */
export function eventAppliesToRun(eventType: string, status: AgentRunStatus): boolean {
  const target = runStatusForEvent(eventType)
  if (!target) return !isTerminalRunStatus(status)
  return canTransitionRun(status, target)
}
