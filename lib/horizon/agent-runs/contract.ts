/**
 * HORIZON Agent Runs Engine — vocabulary and contracts.
 *
 * The engine owns durable execution only: run state, step state, queues, retries,
 * worker recovery and execution observability. It owns no case, document, fact,
 * draft or approval data — every run and step carries *references* to existing
 * HORIZON entities, so there is exactly one source of truth.
 *
 * Alpha Team remains the Conductor (`lib/horizon/agent/team.ts`) and specialist
 * agents keep their registered SOP contracts (`lib/horizon/agent/skills.ts`). The
 * engine schedules and records; it never decides, approves or sends.
 */

export const AGENT_RUN_ENGINE_VERSION = "agent-runs-v1" as const

export const AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "dead_letter",
] as const
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number]

export const AGENT_STEP_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
  "dead_letter",
] as const
export type AgentStepStatus = (typeof AGENT_STEP_STATUSES)[number]

export const AGENT_RUN_EVENT_TYPES = [
  "SERVICE_REQUEST_CREATED",
  "DOCUMENT_READY",
  "CASE_UPDATED",
  "DEADLINE_APPROACHING",
  "USER_APPROVAL_GRANTED",
  "USER_APPROVAL_REJECTED",
] as const
export type AgentRunEventType = (typeof AGENT_RUN_EVENT_TYPES)[number]

export const AGENT_RUN_EVENT_STATUSES = [
  "received",
  "processing",
  "processed",
  "dead_letter",
] as const
export type AgentRunEventStatus = (typeof AGENT_RUN_EVENT_STATUSES)[number]

/** Statuses from which no automatic progress happens again. */
export const TERMINAL_RUN_STATUSES = ["completed", "cancelled", "dead_letter"] as const
export const TERMINAL_STEP_STATUSES = ["completed", "skipped", "dead_letter"] as const

/**
 * The statuses a run waits in for a human decision. A run is only ever moved out
 * of one of these by an explicit approve/reject, so a decision can never be
 * replayed onto a run that is already executing or finished.
 */
export const AWAITING_DECISION_STATUSES = ["awaiting_approval", "paused"] as const

/**
 * `failed` is deliberately NOT terminal: it is the retryable state. A run reaches
 * `dead_letter` only when its bounded attempts are exhausted, so a terminal
 * failure is always visible and never silent.
 */
export function isTerminalRunStatus(status: AgentRunStatus): boolean {
  return (TERMINAL_RUN_STATUSES as readonly string[]).includes(status)
}

export function isTerminalStepStatus(status: AgentStepStatus): boolean {
  return (TERMINAL_STEP_STATUSES as readonly string[]).includes(status)
}

/** Bounded by the database CHECK constraints on both tables. */
export const DEFAULT_MAX_ATTEMPTS = 5
export const MAX_ATTEMPTS_LIMIT = 20
export const MAX_OBJECTIVE_LENGTH = 2000

/** Reference to an existing HORIZON entity. Never content, never a prompt. */
export const RUN_REFERENCE_KINDS = [
  "case",
  "document",
  "fact",
  "draft",
  "service_request",
  "assistant_message",
] as const

export type RunReferenceKind = (typeof RUN_REFERENCE_KINDS)[number]

export type RunReference = {
  kind: RunReferenceKind
  id: string
}

export type AgentRun = {
  id: string
  ownerId: string
  caseId: string | null
  serviceRequestId: string | null
  traceId: string
  status: AgentRunStatus
  objective: string
  leadAgent: string
  idempotencyKey: string
  promptVersion: string | null
  modelVersion: string | null
  skillVersion: string | null
  inputReferences: RunReference[]
  outputReferences: RunReference[]
  errorCode: string | null
  errorMessageSafe: string | null
  attempt: number
  maxAttempts: number
  nextAttemptAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AgentStep = {
  id: string
  runId: string
  ownerId: string
  stepKey: string
  agentId: string
  status: AgentStepStatus
  attempt: number
  inputReference: Record<string, unknown>
  outputReference: Record<string, unknown>
  errorCode: string | null
  errorMessageSafe: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AgentRunEvent = {
  id: string
  ownerId: string
  runId: string | null
  eventType: AgentRunEventType
  idempotencyKey: string
  payload: Record<string, unknown>
  status: AgentRunEventStatus
  attempt: number
  maxAttempts: number
  availableAt: string
  lastErrorCode: string | null
  processedAt: string | null
  createdAt: string
  updatedAt: string
}

/** One unit of bounded, deterministic work inside a run. */
export type RunStepDescriptor = {
  stepKey: string
  agentId: string
  /** Must be one of `HORIZON_AGENT_OPERATIONS`; the safety gate is applied to it. */
  operation: string
}

/**
 * The engine's own result type. Mirrors `RepoResult` in the case engine so the
 * two read the same way at a call site.
 */
export type EngineResult<T> = { data: T | null; error: string | null; code?: string | null }

export const ok = <T>(data: T): EngineResult<T> => ({ data, error: null, code: null })
export const fail = <T>(error: string, code?: string | null): EngineResult<T> => ({
  data: null,
  error,
  code: code ?? null,
})

/**
 * Everything the engine needs about a run in order to execute it. The executor
 * never reads a raw database row, so a change to storage cannot silently change
 * execution behaviour.
 */
export type RunExecutionPlan = {
  runId: string
  ownerId: string
  traceId: string
  caseId: string | null
  objective: string
  leadAgent: string
  steps: RunStepDescriptor[]
}
