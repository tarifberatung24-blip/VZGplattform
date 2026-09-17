import { NextResponse } from "next/server"
import { analyzeWithGroq } from "@/lib/home-office/groq-provider"
import { analyzeBescheidWithCerebras } from "@/lib/home-office/cerebras-provider"
import { extractContractWithGroq } from "@/lib/contracts/extraction"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "UPLOAD_NOT_AUTHENTICATED" }, { status: 401 })
    const body = await request.json() as { documentId?: unknown; mode?: unknown }
    if (typeof body.documentId !== "string" || !body.documentId) return NextResponse.json({ code: "ANALYSIS_FAILED" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { data: document, error: documentError } = await supabase.from("documents").select("id,processing_status,household_id,extracted_text").eq("id", body.documentId).eq("household_id", householdId).maybeSingle()
    if (documentError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!document) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 403 })
    if (!["uploaded", "awaiting_analysis", "failed", "analysis_not_configured"].includes(document.processing_status)) return NextResponse.json({ code: "ANALYSIS_ALREADY_RUNNING" }, { status: 409 })
    const claimed = await supabase.from("documents").update({ processing_status: "awaiting_analysis" }).eq("id", document.id).eq("household_id", householdId).in("processing_status", ["uploaded", "awaiting_analysis", "failed", "analysis_not_configured"]).select("id").maybeSingle()
    if (claimed.error) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!claimed.data) return NextResponse.json({ code: "ANALYSIS_ALREADY_RUNNING" }, { status: 409 })
    try {
      const text = document.extracted_text?.trim()
      if (!text) {
        await supabase.from("documents").update({ processing_status: "analysis_not_configured" }).eq("id", document.id).eq("household_id", householdId)
        return NextResponse.json({ code: "OCR_NOT_CONFIGURED" }, { status: 503 })
      }
      const analysis = body.mode === "contract"
        ? await extractContractWithGroq(text)
        : process.env.CEREBRAS_API_KEY
          ? await analyzeBescheidWithCerebras(text)
          : await analyzeWithGroq(text)
      await supabase.from("document_analysis_results").insert({ document_id: document.id, user_id: user.id, result: analysis, source: "ai" })
      await supabase.from("documents").update({ processing_status: "needs_review" }).eq("id", document.id).eq("household_id", householdId)
      await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "document", entity_id: document.id, event_type: "document.analyzed", event_summary: "Document analyzed", metadata: { source: "ai" } })
      return NextResponse.json({ analysis, label: "AI-generated / Needs review", isDemo: false, mode: body.mode === "contract" ? "contract" : "document" })
    } catch (error) {
      const code = error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED" ? "AI_PROVIDER_NOT_CONFIGURED" : error instanceof Error && error.message === "SCHEMA_NOT_VERIFIED" ? "SCHEMA_NOT_VERIFIED" : "ANALYSIS_FAILED"
      await supabase.from("documents").update({ processing_status: code === "AI_PROVIDER_NOT_CONFIGURED" ? "analysis_not_configured" : "failed" }).eq("id", document.id).eq("household_id", householdId)
      return NextResponse.json({ code }, { status: code === "AI_PROVIDER_NOT_CONFIGURED" ? 503 : 502 })
    }
  } catch {
    return NextResponse.json({ code: "ANALYSIS_FAILED" }, { status: 502 })
  }
}
