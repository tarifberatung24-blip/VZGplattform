import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const reviewSchema = z.object({ documentId: z.string().uuid(), facts: z.record(z.unknown()), confirm: z.boolean() }).strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "REVIEW_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = reviewSchema.safeParse(await request.json())
    if (!parsed.success || !parsed.data.confirm) return NextResponse.json({ code: "REVIEW_CONFIRMATION_REQUIRED" }, { status: 400 })
    const { documentId, facts } = parsed.data
    const householdId = await ensureHousehold(supabase)
    const { data: document, error: documentError } = await supabase.from("documents").select("id,processing_status,household_id").eq("id", documentId).eq("household_id", householdId).maybeSingle()
    if (documentError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!document) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 403 })
    if (document.processing_status !== "needs_review") return NextResponse.json({ code: "REVIEW_NOT_AVAILABLE" }, { status: 409 })
    const { error: updateError } = await supabase.from("documents").update({ processing_status: "processed" }).eq("id", documentId).eq("household_id", householdId)
    if (updateError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "document", entity_id: documentId, event_type: "document.reviewed", event_summary: "Document reviewed", metadata: { confirmed: true, facts } })
    return NextResponse.json({ documentId, status: "processed", confirmedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ code: "REVIEW_FAILED" }, { status: 502 })
  }
}
