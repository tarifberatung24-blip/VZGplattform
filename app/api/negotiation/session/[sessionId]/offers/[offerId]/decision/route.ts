import { NextResponse } from "next/server"
import { z } from "zod"
import { OFFER_DECISIONS, canDecideOffer } from "@/lib/horizon/negotiation/review"
import { calculateSavings, normalizeOfferTerms, type OfferTerms } from "@/lib/horizon/negotiation/savings"
import { evaluatePreferences, offerShapeFromTerms } from "@/lib/horizon/negotiation/preferences"
import { remainingMonths } from "@/lib/horizon/negotiation/opportunity"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import { applyTransition } from "@/lib/horizon/negotiation/timeline"
import {
  conflict,
  isFailure,
  requireEngine,
  requireOwnedSession,
  upstreamFailed,
  validationFailed,
} from "@/lib/horizon/negotiation/route-support"
import { buildContractFacts } from "@/lib/horizon/negotiation/facts"
import { loadOwnedContract } from "@/lib/horizon/negotiation/route-support"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const schema = z
  .object({
    decision: z.enum(OFFER_DECISIONS as [string, ...string[]]),
    /**
     * The hash the user's approval was formed against. For ACCEPT this must match
     * the stored offer content hash; a mismatch means the offer changed after it
     * was reviewed, and the acceptance is refused.
     */
    approvedHash: z.string().trim().min(1).max(200).nullable().default(null),
    /** Items the offer preserves, as confirmed by the user on the review screen. */
    keptServices: z.array(z.string().trim().max(120)).max(20).default([]),
  })
  .strict()

/**
 * Records a user's decision on an offer.
 *
 * This is the enforcement point for "no auto-acceptance". ACCEPT is refused when
 * a hard user preference is violated or when the approval hash does not match the
 * offer's current content. Neither refusal is a UI nicety: the check runs here,
 * server-side, against the stored content.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string; offerId: string }> },
) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId, offerId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const offerResult = await engine.repository!.getOffer(sessionId, offerId)
    if (offerResult.error || !offerResult.data) {
      return NextResponse.json({ code: "NEGOTIATION_OFFER_NOT_FOUND" }, { status: 404 })
    }
    const offer = offerResult.data
    const decision = parsed.data.decision as (typeof OFFER_DECISIONS)[number]

    // Recompute the comparison from stored content so a hard preference cannot be
    // bypassed by a client that omits it.
    const supabase = await createClient()
    const householdId = await ensureHousehold(supabase)
    const contract = await loadOwnedContract(supabase, householdId, session.contract_id)
    if (!contract) return NextResponse.json({ code: "NEGOTIATION_CONTRACT_NOT_FOUND" }, { status: 404 })
    const facts = buildContractFacts(contract)
    const preferences = (await engine.repository!.getPreferences(sessionId)).data
    const terms: OfferTerms = normalizeOfferTerms(offer.parsed_facts)
    const today = new Date().toISOString().slice(0, 10)

    let blockedByPreferences = false
    const savings = calculateSavings({
      oldMonthly: facts.currentMonthlyCost,
      currentRemainingMonths: remainingMonths(facts.endDate, today),
      terms,
      state: "OFFERED",
    })
    if (preferences) {
      const shape = offerShapeFromTerms(terms, {
        extendsContractMonths: terms.newContractDurationMonths,
        keeps: parsed.data.keptServices as never,
      })
      const evaluation = evaluatePreferences(preferences, shape, savings.monthlyRecurringSaving)
      blockedByPreferences = !evaluation.acceptable
    }

    const allowed = canDecideOffer({
      decision,
      offerStatus: offer.status,
      approvedHash: parsed.data.approvedHash,
      currentContentHash: offer.content_hash,
      blockedByPreferences,
    })
    if (!allowed.allowed) return conflict(allowed.reason ?? "NEGOTIATION_OFFER_DECISION_REFUSED").response

    // Map the user decision to a stored offer status and a state transition.
    const statusByDecision: Record<string, "accepted" | "rejected" | "countered"> = {
      ACCEPT: "accepted",
      REJECT: "rejected",
      COUNTER: "countered",
      COMPARE_SWITCH: "rejected",
    }
    const transitionByDecision: Record<string, "approve_offer" | "reject_offer" | "counter_offer"> = {
      ACCEPT: "approve_offer",
      REJECT: "reject_offer",
      COUNTER: "counter_offer",
      COMPARE_SWITCH: "reject_offer",
    }

    const decided = await engine.repository!.decideOffer({
      sessionId,
      offerId,
      decision: statusByDecision[decision],
      approvedHash: decision === "ACCEPT" ? offer.content_hash : null,
    })
    if (decided.error) return upstreamFailed(decided.error).response

    // Move the session along the declared edges only.
    let state = session.state
    const first = applyTransition(state, transitionByDecision[decision])
    if (first) {
      state = first.state
      await engine.repository!.appendEvents(sessionId, first.events)
    }
    if (decision === "ACCEPT") {
      const second = applyTransition(state, "approve_offer")
      if (second) {
        state = second.state
        await engine.repository!.appendEvents(sessionId, second.events)
      }
    }
    if (state !== session.state) await engine.repository!.updateSession(sessionId, { state })

    await writeNegotiationAudit(supabase, {
      householdId,
      actorUserId: engine.userId!,
      sessionId,
      eventType: `negotiation.offer_${decision.toLowerCase()}`,
      summary: `Offer decision recorded: ${decision}`,
      metadata: { offer_id: offerId, offer_status: decided.data?.status ?? null, state },
    })

    return NextResponse.json({
      decision,
      offer_status: decided.data?.status ?? null,
      state,
      savings: {
        state: savings.state,
        monthly_recurring_saving: savings.monthlyRecurringSaving,
        annualized_recurring_saving: savings.annualizedRecurringSaving,
        net_first_year_effect: savings.netFirstYearEffect,
        additional_binding_months: savings.additionalBindingMonths,
        warnings: savings.warnings,
      },
      /** A switch comparison is only offered, never executed, from here. */
      switch_fallback: decision === "COMPARE_SWITCH",
    })
  } catch {
    return upstreamFailed("NEGOTIATION_OFFER_DECISION_FAILED").response
  }
}
