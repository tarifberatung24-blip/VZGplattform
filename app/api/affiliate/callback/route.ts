import { NextResponse } from "next/server"
import { z } from "zod"
import {
  findServiceRequestStatus,
  markServiceRequestStatus,
  recordAffiliateStatusEvent,
} from "../../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../../lib/affiliate/analytics-client"
import { affiliateRequestStatuses, canTransition, isAffiliateRequestStatus } from "../../../../lib/affiliate/lifecycle"

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

function readSecret() {
  const value = process.env.AFFILIATE_OPERATOR_SECRET?.trim()
  return value && value.length >= 16 ? value : null
}

/** Constant-time-ish comparison to avoid leaking the secret through timing. */
function secretMatches(provided: string | null, expected: string) {
  if (!provided || provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function POST(request: Request) {
  const expected = readSecret()
  if (!expected) {
    return NextResponse.json({ code: "OPERATOR_CALLBACK_NOT_CONFIGURED" }, { status: 503 })
  }
  if (!secretMatches(request.headers.get("x-horizon-operator-secret"), expected)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 })
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
