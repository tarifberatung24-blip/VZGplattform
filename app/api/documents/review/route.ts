import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const reviewSchema = z.object({
  documentId: z.string().uuid(),
  facts: z.object({
    title: z.string().trim().min(1).max(180),
    category: z.enum(["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"]),
    provider: z.string().trim().max(180),
    contractNumber: z.string().trim().max(180),
    monthlyAmount: z.number().nonnegative().nullable(),
    startDate: z.string().trim().max(40),
    endDate: z.string().trim().max(40),
    cancellationDeadline: z.string().trim().max(40),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: z.array(z.string().max(500)).max(10),
  }).strict(),
  confirm: z.boolean(),
}).strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "REVIEW_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = reviewSchema.safeParse(await request.json())
    if (!parsed.success || !parsed.data.confirm) return NextResponse.json({ code: "REVIEW_CONFIRMATION_REQUIRED" }, { status: 400 })
    const { documentId, facts } = parsed.data
    const householdId = await ensureHousehold(supabase)
    const { data: document, error: documentError } = await supabase.from("documents").select("id,processing_status,household_id,original_filename").eq("id", documentId).eq("household_id", householdId).maybeSingle()
    if (documentError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!document) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 403 })
    if (document.processing_status !== "needs_review") return NextResponse.json({ code: "REVIEW_NOT_AVAILABLE" }, { status: 409 })
    const { error: reviewError } = await supabase.from("document_reviews").upsert({
      document_id: documentId,
      user_id: user.id,
      facts,
      confirmed_at: new Date().toISOString(),
    }, { onConflict: "document_id" })
    if (reviewError) return NextResponse.json({ code: "REVIEW_SAVE_FAILED" }, { status: 502 })
    const { error: updateError } = await supabase.from("documents").update({ processing_status: "processed" }).eq("id", documentId).eq("household_id", householdId)
    if (updateError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    const { data: contract, error: contractError } = await supabase.from("contracts").upsert({
      household_id: householdId,
      document_id: documentId,
      title: facts.title || document.original_filename,
      category: facts.category,
      provider_name: facts.provider || "",
      monthly_amount: facts.monthlyAmount,
      contract_number: facts.contractNumber || null,
      start_date: facts.startDate || null,
      end_date: facts.endDate || null,
      cancellation_deadline: facts.cancellationDeadline || null,
      extraction_confidence: facts.confidence,
      extracted_facts: facts,
      review_status: "confirmed",
      status: "draft",
    }, { onConflict: "document_id" }).select("id,title,category,provider:provider_name,monthly_cost:monthly_amount,contract_number,start_date,end_date,cancellation_deadline,review_status,status,document_id,extraction_confidence,extracted_facts").single()
    if (contractError) return NextResponse.json({ code: "CONTRACT_CREATE_FAILED" }, { status: 502 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "document", entity_id: documentId, event_type: "document.reviewed", event_summary: "Document reviewed and contract created", metadata: { confirmed: true, contract_id: contract.id } })
    return NextResponse.json({ documentId, status: "processed", confirmedAt: new Date().toISOString(), contract })
  } catch {
    return NextResponse.json({ code: "REVIEW_FAILED" }, { status: 502 })
  }
}
