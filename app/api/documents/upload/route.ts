import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { DocumentValidationError, isCanonicalSupabase, validateDocument } from "@/lib/documents/validation"

const jsonError = (code: string, status: number) => NextResponse.json({ code }, { status })

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let documentId: string | null = null
  let storagePath: string | null = null
  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonError("UPLOAD_NOT_AUTHENTICATED", 401)
    if (!isCanonicalSupabase()) return jsonError("SCHEMA_NOT_VERIFIED", 503)

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return jsonError("FILE_EMPTY", 400)
    const metadata = await validateDocument(file)
    const householdId = await ensureHousehold(supabase)
    documentId = crypto.randomUUID()
    storagePath = `households/${householdId}/documents/${documentId}/${metadata.name}`

    const { error: insertError } = await supabase.from("documents").insert({
      id: documentId,
      household_id: householdId,
      original_filename: file.name,
      mime_type: metadata.type,
      size_bytes: metadata.size,
      storage_path: storagePath,
      document_type: "other",
      processing_status: "uploaded",
    })
    if (insertError) return jsonError("SCHEMA_NOT_VERIFIED", 503)

    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, { contentType: metadata.type, upsert: false })
    if (uploadError) {
      await supabase.from("documents").delete().eq("id", documentId).eq("household_id", householdId)
      return jsonError("STORAGE_NOT_CONFIGURED", 503)
    }

    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "document", entity_id: documentId, event_type: "document.uploaded", event_summary: "Document uploaded", metadata: { mime_type: metadata.type, size_bytes: metadata.size } })
    return NextResponse.json({ document: { id: documentId, ...metadata, status: "uploaded" } }, { status: 201 })
  } catch (error) {
    if (error instanceof DocumentValidationError) return jsonError(error.code, 400)
    if (supabase && documentId) {
      if (storagePath) await supabase.storage.from("documents").remove([storagePath])
      await supabase.from("documents").delete().eq("id", documentId)
    }
    return jsonError("STORAGE_NOT_CONFIGURED", 503)
  }
}
