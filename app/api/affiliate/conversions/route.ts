import { NextResponse } from "next/server"
import { z } from "zod"
import { isAffiliateOfferId } from "../../../../lib/affiliate-offers"
import {
  createCommissionRecord,
  findCommissionStatus,
  updateCommissionStatus,
} from "../../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../../lib/affiliate/analytics-client"
import {
  canTransitionCommission,
  commissionModels,
  commissionStatuses,
  computeCommissionCents,
  isCommissionModel,
  isCommissionStatus,
} from "../../../../lib/affiliate/commission"
import { authorizeOperator } from "../../../../lib/affiliate/operator-auth"

/**
 * Commission ledger: the money end of the affiliate loop.
 *
 * `POST` records one conversion with an amount in integer cents computed from
 * stated inputs; the (request_id, offer_id) key makes a repeated callback
 * idempotent instead of double-paying. `PATCH` moves that commission through
 * `pending → approved → paid` (or `rejected`), so a payout run can reconcile
 * against exactly which conversions were approved and settled.
 *
 * Auth: same shared secret as the status callback. Without it the route is
 * disabled (503).
 */

const createSchema = z
  .object({
    requestId: z.string().trim().min(3).max(120),
    offerId: z.string().trim().min(1).max(40),
    model: z.string().trim().min(1).max(20),
    status: z.string().trim().min(1).max(20).optional(),
    cpaAmountEur: z.union([z.number(), z.string()]).optional(),
    revenueSharePercent: z.union([z.number(), z.string()]).optional(),
    dealValueEur: z.union([z.number(), z.string()]).optional(),
    externalReference: z.string().trim().max(160).optional(),
    note: z.string().trim().max(500).optional(),
    source: z.string().trim().max(80).optional(),
  })
  .strict()

const patchSchema = z
  .object({
    requestId: z.string().trim().min(3).max(120),
    offerId: z.string().trim().min(1).max(40),
    status: z.string().trim().min(1).max(20),
  })
  .strict()

export async function POST(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "CONVERSION_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { requestId, offerId, model } = parsed.data
  const status = parsed.data.status ?? "pending"

  if (!isAffiliateOfferId(offerId)) {
    return NextResponse.json({ code: "UNKNOWN_OFFER" }, { status: 422 })
  }
  if (!isCommissionModel(model)) {
    return NextResponse.json({ code: "UNKNOWN_MODEL", allowed: commissionModels }, { status: 422 })
  }
  if (!isCommissionStatus(status)) {
    return NextResponse.json({ code: "UNKNOWN_STATUS", allowed: commissionStatuses }, { status: 422 })
  }

  const computed = computeCommissionCents({
    model,
    cpaAmountEur: parsed.data.cpaAmountEur,
    revenueSharePercent: parsed.data.revenueSharePercent,
    dealValueEur: parsed.data.dealValueEur,
  })
  if (!computed.ok) {
    return NextResponse.json({ code: "COMMISSION_NOT_COMPUTABLE", reason: computed.reason }, { status: 422 })
  }

  const analytics = createAffiliateAnalyticsClient()
  const outcome = await createCommissionRecord(analytics, {
    requestId,
    offerId,
    model,
    status,
    amountCents: computed.amountCents,
    externalReference: parsed.data.externalReference ?? null,
    note: parsed.data.note ?? null,
    source: parsed.data.source ?? null,
  })

  if (outcome === "created") {
    return NextResponse.json({ requestId, offerId, status, amountCents: computed.amountCents }, { status: 201 })
  }
  if (outcome === "duplicate") {
    // The conversion was already recorded; a repeated callback is not an error.
    return NextResponse.json({ code: "ALREADY_RECORDED", requestId, offerId }, { status: 200 })
  }
  return NextResponse.json({ code: "COMMISSION_WRITE_FAILED" }, { status: 500 })
}

export async function PATCH(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "CONVERSION_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { requestId, offerId, status } = parsed.data
  if (!isAffiliateOfferId(offerId)) return NextResponse.json({ code: "UNKNOWN_OFFER" }, { status: 422 })
  if (!isCommissionStatus(status)) {
    return NextResponse.json({ code: "UNKNOWN_STATUS", allowed: commissionStatuses }, { status: 422 })
  }

  const analytics = createAffiliateAnalyticsClient()
  const current = await findCommissionStatus(analytics, requestId, offerId)
  if (current === null) {
    return NextResponse.json({ code: "COMMISSION_NOT_FOUND", requestId, offerId }, { status: 404 })
  }

  const check = canTransitionCommission(current, status)
  if (!check.ok) {
    if (check.reason === "same_status") {
      return NextResponse.json({ code: "ALREADY_IN_STATUS", requestId, offerId, status }, { status: 200 })
    }
    return NextResponse.json(
      { code: "INVALID_TRANSITION", from: current, to: status, reason: check.reason },
      { status: 409 },
    )
  }

  const updated = await updateCommissionStatus(analytics, requestId, offerId, status)
  if (!updated) return NextResponse.json({ code: "STATUS_UPDATE_FAILED" }, { status: 500 })

  return NextResponse.json({ requestId, offerId, from: current, status }, { status: 200 })
}
