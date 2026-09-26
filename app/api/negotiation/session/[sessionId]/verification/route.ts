import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyBill } from "@/lib/horizon/negotiation/verification"
import { applyTransition } from "@/lib/horizon/negotiation/timeline"
import { verifiedSavingsOutput, calculateSavings, normalizeOfferTerms, type OfferTerms } from "@/lib/horizon/negotiation/savings"
import {
  isFailure,
  requireEngine,
  requireOwnedSession,
  upstreamFailed,
  validationFailed,
} from "@/lib/horizon/negotiation/route-support"
import type { ExpectedBillTerms } from "@/lib/horizon/negotiation/verification"

const schema = z
  .object({
    monthlyCost: z.number().positive().max(100000).nullable().default(null),
    oneTimeCredit: z.number().min(0).max(100000).nullable().default(null),
    activationFee: z.number().min(0).max(100000).nullable().default(null),
    billingPeriodStart: z.string().trim().max(40).nullable().default(null),
    billingPeriodEnd: z.string().trim().max(40).nullable().default(null),
    documentId: z.string().uuid().nullable().default(null),
  })
  .strict()

/**
 * Records a bill and verifies it against the negotiated terms.
 *
 * The expected terms come from the accepted offer's stored facts — not from the
 * request — so a caller cannot move the goalposts to make a mismatch look like a
 * success. A saving is promoted to VERIFIED only when the comparison says so.
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

    const offers = await engine.repository!.listOffers(sessionId)
    const accepted = (offers.data ?? []).find((offer) => offer.status === "accepted")
    if (!accepted) return NextResponse.json({ code: "NEGOTIATION_NO_ACCEPTED_OFFER" }, { status: 409 })

    const terms: OfferTerms = normalizeOfferTerms(accepted.parsed_facts)
    const expected: ExpectedBillTerms = {
      monthlyCost: terms.newMonthly,
      oneTimeCredit: terms.oneTimeCredit,
      activationFee: terms.activationFee,
      effectiveDate: terms.effectiveDate,
    }

    const verification = verifyBill({
      expected,
      actual: {
        monthlyCost: parsed.data.monthlyCost,
        oneTimeCredit: parsed.data.oneTimeCredit,
        activationFee: parsed.data.activationFee,
        billingPeriodStart: parsed.data.billingPeriodStart,
        billingPeriodEnd: parsed.data.billingPeriodEnd,
      },
      today: new Date().toISOString().slice(0, 10),
    })

    // Find or create the verification row for this session.
    const existing = (await engine.repository!.listVerifications(sessionId)).data ?? []
    const pending = existing.find((row) => row.result === "pending")
    if (pending) {
      const updated = await engine.repository!.updateVerification({
        sessionId,
        verificationId: pending.id,
        actual: parsed.data as unknown as Record<string, unknown>,
        result: verification.result,
        discrepancies: verification.discrepancies,
        documentId: parsed.data.documentId,
      })
      if (updated.error) return upstreamFailed(updated.error).response
    } else {
      const created = await engine.repository!.addVerification({
        sessionId,
        expected: expected as unknown as Record<string, unknown>,
        dueAt: null,
      })
      if (created.error || !created.data) return upstreamFailed("NEGOTIATION_VERIFICATION_CREATE_FAILED").response
      const updated = await engine.repository!.updateVerification({
        sessionId,
        verificationId: created.data.id,
        actual: parsed.data as unknown as Record<string, unknown>,
        result: verification.result,
        discrepancies: verification.discrepancies,
        documentId: parsed.data.documentId,
      })
      if (updated.error) return upstreamFailed(updated.error).response
    }

    // The state moves to VERIFIED_SAVING only on a real VERIFIED result; a
    // mismatch or a not-yet-effective bill reopens negotiation so a follow-up can
    // be prepared. The path is walked through the declared edges, so a session in
    // CONFIRMED first enters BILL_VERIFICATION.
    let state = session.state
    const enter = applyTransition(state, "start_verification")
    if (enter) {
      state = enter.state
      await engine.repository!.appendEvents(sessionId, enter.events)
    }
    const transition = verification.result === "VERIFIED" ? "mark_verified" : "reopen_negotiation"
    const applied = applyTransition(state, transition)
    if (applied) {
      state = applied.state
      await engine.repository!.appendEvents(sessionId, applied.events)
      await engine.repository!.updateSession(sessionId, {
        state,
        verified_at: verification.result === "VERIFIED" ? new Date().toISOString() : null,
      })
    }

    const savings = calculateSavings({
      oldMonthly: session.current_monthly_cost,
      currentRemainingMonths: null,
      terms,
      state: verification.result === "VERIFIED" ? "VERIFIED" : "CONFIRMED",
    })

    return NextResponse.json({
      result: verification.result,
      discrepancies: verification.discrepancies,
      follow_up_actions: verification.followUpActions,
      state,
      /** Only a VERIFIED saving is exposed for future Capital use. */
      verified_saving: verifiedSavingsOutput(savings),
      savings: {
        monthly_recurring_saving: savings.monthlyRecurringSaving,
        annualized_recurring_saving: savings.annualizedRecurringSaving,
      },
    })
  } catch {
    return upstreamFailed("NEGOTIATION_VERIFICATION_FAILED").response
  }
}
