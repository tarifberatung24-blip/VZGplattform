import { NextResponse } from "next/server"
import { z } from "zod"
import {
  CREDENTIAL_FIELD_REFUSED_CODE,
  findForbiddenFields,
} from "@/lib/horizon/negotiation/guard"
import { PREFERENCE_ITEMS } from "@/lib/horizon/negotiation/preferences"
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

const preferenceItem = z.enum(PREFERENCE_ITEMS)

const schema = z
  .object({
    mustKeep: z.array(preferenceItem).max(20).default([]),
    mayAccept: z.array(preferenceItem).max(20).default([]),
    mustNeverAccept: z.array(preferenceItem).max(20).default([]),
    maxContractExtensionMonths: z.number().int().min(0).max(120).nullable().default(null),
    allowPlanChange: z.boolean().default(false),
    allowAddons: z.boolean().default(false),
    allowOneTimeCredit: z.boolean().default(false),
    allowTemporaryDiscount: z.boolean().default(false),
    minMonthlySaving: z.number().min(0).max(10000).nullable().default(null),
  })
  .strict()

/**
 * Stores the user's negotiation constraints.
 *
 * The payload is scanned for credential-shaped fields before anything else: a
 * negotiation payload has no legitimate reason to carry a password, PIN or TAN,
 * so its presence is refused rather than stored and ignored.
 */
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  try {
    const body = await request.json()
    const forbidden = findForbiddenFields(body)
    if (forbidden.length > 0) {
      return NextResponse.json(
        { code: CREDENTIAL_FIELD_REFUSED_CODE, fields: forbidden },
        { status: 400 },
      )
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const saved = await engine.repository!.savePreferences(sessionId, {
      ...parsed.data,
      provenance: { source: "user", setAt: new Date().toISOString(), formVersion: "v1" },
    })
    if (saved.error) return upstreamFailed(saved.error).response

    // Preferences are part of the strategy step; record that the strategy was
    // (re)built so the timeline shows when the constraints were set.
    const applied = applyTransition(session.state, "create_strategy")
    if (applied) {
      await engine.repository!.updateSession(sessionId, { state: applied.state })
      await engine.repository!.appendEvents(sessionId, applied.events)
    }

    const supabase = await createClient()
    const householdId = await ensureHousehold(supabase)
    await writeNegotiationAudit(supabase, {
      householdId,
      actorUserId: engine.userId!,
      sessionId,
      eventType: "negotiation.preferences_saved",
      summary: "Negotiation preferences saved",
      metadata: {
        must_keep: parsed.data.mustKeep,
        must_never_accept: parsed.data.mustNeverAccept,
        min_monthly_saving: parsed.data.minMonthlySaving,
      },
    })

    return NextResponse.json({ saved: true })
  } catch {
    return upstreamFailed("NEGOTIATION_PREFERENCES_SAVE_FAILED").response
  }
}
