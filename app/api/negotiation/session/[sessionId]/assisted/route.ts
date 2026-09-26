import { NextResponse } from "next/server"
import { z } from "zod"
import { applyTransition } from "@/lib/horizon/negotiation/timeline"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import { emptyPackage } from "@/lib/horizon/negotiation/execution"
import {
  ASSISTED_HANDOFF_REFUSED_CODE,
  buildAssistedHandoff,
  buildAssistedQueuePayload,
  canHandOffToOperator,
  canTransitionAssistedRequest,
  isActiveAssistedRequest,
} from "@/lib/horizon/negotiation/assisted"
import type { NegotiationDossier } from "@/lib/horizon/negotiation/dossier"
import {
  deliverToAutomation,
  newAutomationRequestId,
  resolveAutomationTransport,
} from "@/lib/horizon/automation/transport"
import { ensureHousehold } from "@/lib/supabase/household"
import { createClient } from "@/lib/supabase/server"
import {
  isFailure,
  requireEngine,
  requireOwnedSession,
  upstreamFailed,
  validationFailed,
} from "@/lib/horizon/negotiation/route-support"

const schema = z.object({ locale: z.enum(["bg", "de"]).default("de") }).strict()

/**
 * Hands a prepared negotiation to the VZG operator queue (MODE B).
 *
 * Two guards run before anything leaves the process. First, a granted
 * representation authorization is mandatory: without one there is no assisted
 * handoff, and the request is refused with the specific code rather than a
 * generic failure. Second, the payload is redacted and scanned, so a
 * credential-shaped field cannot reach the operator queue.
 *
 * The operator queue is a separate concern from the negotiation lifecycle, so a
 * handoff advances `mode_b_status`, not `state`. The lifecycle only moves when the
 * session is in AUTHORIZATION and the authorization was just granted, which is the
 * same edge the authorization route uses.
 *
 * Sending is an explicit user action — the customer pressing the handoff — so it
 * satisfies the "never send without explicit action or granted authorization"
 * rule on both counts.
 */
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const authorization = await engine.repository!.getGrantedAuthorization(sessionId)
    if (authorization.error) return upstreamFailed(authorization.error).response

    // The granted authorization *row* is the evidence: it carries the scope the
    // customer actually agreed to. The session column is a denormalised mirror,
    // so both must agree before anything is handed off. Gating on the column alone
    // would let a drifted mirror queue work no row authorises.
    if (
      !authorization.data ||
      !canHandOffToOperator({ authorizationStatus: session.authorization_status })
    ) {
      return NextResponse.json({ code: ASSISTED_HANDOFF_REFUSED_CODE }, { status: 409 })
    }

    const transport = resolveAutomationTransport()
    if (!transport) {
      return NextResponse.json({ code: "NEGOTIATION_ASSISTED_QUEUE_NOT_CONFIGURED" }, { status: 503 })
    }

    const analysis = (session.analysis ?? {}) as Record<string, unknown>
    const dossier = (analysis.dossier ?? null) as NegotiationDossier | null
    const negotiationPackage =
      (analysis.package as ReturnType<typeof emptyPackage> | undefined) ?? emptyPackage("ASSISTED")

    const handoff = buildAssistedHandoff({
      sessionId,
      category: session.category,
      state: session.state,
      decisionAction: session.decision_action,
      reasonCodes: session.reason_codes,
      missingInformation: session.missing_information,
      currentMonthlyCost: session.current_monthly_cost,
      targetMonthlyCost: session.target_monthly_cost,
      promotionExpiry: session.promotion_expiry,
      authorizationStatus: session.authorization_status,
      dossier,
      negotiationPackage,
    })

    // A handoff already in flight is the same logical request. Reusing its id makes
    // a double-submit (or a retry) idempotent for a receiver that deduplicates on
    // `requestId`, instead of queuing the same negotiation twice. Only a terminal
    // request allows a genuinely new one.
    const active = isActiveAssistedRequest({
      requestId: session.mode_b_request_id,
      status: session.mode_b_status,
    })
    const requestId = active ? session.mode_b_request_id! : newAutomationRequestId()
    const receivedAt = new Date().toISOString()
    const payload = buildAssistedQueuePayload({
      requestId,
      locale: parsed.data.locale,
      handoff,
      receivedAt,
    })

    const delivery = await deliverToAutomation({ config: transport, payload, requestId })
    if (!delivery.ok) {
      return NextResponse.json({ code: "NEGOTIATION_ASSISTED_QUEUE_FAILED" }, { status: 502 })
    }

    const queued = await engine.repository!.queueAssistedHandoff({ sessionId, requestId })
    if (queued.error) return upstreamFailed(queued.error).response

    // Move the lifecycle only along the declared edge; an already-negotiating
    // session keeps its state.
    let state = session.state
    const applied = applyTransition(state, "start_negotiation")
    if (applied && session.state === "AUTHORIZATION") {
      state = applied.state
      await engine.repository!.appendEvents(sessionId, applied.events)
      await engine.repository!.updateSession(sessionId, { state })
    }

    const supabase = await createClient()
    await writeNegotiationAudit(supabase, {
      householdId: await ensureHousehold(supabase),
      actorUserId: engine.userId!,
      sessionId,
      eventType: "negotiation.assisted_handoff_queued",
      summary: "Assisted negotiation handed to the operator queue",
      metadata: { request_id: requestId, category: session.category, state },
    })

    return NextResponse.json({ status: "QUEUED", requestId, state }, { status: 202 })
  } catch {
    return upstreamFailed("NEGOTIATION_ASSISTED_HANDOFF_FAILED").response
  }
}

const cancelSchema = z.object({ status: z.literal("CANCELLED") }).strict()

/**
 * Cancels a queued or in-flight assisted request. This is the one operator-queue
 * transition the customer owns: the platform does not let a customer mark work
 * COMPLETED, and a terminal request cannot be reopened. An operator-driven
 * transition arrives through the service-role path, not this session client.
 */
export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  try {
    const parsed = cancelSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    if (!session.mode_b_status) {
      return NextResponse.json({ code: "NEGOTIATION_ASSISTED_NOT_QUEUED" }, { status: 409 })
    }
    if (!canTransitionAssistedRequest(session.mode_b_status, "CANCELLED")) {
      return NextResponse.json(
        { code: "NEGOTIATION_ASSISTED_INVALID_TRANSITION", from: session.mode_b_status },
        { status: 409 },
      )
    }

    const updated = await engine.repository!.updateAssistedStatus({
      sessionId,
      status: "CANCELLED",
    })
    if (updated.error) return upstreamFailed(updated.error).response

    const supabase = await createClient()
    await writeNegotiationAudit(supabase, {
      householdId: await ensureHousehold(supabase),
      actorUserId: engine.userId!,
      sessionId,
      eventType: "negotiation.assisted_handoff_cancelled",
      summary: "Assisted negotiation request cancelled by the customer",
      metadata: { request_id: session.mode_b_request_id, from: session.mode_b_status },
    })

    return NextResponse.json({ status: "CANCELLED" })
  } catch {
    return upstreamFailed("NEGOTIATION_ASSISTED_CANCEL_FAILED").response
  }
}
