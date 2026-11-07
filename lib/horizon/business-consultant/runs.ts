import "server-only"
import { createAgentRunService } from "../agent-runs/service"
import { fail, ok, type ConsultantResult } from "./contract"
import { resolveSpecialist, specialistObjective, specialistReferences, type BusinessSpecialistId } from "./specialists"

/**
 * HORIZON Business Consultant → Agent Runs Engine bridge.
 *
 * There is no second execution engine here. A specialist run is created through
 * the merged Agent Runs Engine (`lib/horizon/agent-runs`), which already owns
 * durable execution, retries, worker recovery, the approval gate and the audit
 * trail. This module only translates a business request into the engine's
 * `CreateRunRequest`:
 *
 *   - the specialist is resolved against the Alpha Team registry and the safety
 *     gate first, so an unknown specialist or an operation outside its SOP is
 *     refused before a run exists;
 *   - the objective and references are built from *validated* ids only;
 *   - ownership of the case and documents is proven by the engine itself
 *     (`createRun` loads the case context and refuses a foreign case or document).
 *
 * A run that requires approval is still created — it is what the operator sees —
 * but the engine stops at `awaiting_approval` instead of executing. Nothing here
 * can send, sign, submit or pay: those operations are refused by the safety gate.
 */
export type SpecialistRunResult = {
  runId: string
  traceId: string
  /** True when an identical request already produced this run. */
  duplicate: boolean
}

export async function launchSpecialistRun(input: {
  specialist: BusinessSpecialistId
  businessName: string
  caseId?: string | null
  documentIds?: string[]
  locale?: "bg" | "de"
  /** Stable per business action, so a repeated click returns the same run. */
  idempotencyKey?: string
}): Promise<ConsultantResult<SpecialistRunResult>> {
  const resolved = resolveSpecialist(input.specialist)
  if (resolved.error || !resolved.data) {
    return fail(resolved.error ?? "UNKNOWN_SPECIALIST", resolved.code ?? "UNKNOWN_SPECIALIST")
  }

  const { service, userId, configured, schemaReady } = await createAgentRunService()
  if (!configured) return fail("ENGINE_NOT_CONFIGURED", "ENGINE_NOT_CONFIGURED")
  if (!userId || !service) return fail("AUTHENTICATION_REQUIRED", "AUTHENTICATION_REQUIRED")
  if (!schemaReady) return fail("AGENT_RUNS_SCHEMA_NOT_READY", "AGENT_RUNS_SCHEMA_NOT_READY")

  // The objective names the specialist so the operator can see which role ran; the
  // references are the ids the engine will re-validate against the caller's own
  // rows. `specialistReferences` is a pure builder and adds nothing else.
  const created = await service.createRun({
    objective: specialistObjective({ specialist: resolved.data.id, businessName: input.businessName }),
    caseId: input.caseId ?? null,
    documentIds: input.documentIds,
    locale: input.locale,
    idempotencyKey: input.idempotencyKey,
  })
  if (created.error || !created.data) {
    return fail(created.error ?? "RUN_CREATE_FAILED", created.code ?? "RUN_CREATE_FAILED")
  }

  return ok({
    runId: created.data.run.id,
    traceId: created.data.run.traceId,
    duplicate: created.data.duplicate,
  })
}

/**
 * The references a specialist run should carry. Exposed so a caller can show the
 * operator exactly what the run will read, without creating a run to find out.
 */
export function specialistRunReferences(input: { profileId: string; documentIds?: string[] }) {
  return specialistReferences(input)
}
