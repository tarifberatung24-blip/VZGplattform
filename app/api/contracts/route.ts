import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

const category = z.enum(["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"])
const contractSchema = z.object({
  title: z.string().trim().min(1).max(180),
  category,
  provider: z.string().trim().max(180).default(""),
  monthlyAmount: z.number().nonnegative().nullable().default(null),
  contractNumber: z.string().trim().max(180).default(""),
  startDate: z.string().trim().max(40).default(""),
  endDate: z.string().trim().max(40).default(""),
  cancellationDeadline: z.string().trim().max(40).default(""),
  documentId: z.string().uuid().nullable().default(null),
  extractedFacts: z.record(z.unknown()).default({}),
  extractionConfidence: z.number().min(0).max(1).nullable().default(null),
}).strict()

function toRow(value: z.infer<typeof contractSchema>, householdId: string) {
  return {
    household_id: householdId,
    title: value.title,
    category: value.category,
    provider_name: value.provider || "",
    monthly_amount: value.monthlyAmount,
    contract_number: value.contractNumber || null,
    start_date: value.startDate || null,
    end_date: value.endDate || null,
    cancellation_deadline: value.cancellationDeadline || null,
    document_id: value.documentId,
    extracted_facts: value.extractedFacts,
    extraction_confidence: value.extractionConfidence,
    review_status: "confirmed",
    status: "draft",
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "CONTRACT_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = contractSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ code: "CONTRACT_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { data, error } = await supabase.from("contracts").insert(toRow(parsed.data, householdId))
      .select("id,title,category,provider:provider_name,monthly_cost:monthly_amount,contract_number,start_date,end_date,cancellation_deadline,review_status,status,document_id,extraction_confidence,extracted_facts")
      .single()
    if (error) return NextResponse.json({ code: "CONTRACT_SAVE_FAILED" }, { status: 502 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "contract", entity_id: data.id, event_type: "contract.created", event_summary: "Contract created", metadata: { source: parsed.data.documentId ? "document" : "manual" } })
    return NextResponse.json({ contract: data }, { status: 201 })
  } catch {
    return NextResponse.json({ code: "CONTRACT_SAVE_FAILED" }, { status: 502 })
  }
}
