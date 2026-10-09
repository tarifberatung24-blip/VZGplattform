import { NextResponse } from "next/server"
import { z } from "zod"
import {
  findServiceRequestStatus,
  markServiceRequestStatus,
  recordAffiliateStatusEvent,
} from "../../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../../lib/affiliate/analytics-client"
import { affiliateRequestStatuses, canTransition, isAffiliateRequestStatus } from "../../../../lib/affiliate/lifecycle"
import { authorizeOperator } from "../../../../lib/affiliate/operator-auth"

/**
 * Operator callback: the automation/orchestrator advances a stored request
 * through its customer-facing lifecycle (`queued → in_review → sent →
 * waiting_customer → closed`). This is the return leg of the revenue loop that
 * the outbound webhook starts.
 *
 * Auth: a shared secret in `AFFILIATE_OPERATOR_SECRET`, sent as
 * `X-Horizon-Operator-Secret`. Without it the endpoint is disabled (503) rather
 * than open: this route mutates customer data.
 */

const callbackSchema = z
  .object({
    requestId: z.string().trim().min(3).max(120),
    status: z.string().trim().min(1).max(40),
    note: z.string().trim().max(500).optional(),
    source: z.string().trim().max(80).optional(),
  })
  .strict()

export async function POST(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code }, { status: auth.status })
  }

  const parsed = callbackSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { code: "CALLBACK_VALIDATION_FAILED", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { requestId, status, note, source } = parsed.data
  if (!isAffiliateRequestStatus(status)) {
    return NextResponse.json(
      { code: "UNKNOWN_STATUS", allowed: affiliateRequestStatuses },
      { status: 422 },
    )
  }

  const analytics = createAffiliateAnalyticsClient()
  const current = await findServiceRequestStatus(analytics, requestId)

  if (current === null) {
    // Either the request does not exist or analytics is unconfigured. In both
    // cases the callback cannot be applied, so the operator must retry.
    return NextResponse.json({ code: "REQUEST_NOT_FOUND", requestId }, { status: 404 })
  }

  const check = canTransition(current, status)
  if (!check.ok) {
    if (check.reason === "same_status") {
      // Idempotent replay: the operator sent a status the request already has.
      return NextResponse.json({ code: "ALREADY_IN_STATUS", requestId, status }, { status: 200 })
    }
    return NextResponse.json(
      { code: "INVALID_TRANSITION", from: current, to: status, reason: check.reason },
      { status: 409 },
    )
  }

  const updated = await markServiceRequestStatus(analytics, requestId, status)
  if (!updated) {
    return NextResponse.json({ code: "STATUS_UPDATE_FAILED", requestId }, { status: 500 })
  }

  await recordAffiliateStatusEvent(analytics, { requestId, status, note: note ?? null, source: source ?? null })

  return NextResponse.json({ requestId, from: current, status }, { status: 200 })
}
