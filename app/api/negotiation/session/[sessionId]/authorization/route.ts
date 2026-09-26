import { NextResponse } from "next/server"
import { z } from "zod"
import { applyTransition } from "@/lib/horizon/negotiation/timeline"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import { ensureHousehold } from "@/lib/supabase/household"
import { createClient } from "@/lib/supabase/server"
import {
  isFailure,
  requireEngine,
  requireOwnedSession,
  upstreamFailed,
  validationFailed,
} from "@/lib/horizon/negotiation/route-support"

const schema = z
  .object({
    scope: z.string().trim().min(1).max(500),
    documentId: z.string().uuid().nullable().default(null),
    /** Whether the user has actually signed/uploaded the representation document. */
    granted: z.boolean().default(false),
  })
  .strict()

/**
 * Records a representation authorization for assisted mode.
 *
 * A generic Vollmacht is not accepted by every provider, so this stores the scope
 * the user agreed to and whether it has been granted; it does not assert that any
 * provider will honour it. The session moves to NEGOTIATION only on a granted
 * authorization, and the authorization event is emitted only then.
 */
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const created = await engine.repository!.addAuthorization({
      sessionId,
      scope: parsed.data.scope,
      documentId: parsed.data.documentId,
    })
    if (created.error || !created.data) {
      return upstreamFailed("NEGOTIATION_AUTHORIZATION_CREATE_FAILED").response
    }

    if (!parsed.data.granted) {
      await engine.repository!.updateSession(sessionId, { authorization_status: "pending" })
      const pendingSupabase = await createClient()
      await writeNegotiationAudit(pendingSupabase, {
        householdId: await ensureHousehold(pendingSupabase),
        actorUserId: engine.userId!,
        sessionId,
        eventType: "negotiation.authorization_requested",
        summary: "Representation authorization recorded as pending",
        metadata: { scope: parsed.data.scope, granted: false },
      })
      return NextResponse.json({ status: "pending" }, { status: 201 })
    }

    const updated = await engine.repository!.updateAuthorization({
      sessionId,
      authorizationId: created.data.id,
      status: "granted",
    })
    if (updated.error) return upstreamFailed(updated.error).response

    let state = session.state
    const grantedTransition = applyTransition(state, "grant_authorization")
    if (grantedTransition) {
      state = grantedTransition.state
      await engine.repository!.appendEvents(sessionId, grantedTransition.events)
    }
    await engine.repository!.updateSession(sessionId, {
      state,
      authorization_status: "granted",
      execution_mode: "ASSISTED",
    })

    const supabase = await createClient()
    await writeNegotiationAudit(supabase, {
      householdId: await ensureHousehold(supabase),
      actorUserId: engine.userId!,
      sessionId,
      eventType: "negotiation.authorization_granted",
      summary: "Representation authorization granted",
      metadata: { scope: parsed.data.scope, state },
    })

    return NextResponse.json({ status: "granted", state }, { status: 201 })
  } catch {
    return upstreamFailed("NEGOTIATION_AUTHORIZATION_FAILED").response
  }
}
