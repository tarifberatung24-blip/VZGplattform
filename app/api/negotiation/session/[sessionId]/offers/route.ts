import { NextResponse } from "next/server"
import { z } from "zod"
import {
  CREDENTIAL_FIELD_REFUSED_CODE,
  findForbiddenFields,
} from "@/lib/horizon/negotiation/guard"
import { parseProviderOffer, OFFER_SOURCES } from "@/lib/horizon/negotiation/offer-parse"
import { buildContractFacts } from "@/lib/horizon/negotiation/facts"
import { buildOfferComparison } from "@/lib/horizon/negotiation/review"
import { emptyPreferences } from "@/lib/horizon/negotiation/preferences"
import { applyTransition } from "@/lib/horizon/negotiation/timeline"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import { loadOwnedContract, isFailure, requireEngine, requireOwnedSession, upstreamFailed, validationFailed } from "@/lib/horizon/negotiation/route-support"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const schema = z
  .object({
    origin: z.enum(["provider", "user_counter", "operator"]).default("provider"),
    source: z.enum(OFFER_SOURCES).default("user_paste"),
    /** Raw provider text. A document-backed offer sends its extracted text here. */
    text: z.string().trim().min(1).max(20000),
    documentId: z.string().uuid().nullable().default(null),
    /** The services the offer preserves, stated by the user when the text does not. */
    keptServices: z.array(z.string().trim().max(120)).max(20).default([]),
  })
  .strict()

/**
 * Records a provider response, parses it, and stores it as an offer.
 *
 * The parse is conservative, so `unrecognized` lines are returned to the user to
 * check rather than being silently discarded. The comparison is computed with the
 * deterministic savings engine, and the offer's content hash is derived inside the
 * repository from the exact stored content — that hash is what an approval later
 * binds to.
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
      return NextResponse.json({ code: CREDENTIAL_FIELD_REFUSED_CODE, fields: forbidden }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const supabase = await createClient()
    const householdId = await ensureHousehold(supabase)
    const contract = await loadOwnedContract(supabase, householdId, session.contract_id)
    if (!contract) return NextResponse.json({ code: "NEGOTIATION_CONTRACT_NOT_FOUND" }, { status: 404 })

    const parsedOffer = parseProviderOffer(parsed.data.text)
    const content = {
      origin: parsed.data.origin,
      source: parsed.data.source,
      text: parsed.data.text,
      terms: parsedOffer.terms,
    }

    const stored = await engine.repository!.addOffer({
      sessionId,
      origin: parsed.data.origin,
      source: parsed.data.source,
      documentId: parsed.data.documentId,
      content,
      terms: parsedOffer.terms,
    })
    if (stored.error || !stored.data) return upstreamFailed("NEGOTIATION_OFFER_SAVE_FAILED").response

    // Advance NEGOTIATION -> PROVIDER_RESPONSE -> USER_REVIEW when the session is
    // in a state that permits it. A counter-offer re-enters from NEGOTIATION.
    let state = session.state
    for (const transition of ["record_provider_response", "open_review"] as const) {
      const applied = applyTransition(state, transition)
      if (applied) {
        state = applied.state
        await engine.repository!.appendEvents(sessionId, applied.events)
      }
    }
    if (state !== session.state) await engine.repository!.updateSession(sessionId, { state })

    const facts = buildContractFacts(contract)
    const preferences = (await engine.repository!.getPreferences(sessionId)).data ?? emptyPreferences()
    const comparison = buildOfferComparison({
      currentMonthly: facts.currentMonthlyCost,
      currentRemainingMonths: null,
      terms: parsedOffer.terms,
      approvedAlternative: null,
      preferences,
      offerContentHash: stored.data.content_hash,
      keptServices: parsed.data.keptServices,
    })

    await writeNegotiationAudit(supabase, {
      householdId,
      actorUserId: engine.userId!,
      sessionId,
      eventType: "negotiation.offer_received",
      summary: `Provider response stored (${parsed.data.origin})`,
      metadata: {
        offer_id: stored.data.id,
        origin: parsed.data.origin,
        source: parsed.data.source,
        content_hash: stored.data.content_hash,
      },
    })

    return NextResponse.json(
      {
        offer: {
          id: stored.data.id,
          origin: stored.data.origin,
          source: stored.data.source,
          content_hash: stored.data.content_hash,
          status: stored.data.status,
        },
        parsed: {
          terms: parsedOffer.terms,
          extracted_fields: parsedOffer.extractedFields,
          unrecognized: parsedOffer.unrecognized,
        },
        comparison,
      },
      { status: 201 },
    )
  } catch {
    return upstreamFailed("NEGOTIATION_OFFER_SAVE_FAILED").response
  }
}
