import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const updateSchema = z.object({
  title: z.string().trim().min(1).max(180),
  category: z.enum(["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"]),
  provider: z.string().trim().max(180),
  monthlyAmount: z.number().nonnegative().nullable(),
  contractNumber: z.string().trim().max(180),
  startDate: z.string().trim().max(40),
  endDate: z.string().trim().max(40),
  cancellationDeadline: z.string().trim().max(40),
  reviewStatus: z.enum(["needs_review", "confirmed"]),
}).strict()

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "CONTRACT_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ code: "CONTRACT_VALIDATION_FAILED" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { id } = await context.params
    const { data, error } = await supabase.from("contracts").update({
      title: parsed.data.title,
      category: parsed.data.category,
      provider_name: parsed.data.provider || null,
      monthly_amount: parsed.data.monthlyAmount,
      contract_number: parsed.data.contractNumber || null,
      start_date: parsed.data.startDate || null,
      end_date: parsed.data.endDate || null,
      cancellation_deadline: parsed.data.cancellationDeadline || null,
      review_status: parsed.data.reviewStatus,
      status: parsed.data.reviewStatus === "confirmed" ? "draft" : "needs_review",
    }).eq("id", id).eq("household_id", householdId)
      .select("id,title,category,provider:provider_name,monthly_cost:monthly_amount,contract_number,start_date,end_date,cancellation_deadline,review_status,status,document_id,extraction_confidence,extracted_facts")
      .maybeSingle()
    if (error) return NextResponse.json({ code: "CONTRACT_UPDATE_FAILED" }, { status: 502 })
    if (!data) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 404 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "contract", entity_id: data.id, event_type: "contract.updated", event_summary: "Contract updated", metadata: { review_status: parsed.data.reviewStatus } })
    return NextResponse.json({ contract: data })
  } catch {
    return NextResponse.json({ code: "CONTRACT_UPDATE_FAILED" }, { status: 502 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "CONTRACT_NOT_AUTHENTICATED" }, { status: 401 })
    const householdId = await ensureHousehold(supabase)
    const { id } = await context.params
    const { error } = await supabase.from("contracts").delete().eq("id", id).eq("household_id", householdId)
    if (error) return NextResponse.json({ code: "CONTRACT_DELETE_FAILED" }, { status: 502 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "contract", entity_id: id, event_type: "contract.deleted", event_summary: "Contract deleted", metadata: {} })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ code: "CONTRACT_DELETE_FAILED" }, { status: 502 })
  }
}
