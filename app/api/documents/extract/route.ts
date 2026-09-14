import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { extractDocumentText } from "@/lib/documents/extraction"

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let claimedDocumentId: string | null = null
  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "EXTRACTION_NOT_AUTHENTICATED" }, { status: 401 })
    const body = await request.json() as { documentId?: unknown }
    if (typeof body.documentId !== "string") return NextResponse.json({ code: "DOCUMENT_ID_INVALID" }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { data: document, error } = await supabase.from("documents")
      .select("id,storage_path,mime_type,household_id,processing_status,extraction_status")
      .eq("id", body.documentId)
      .eq("household_id", householdId)
      .maybeSingle()
    if (error) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!document) return NextResponse.json({ code: "HOUSEHOLD_ACCESS_DENIED" }, { status: 403 })
    if (!document.storage_path || !document.mime_type) return NextResponse.json({ code: "DOCUMENT_FILE_UNAVAILABLE" }, { status: 409 })
    if (!["uploaded", "failed"].includes(document.processing_status)) return NextResponse.json({ code: "EXTRACTION_ALREADY_RUNNING" }, { status: 409 })

    const claimed = await supabase.from("documents").update({ processing_status: "extracting" })
      .eq("id", document.id).eq("household_id", householdId).in("processing_status", ["uploaded", "failed"]).select("id").maybeSingle()
    if (claimed.error) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    if (!claimed.data) return NextResponse.json({ code: "EXTRACTION_ALREADY_RUNNING" }, { status: 409 })
    claimedDocumentId = document.id

    const { data: file, error: downloadError } = await supabase.storage.from("documents").download(document.storage_path)
    if (downloadError || !file) return NextResponse.json({ code: "DOCUMENT_FILE_UNAVAILABLE" }, { status: 502 })
    const result = await extractDocumentText(file, document.mime_type)
    const { error: updateError } = await supabase.from("documents").update({
      extracted_text: result.text || null,
      extraction_status: result.status,
      processing_status: result.status === "extracted" ? "awaiting_analysis" : "analysis_not_configured",
    }).eq("id", document.id).eq("household_id", householdId)
    if (updateError) return NextResponse.json({ code: "SCHEMA_NOT_VERIFIED" }, { status: 503 })
    await supabase.from("audit_events").insert({
      household_id: householdId,
      actor_user_id: user.id,
      entity_type: "document",
      entity_id: document.id,
      event_type: "document.extracted",
      event_summary: result.status === "extracted" ? "Digital text extracted" : "OCR required",
      metadata: { status: result.status },
    })
    return NextResponse.json({ documentId: document.id, ...result })
  } catch {
    if (supabase && claimedDocumentId) {
      await supabase.from("documents").update({ processing_status: "failed", extraction_status: "failed" }).eq("id", claimedDocumentId)
    }
    return NextResponse.json({ code: "EXTRACTION_FAILED" }, { status: 502 })
  }
}
