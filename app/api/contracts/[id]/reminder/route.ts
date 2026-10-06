import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { validIsoDate } from "@/lib/horizon/contracts/linkage"

const reminderSchema = z.object({ dueAt: z.string().optional(), title: z.string().trim().min(1).max(200).optional() }).strict()

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "CONTRACT_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = reminderSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ code: "REMINDER_VALIDATION_FAILED" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { id } = await context.params
    const { data: contract } = await supabase.from("contracts").select("id,title,cancellation_deadline,end_date").eq("id", id).eq("household_id", householdId).maybeSingle()
    if (!contract) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 404 })
    const dueAt = validIsoDate(parsed.data.dueAt ?? null) ?? validIsoDate(contract.cancellation_deadline) ?? validIsoDate(contract.end_date)
    if (!dueAt) return NextResponse.json({ code: "REMINDER_DATE_REQUIRED" }, { status: 400 })
    const { data, error } = await supabase.from("deadlines").insert({ user_id: user.id, title: parsed.data.title ?? `Договор: ${contract.title}`, due_at: `${dueAt}T00:00:00.000Z`, source: "contract", status: "open" }).select("id,title,due_at,status").single()
    if (error) return NextResponse.json({ code: "REMINDER_SAVE_FAILED" }, { status: 502 })
    await supabase.from("audit_events").insert({ household_id: householdId, event_type: "contract.reminder.created", entity_type: "contract", entity_id: contract.id, metadata: { deadline_id: data.id, due_at: dueAt } })
    return NextResponse.json({ reminder: data }, { status: 201 })
  } catch { return NextResponse.json({ code: "REMINDER_SAVE_FAILED" }, { status: 502 }) }
}
