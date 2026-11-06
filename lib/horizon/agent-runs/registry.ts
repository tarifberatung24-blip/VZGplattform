/**
 * HORIZON Agent Runs Engine — execution registry.
 *
 * This is the seam between the engine and Alpha Team. It does not add agents,
 * routing or skills: it *reads* the existing Conductor (`lib/horizon/agent/team.ts`)
 * and the registered SOP contracts (`lib/horizon/agent/skills.ts`), and turns the
 * Conductor's plan into the bounded list of steps the engine will execute.
 *
 * Two invariants are enforced here, at the boundary, rather than being trusted
 * further in:
 *
 * 1. Every step's operation must be one the safety policy already names
 *    (`HORIZON_AGENT_OPERATIONS`). An unknown operation is refused, so the engine
 *    can never invent a capability.
 * 2. Every step's operation must be *allowed* by
 *    `evaluateHorizonAgentOperation`. A step that would need human review or
 *    customer approval is not silently dropped — it is marked as a blocker, which
 *    is what moves the run to `awaiting_approval` instead of executing.
 */

import {
  evaluateHorizonAgentOperation,
  HORIZON_AGENT_OPERATIONS,
  type HorizonAgentOperation,
} from "../agent/safety"
import { getAlphaSkillContracts } from "../agent/skills"
import { listAlphaAgents, planAlphaTask, type AlphaTaskPlan } from "../agent/team"
import { MAX_OBJECTIVE_LENGTH, type RunStepDescriptor } from "./contract"

/** The plan plus the execution decision the engine needs. */
export type PlannedRun = {
  plan: AlphaTaskPlan
  steps: RunStepDescriptor[]
  /** True when at least one step is gated on human review or customer approval. */
  approvalRequired: boolean
  /** Safe, non-content codes describing why execution is held. */
  blockers: string[]
  skillVersion: string
}

function isHorizonAgentOperation(value: string): value is HorizonAgentOperation {
  return (HORIZON_AGENT_OPERATIONS as readonly string[]).includes(value)
}

/**
 * Operations that are an approval requirement rather than work the engine may
 * perform. `request_human_review` is allowed by the safety policy, but running it
 * as a *step* would mean the engine executing the review gate instead of stopping
 * at it. It is therefore reported as an approval signal, which is what moves the
 * run to `awaiting_approval`.
 */
const APPROVAL_ONLY_OPERATIONS = ["request_human_review"] as const

function isApprovalOnly(operation: string): boolean {
  return (APPROVAL_ONLY_OPERATIONS as readonly string[]).includes(operation)
}

/**
 * The steps a Conductor plan implies, in order.
 *
 * The lead agent's operations are mapped to steps in their declared order, then
 * the supporting agents' operations, so the quality gate's provenance work runs
 * after the drafting. `request_human_review` is deliberately *not* emitted as an
 * executable step: it is an approval requirement, not work the engine may
 * perform, so it is reported as a blocker instead.
 */
function stepsForPlan(plan: AlphaTaskPlan): { steps: RunStepDescriptor[]; blocked: string[] } {
  const steps: RunStepDescriptor[] = []
  const blocked: string[] = []
  const seen = new Set<string>()

  const push = (agentId: string, operation: string) => {
    const stepKey = `${agentId}:${operation}`
    if (seen.has(stepKey)) return
    seen.add(stepKey)
    if (!isHorizonAgentOperation(operation)) {
      blocked.push(`UNKNOWN_OPERATION:${operation}`)
      return
    }
    const decision = evaluateHorizonAgentOperation({ operation })
    if (!decision.allowed || isApprovalOnly(operation)) {
      // The engine does not run approval-gated or forbidden operations. It records
      // the requirement and lets the run stop at `awaiting_approval`.
      blocked.push(decision.allowed ? "HUMAN_REVIEW_REQUIRED" : decision.reason)
      return
    }
    steps.push({ stepKey, agentId, operation })
  }

  for (const operation of plan.leadAgent.operations) push(plan.leadAgent.id, operation)
  for (const agent of plan.supportingAgents) {
    for (const operation of agent.operations) push(agent.id, operation)
  }

  return { steps, blocked }
}

/**
 * Builds the execution decision for one task request.
 *
 * Throws only for a genuinely invalid request (missing or oversized objective),
 * matching `planAlphaTask`. Everything else is expressed as blockers so the run
 * can still be persisted and inspected.
 */
export function planRun(input: {
  objective: string
  caseId?: string | null
  documentIds?: string[]
  locale?: "bg" | "de"
  contextValidated: boolean
}): PlannedRun {
  const objective = input.objective.trim()
  if (!objective) throw new Error("OBJECTIVE_REQUIRED")
  if (objective.length > MAX_OBJECTIVE_LENGTH) throw new Error("OBJECTIVE_TOO_LONG")

  const plan = planAlphaTask({
    objective,
    caseId: input.caseId ?? undefined,
    documentIds: input.documentIds,
    locale: input.locale,
    contextValidated: input.contextValidated,
  })

  const { steps, blocked } = stepsForPlan(plan)
  const blockers = [...plan.blockers, ...blocked]

  const contracts = getAlphaSkillContracts([plan.leadAgent, ...plan.supportingAgents])
  const leadContract = contracts.find((contract) => contract.agentId === plan.leadAgent.id)

  return {
    plan,
    steps,
    // The Conductor already requires approval for every plan; a blocker or a
    // gated operation makes that requirement concrete rather than advisory.
    approvalRequired: plan.approvalRequired || blocked.length > 0,
    blockers,
    skillVersion: leadContract?.version ?? "unknown",
  }
}

/**
 * Verifies that every agent referenced by a plan is registered with a SOP
 * contract. Called before a run is persisted so an unregistered agent can never
 * reach execution.
 */
export function assertRegisteredAgents(agentIds: readonly string[]): void {
  const registered = new Set(listAlphaAgents().map((agent) => agent.id))
  for (const id of agentIds) {
    if (!registered.has(id)) throw new Error(`AGENT_NOT_REGISTERED:${id}`)
  }
}
