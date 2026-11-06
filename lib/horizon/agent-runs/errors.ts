/**
 * HORIZON Agent Runs Engine — safe error reporting.
 *
 * An agent failure must never leak document content, a prompt, a stack trace or a
 * credential into a stored row, a log line or an API response. Every failure is
 * therefore reduced to a stable machine code plus a short, generic message. The
 * original error is deliberately *not* stored: `error_message_safe` is a
 * classified summary, not a stringified exception.
 */

export const AGENT_RUN_ERROR_CODES = [
  "AUTHENTICATION_REQUIRED",
  "RUN_NOT_FOUND",
  "CASE_NOT_FOUND",
  "DOCUMENT_NOT_FOUND",
  "OWNERSHIP_MISMATCH",
  "INVALID_RUN_REQUEST",
  "INVALID_EVENT",
  "EVENT_NOT_APPLICABLE",
  "RUN_NOT_RETRYABLE",
  "RUN_TERMINAL",
  "SAFETY_POLICY_DENIED",
  "STEP_OPERATION_FAILED",
  "EXECUTION_TIMEOUT",
  "DISPATCH_FAILED",
  "ENGINE_NOT_CONFIGURED",
  "ENGINE_UNAVAILABLE",
  "WORKER_VISIBILITY_TIMEOUT",
  "ATTEMPTS_EXHAUSTED",
] as const

export type AgentRunErrorCode = (typeof AGENT_RUN_ERROR_CODES)[number]

/**
 * Generic, non-sensitive message per code. These are the only messages that may
 * reach `error_message_safe`, a log line or an API response. None of them
 * includes a caller-supplied string, so a hostile objective or document name
 * cannot be reflected into storage or a response body.
 */
const SAFE_MESSAGES: Record<AgentRunErrorCode, string> = {
  AUTHENTICATION_REQUIRED: "Authentication is required.",
  RUN_NOT_FOUND: "The run was not found.",
  CASE_NOT_FOUND: "The case was not found.",
  DOCUMENT_NOT_FOUND: "The document was not found.",
  OWNERSHIP_MISMATCH: "The resource does not belong to the caller.",
  INVALID_RUN_REQUEST: "The run request is invalid.",
  INVALID_EVENT: "The event is invalid.",
  EVENT_NOT_APPLICABLE: "The event does not apply to the run's current state.",
  RUN_NOT_RETRYABLE: "The run cannot be retried in its current state.",
  RUN_TERMINAL: "The run has already reached a terminal state.",
  SAFETY_POLICY_DENIED: "The agent safety policy denied the operation.",
  STEP_OPERATION_FAILED: "A run step failed.",
  EXECUTION_TIMEOUT: "The run exceeded its execution deadline.",
  DISPATCH_FAILED: "The dispatcher could not process the work item.",
  ENGINE_NOT_CONFIGURED: "The agent runs engine is not configured.",
  ENGINE_UNAVAILABLE: "The agent runs engine is temporarily unavailable.",
  WORKER_VISIBILITY_TIMEOUT: "A worker did not finish the claim in time.",
  ATTEMPTS_EXHAUSTED: "The run exhausted its retry attempts.",
}

export function isAgentRunErrorCode(value: unknown): value is AgentRunErrorCode {
  return typeof value === "string" && (AGENT_RUN_ERROR_CODES as readonly string[]).includes(value)
}

export function safeErrorMessage(code: AgentRunErrorCode): string {
  return SAFE_MESSAGES[code]
}

/**
 * Maps an arbitrary thrown value or a database error code onto a safe code.
 *
 * A Postgres unique-violation (`23505`) is a duplicate, not a failure of the
 * engine, and is reported as such so callers can treat it as "already done"
 * rather than as an error. Anything unrecognised collapses to a generic code —
 * the raw message is intentionally discarded rather than passed through.
 */
export function classifyError(error: unknown): AgentRunErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code
    if (code === "23505") return "INVALID_RUN_REQUEST"
    if (code === "42501") return "OWNERSHIP_MISMATCH"
  }
  if (error instanceof Error && isAgentRunErrorCode(error.message)) {
    return error.message
  }
  return "STEP_OPERATION_FAILED"
}

/**
 * The structured log shape for the engine. Stable ids only — never an objective,
 * a document name, a prompt or a credential. `traceId` ties the line to the run
 * and to the canonical `audit_events` entry for the same transition.
 */
export type AgentRunLogEvent = {
  event: string
  runId: string | null
  traceId: string | null
  caseId: string | null
  stepKey: string | null
  ownerId: string | null
  status: string | null
  attempt: number | null
  errorCode: AgentRunErrorCode | null
  durationMs: number | null
}

export function agentRunLog(event: AgentRunLogEvent): string {
  return JSON.stringify(event)
}
