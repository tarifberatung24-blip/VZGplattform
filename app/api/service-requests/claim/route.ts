import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createCaseEngine } from "@/lib/horizon/case"
import { provisionHorizonServiceCase } from "@/lib/horizon/service-requests/case-provisioning"
import { isHorizonServiceRequestKind } from "@/lib/horizon/service-requests/catalog"
import { claimServiceRequest, getClaimableServiceRequest } from "@/lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "@/lib/affiliate/analytics-client"

const schema = z.object({ requestId: z.string().regex(/^hz_[0-9a-f-]{36}$/i) }).strict()

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_CLAIM_REQUEST" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) return NextResponse.json({ code: "HORIZON_NOT_CONFIGURED" }, { status: 503 })

  const analytics = createAffiliateAnalyticsClient()
  const candidate = await getClaimableServiceRequest(analytics, {
    requestId: parsed.data.requestId,
    email: user.email,
  })
  if (candidate.error || !candidate.data) {
    return NextResponse.json({ code: candidate.error === "SERVICE_REQUEST_NOT_FOUND" ? candidate.error : "GUEST_CLAIM_UNAVAILABLE" }, { status: candidate.error === "SERVICE_REQUEST_NOT_FOUND" ? 404 : 503 })
  }
  if (!isHorizonServiceRequestKind(candidate.data.kind)) {
    return NextResponse.json({ code: "UNSUPPORTED_HORIZON_SERVICE" }, { status: 400 })
  }

  const provisioned = await provisionHorizonServiceCase(engine.repository, {
    kind: candidate.data.kind,
    locale: candidate.data.locale,
    requestId: candidate.data.requestId,
    customerName: candidate.data.customerName,
    customerEmail: candidate.data.customerEmail,
    answers: candidate.data.answers,
  })
  if (provisioned.error || !provisioned.data) {
    return NextResponse.json({ code: "HORIZON_CASE_PROVISIONING_FAILED" }, { status: 500 })
  }

  const claimed = await claimServiceRequest(analytics, {
    requestId: candidate.data.requestId,
    userId: engine.userId,
    email: user.email,
    caseId: provisioned.data.id,
  })
  if (claimed.error || !claimed.data) {
    await engine.repository.appendAudit(provisioned.data.id, "guest_claim_failed", { requestId: candidate.data.requestId })
    return NextResponse.json({ code: "GUEST_CLAIM_FAILED" }, { status: 409 })
  }

  return NextResponse.json({
    status: "claimed",
    requestId: candidate.data.requestId,
    case: {
      id: provisioned.data.id,
      status: provisioned.data.status,
      dashboardRoute: "/dashboard",
      assistantRoute: `/api/horizon/cases/${provisioned.data.id}/assistant`,
    },
  }, { status: 201 })
}
