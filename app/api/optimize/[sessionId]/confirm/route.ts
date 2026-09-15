import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { partnerDetails, type OptimizeCategory } from "@/lib/optimize/flow"

const bodySchema = z.object({ confirm: z.literal(true) }).strict()
const sessionIdSchema = z.string().uuid()

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "OPTIMIZE_NOT_AUTHENTICATED" }, { status: 401 })
    const { sessionId } = await params
    if (!sessionIdSchema.safeParse(sessionId).success) return NextResponse.json({ code: "OPTIMIZE_SESSION_INVALID" }, { status: 400 })
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ code: "OPTIMIZE_CONFIRMATION_REQUIRED" }, { status: 400 })
    const { data: session, error: sessionError } = await supabase.from("optimize_sessions").select("id,status,category,partner_id").eq("id", sessionId).eq("user_id", user.id).maybeSingle()
    if (sessionError) return NextResponse.json({ code: "OPTIMIZE_SESSION_UNAVAILABLE" }, { status: 503 })
    if (!session) return NextResponse.json({ code: "OPTIMIZE_SESSION_NOT_FOUND" }, { status: 404 })
    if (session.status !== "ready_for_review") return NextResponse.json({ code: "OPTIMIZE_REVIEW_REQUIRED" }, { status: 409 })
    const partner = partnerDetails(session.category as OptimizeCategory)
    const { data: updated, error: updateError } = await supabase.from("optimize_sessions").update({ status: "confirmed", user_confirmed_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", user.id).eq("status", "ready_for_review").select("id,status,user_confirmed_at").maybeSingle()
    if (updateError || !updated) return NextResponse.json({ code: "OPTIMIZE_CONFIRM_FAILED" }, { status: 502 })
    const householdId = await ensureHousehold(supabase)
    await supabase.from("platform_audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "optimize_session", entity_id: sessionId, event_type: "optimize.confirmed", event_summary: "User confirmed Optimize Flow", metadata: { partner_id: partner.id, partner_configured: partner.configured } })
    return NextResponse.json({ session: updated, partner_configured: partner.configured, redirect_url: partner.url, disclosure: partner.url ? "The final contract is concluded with the partner." : "No approved partner link is configured. No redirect was performed." })
  } catch {
    return NextResponse.json({ code: "OPTIMIZE_CONFIRM_FAILED" }, { status: 502 })
  }
}
