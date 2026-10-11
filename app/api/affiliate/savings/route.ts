import { NextResponse } from "next/server"
import { z } from "zod"
import { createAffiliateAnalyticsClient } from "../../../../lib/affiliate/analytics-client"
import { isUuid } from "../../../../lib/affiliate/attribution"
import { authorizeOperator } from "../../../../lib/affiliate/operator-auth"
import {
  canTransitionSaving,
  computeSaving,
  createSavingRecord,
  findSavingStatus,
  isSavingEvidenceSource,
  isSavingStatus,
  resolveSavingOwner,
  savingEvidenceSources,
  savingStatuses,
  updateSavingStatus,
} from "../../../../lib/affiliate/savings"

/**
 * Savings ledger: what a confirmed switch saves the customer, from evidence.
 *
 * `POST` records one saving, attributed through the click id the partner
 * reports back as sub-ID or through the Optimize session id. `PATCH` moves it
 * `secured → realized` (the new contract started) or `secured → cancelled`.
 *
 * Auth: the same operator secret as the callback and conversion routes.
 */

const amount = z.union([z.number(), z.string()])

const createSchema = z
  .object({
    clickId: z.string().trim().optional(),
    optimizeSessionId: z.string().trim().optional(),
    oldMonthlyEur: amount,
    newMonthlyEur: amount,
    evidenceSource: z.string().trim().min(1).max(40),
    status: z.string().trim().min(1).max(20).optional(),
    switchEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    evidenceNote: z.string().trim().max(500).optional(),
  })
  .strict()

const patchSchema = z
  .object({
    savingId: z.string().trim(),
    status: z.string().trim().min(1).max(20),
  })
  .strict()

export async function POST(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "SAVING_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
  }
  const { clickId, optimizeSessionId, evidenceSource } = parsed.data
  const status = parsed.data.status ?? "secured"

  if (!isUuid(clickId) && !isUuid(optimizeSessionId)) {
    return NextResponse.json({ code: "ATTRIBUTION_REQUIRED" }, { status: 400 })
  }
  if (!isSavingEvidenceSource(evidenceSource)) {
    return NextResponse.json({ code: "UNKNOWN_EVIDENCE_SOURCE", allowed: savingEvidenceSources }, { status: 422 })
  }
  // A new saving starts as secured, or as realized when the switch already happened.
  if (status !== "secured" && status !== "realized") {
    return NextResponse.json({ code: "UNKNOWN_STATUS", allowed: ["secured", "realized"] }, { status: 422 })
  }

  const computed = computeSaving(parsed.data.oldMonthlyEur, parsed.data.newMonthlyEur)
  if (!computed.ok) return NextResponse.json({ code: "SAVING_NOT_COMPUTABLE", reason: computed.reason }, { status: 422 })

  const analytics = createAffiliateAnalyticsClient()
  const owner = await resolveSavingOwner(analytics, {
    clickId: isUuid(clickId) ? clickId : null,
    optimizeSessionId: isUuid(optimizeSessionId) ? optimizeSessionId : null,
  })
  if (!owner) return NextResponse.json({ code: "ATTRIBUTION_NOT_FOUND" }, { status: 404 })

  const result = await createSavingRecord(analytics, {
    ...owner,
    oldMonthlyCents: computed.oldMonthlyCents,
    newMonthlyCents: computed.newMonthlyCents,
    status,
    evidenceSource,
    switchEffectiveDate: parsed.data.switchEffectiveDate ?? null,
    evidenceNote: parsed.data.evidenceNote ?? null,
  })

  if (result.outcome === "created") {
    return NextResponse.json({ savingId: result.id, status, annualSavingCents: result.annualSavingCents }, { status: 201 })
  }
  if (result.outcome === "duplicate") {
    return NextResponse.json({ code: "ALREADY_RECORDED", optimizeSessionId: owner.optimizeSessionId }, { status: 200 })
  }
  return NextResponse.json({ code: "SAVING_WRITE_FAILED" }, { status: 500 })
}

export async function PATCH(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !isUuid(parsed.data.savingId)) {
    return NextResponse.json({ code: "SAVING_VALIDATION_FAILED" }, { status: 400 })
  }
  const { savingId, status } = parsed.data
  if (!isSavingStatus(status)) return NextResponse.json({ code: "UNKNOWN_STATUS", allowed: savingStatuses }, { status: 422 })

  const analytics = createAffiliateAnalyticsClient()
  const current = await findSavingStatus(analytics, savingId)
  if (current === null) return NextResponse.json({ code: "SAVING_NOT_FOUND", savingId }, { status: 404 })

  const check = canTransitionSaving(current, status)
  if (!check.ok) {
    if (check.reason === "same_status") return NextResponse.json({ code: "ALREADY_IN_STATUS", savingId, status }, { status: 200 })
    return NextResponse.json({ code: "INVALID_TRANSITION", from: current, to: status, reason: check.reason }, { status: 409 })
  }

  const updated = await updateSavingStatus(analytics, savingId, current as "secured", status)
  if (!updated) return NextResponse.json({ code: "SAVING_UPDATE_FAILED", savingId }, { status: 500 })
  return NextResponse.json({ savingId, from: current, status }, { status: 200 })
}
