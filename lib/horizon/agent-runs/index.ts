/**
 * HORIZON Agent Runs Engine.
 *
 * Durable execution for Alpha Team tasks: run and step persistence, bounded
 * retries, crash recovery and an owner-scoped event outbox. The engine schedules
 * and records; it never decides, approves, signs or sends — those stay with the
 * existing Conductor, safety policy, approval and action mechanisms.
 *
 * `createAgentRunService` is the entry point for a request-scoped caller; it
 * returns `service: null` without a session so an unauthenticated engine cannot
 * be operated by accident.
 */

export { AGENT_RUN_ENGINE_VERSION } from "./contract"
export type {
  AgentRun,
  AgentRunEvent,
  AgentRunEventType,
  AgentRunStatus,
  AgentStep,
  AgentStepStatus,
  RunReference,
  RunStepDescriptor,
} from "./contract"
export { AgentRunRepository } from "./repository"
export { AgentRunService, createAgentRunService, type AgentRunsContext } from "./service"
export { createDispatcher, createOwnerDispatcher, type DispatchSummary } from "./dispatcher"
export { planRun, assertRegisteredAgents, type PlannedRun } from "./registry"
export { executePlan, MAX_STEPS_PER_RUN, type StepRunner, type StepOutcome } from "./executor"
export { createAssistantStepRunner } from "./assistant"
export { deriveRunIdempotencyKey, deriveEventIdempotencyKey } from "./idempotency"
export {
  canTransitionRun,
  canTransitionStep,
  allowedRunTransitions,
  allowedStepTransitions,
  backoffMs,
  shouldRetry,
  eventAppliesToRun,
} from "./lifecycle"
export { safeErrorMessage, type AgentRunErrorCode } from "./errors"
