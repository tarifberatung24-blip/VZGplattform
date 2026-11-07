import "server-only"
import type { BusinessConsultantService } from "./service"
import { ensureBusinessCase } from "./case-provisioning"
import { launchSpecialistRun, type SpecialistRunResult } from "./runs"
import { fail, type ConsultantResult } from "./contract"
import type { BusinessSpecialistId } from "./specialists"

/**
 * HORIZON Business Consultant — specialist run launcher.
 *
 * This is the live producer that was missing: nothing called `launchSpecialistRun`
 * outside its own tests, so the Agent Runs Engine and the Operator Run Console had
 * no work to show. This module wires the missing link end to end, in one place, so
 * the ordering is explicit and testable:
 *
 *   1. the owner's own profile is resolved (a run cannot be created for a business
 *      that does not exist);
 *   2. the canonical case for that profile is opened or reused
 *      (`ensureBusinessCase`), because a run without a case is skipped rather than
 *      answered from nothing;
 *   3. the specialist run is created through the merged Agent Runs Engine.
 *
 * The run is created `awaiting_approval` (every Conductor plan is), so this never
 * executes or spends: the operator approves it in the Run Console, and the bounded
 * dispatcher does the work. No model is called on this path.
 *
 * The session is resolved by the caller so the route can rate-limit per user
 * before this runs.
 */
export async function startSpecialistRun(input: {
  service: BusinessConsultantService
  specialist: BusinessSpecialistId
  focus?: string
  locale?: "bg" | "de"
  idempotencyKey?: string
}): Promise<ConsultantResult<SpecialistRunResult & { caseId: string }>> {
  const profile = await input.service.getProfile()
  if (profile.error) return fail(profile.error, profile.code ?? "PROFILE_READ_FAILED")
  if (!profile.data) return fail("PROFILE_REQUIRED", "PROFILE_REQUIRED")

  const locale = input.locale ?? "de"
  const provisioned = await ensureBusinessCase({
    profileId: profile.data.id,
    businessName: profile.data.business_name,
    locale,
  })
  if (provisioned.error || !provisioned.data) {
    return fail(provisioned.error ?? "CASE_PROVISION_FAILED", provisioned.code ?? "CASE_PROVISION_FAILED")
  }

  const launched = await launchSpecialistRun({
    specialist: input.specialist,
    businessName: profile.data.business_name,
    caseId: provisioned.data.caseId,
    locale,
    idempotencyKey: input.idempotencyKey,
  })
  if (launched.error || !launched.data) {
    return fail(launched.error ?? "RUN_CREATE_FAILED", launched.code ?? "RUN_CREATE_FAILED")
  }

  return { data: { ...launched.data, caseId: provisioned.data.caseId }, error: null, code: null }
}

