import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "LEAD_NOT_AUTHENTICATED" }, { status: 401 })
    const body = await request.json() as { name?: unknown; email?: unknown; phone?: unknown; message?: unknown; screeningSnapshot?: unknown }
    const name = clean(body.name, 160), email = clean(body.email, 320), phone = clean(body.phone, 40), message = clean(body.message, 4000)
    if (name.length < 1 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ code: "LEAD_INVALID_FIELDS" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const snapshot = body.screeningSnapshot && typeof body.screeningSnapshot === "object" ? body.screeningSnapshot : {}
    const { data: lead, error } = await supabase.from("leads").insert({ user_id: user.id, household_id: householdId, name, email, phone: phone || null, message: message || null, screening_snapshot: snapshot }).select("id,created_at,status").single()
    if (error || !lead) return NextResponse.json({ code: "LEAD_SAVE_FAILED" }, { status: 503 })
    const webhook = process.env.LEAD_NOTIFICATION_WEBHOOK_URL
    if (webhook) {
      void fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "new_lead", leadId: lead.id, name, email, phone: phone || undefined, message: message || undefined, createdAt: lead.created_at }) }).catch(() => undefined)
    }
    return NextResponse.json({ lead }, { status: 201 })
  } catch { return NextResponse.json({ code: "LEAD_SAVE_FAILED" }, { status: 503 }) }
}
