import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { extractDocumentForAnalysis } from "@/lib/home-office/document-extraction"
import { analyzeBescheidImage, analyzeBescheidText } from "@/lib/home-office/cerebras-provider"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "UPLOAD_NOT_AUTHENTICATED" }, { status: 401 })
    const body = await request.json().catch(() => ({})) as { documentId?: unknown; text?: unknown }
    if (typeof body.documentId !== "string" || !body.documentId) return NextResponse.json({ code: "ANALYSIS_FAILED" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { data: document, error: documentError } = await supabase.from("documents").select("id,processing_status,household_id,storage_path,mime_type").eq("id", body.documentId).eq("household_id", householdId).maybeSingle()
    if (documentError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!document) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 403 })
    if (!["uploaded", "awaiting_analysis", "failed", "analysis_not_configured"].includes(document.processing_status)) return NextResponse.json({ code: "ANALYSIS_ALREADY_RUNNING" }, { status: 409 })
    const claimed = await supabase.from("documents").update({ processing_status: "awaiting_analysis" }).eq("id", document.id).eq("household_id", householdId).in("processing_status", ["uploaded", "awaiting_analysis", "failed", "analysis_not_configured"]).select("id").maybeSingle()
    if (claimed.error) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!claimed.data) return NextResponse.json({ code: "ANALYSIS_ALREADY_RUNNING" }, { status: 409 })
    try {
      let analysis
      const stored = document.storage_path ? await supabase.storage.from("documents").download(document.storage_path) : { data: null, error: new Error("NO_STORAGE_PATH") }
      if (stored.data) {
        const extracted = await extractDocumentForAnalysis(new File([await stored.data.arrayBuffer()], `document.${document.mime_type === "application/pdf" ? "pdf" : document.mime_type === "image/png" ? "png" : "jpg"}`, { type: document.mime_type || "application/octet-stream" }))
        analysis = extracted.kind === "image" ? await analyzeBescheidImage(extracted.value) : await analyzeBescheidText(extracted.value)
      } else if (typeof body.text === "string" && body.text.trim().length > 20) {
        analysis = await analyzeBescheidText(body.text)
      } else {
        throw new Error("DOCUMENT_DOWNLOAD_FAILED")
      }
      await supabase.from("documents").update({ processing_status: "needs_review", analysis_json: analysis, analysis_provider: "cerebras", analyzed_at: new Date().toISOString() }).eq("id", document.id).eq("household_id", householdId)
      await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "document", entity_id: document.id, event_type: "document.analyzed", event_summary: "Bescheid analyzed with Cerebras", metadata: { provider: "cerebras", extraction: document.mime_type === "application/pdf" ? "pdf-text" : "vision" } })
      return NextResponse.json({ analysis, label: "Cerebras AI · Human review required", isDemo: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      const code = message === "AI_PROVIDER_NOT_CONFIGURED" ? "AI_PROVIDER_NOT_CONFIGURED" : message === "DOCUMENT_TEXT_NOT_EXTRACTED" ? "DOCUMENT_TEXT_NOT_EXTRACTED" : message === "DOCUMENT_DOWNLOAD_FAILED" ? "DOCUMENT_DOWNLOAD_FAILED" : "ANALYSIS_FAILED"
      await supabase.from("documents").update({ processing_status: code === "AI_PROVIDER_NOT_CONFIGURED" ? "analysis_not_configured" : "failed" }).eq("id", document.id).eq("household_id", householdId)
      return NextResponse.json({ code }, { status: code === "AI_PROVIDER_NOT_CONFIGURED" ? 503 : 502 })
    }
  } catch {
    return NextResponse.json({ code: "ANALYSIS_FAILED" }, { status: 502 })
  }
}
