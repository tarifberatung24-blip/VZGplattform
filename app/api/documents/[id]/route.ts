import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { recordAuditEvent } from "@/lib/office/supabase/record-audit-event"
import { ensureHousehold } from "@/lib/supabase/household"

const jsonError = (code: string, status: number) => NextResponse.json({ code }, { status })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Deletes one uploaded document of the signed-in user: the file in storage first, then the row.
 *
 * Order matters. If the file cannot be removed the row stays, so the user still sees the document
 * and can try again; the other way round would leave a file nobody can reach. Derived rows
 * (analysis results, reviews) go with the document through their foreign keys; contracts and
 * Inkasso cases that point to it only lose the link (`on delete set null`) and stay.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return jsonError("DOCUMENT_NOT_FOUND", 404)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonError("DELETE_NOT_AUTHENTICATED", 401)
    const householdId = await ensureHousehold(supabase)

    const { data: document, error: readError } = await supabase
      .from("documents")
      .select("id,storage_path,mime_type,size_bytes")
      .eq("id", id)
      .eq("household_id", householdId)
      .maybeSingle()
    if (readError) return jsonError("DELETE_FAILED", 503)
    if (!document) return jsonError("DOCUMENT_NOT_FOUND", 404)

    const path = typeof document.storage_path === "string" ? document.storage_path : null
    if (path) {
      const bucket = supabase.storage.from("documents")
      const { error: removeError } = await bucket.remove([path])
      if (removeError) return jsonError("DELETE_FAILED", 502)
      // remove() reports success for a file it was not allowed to touch, so look again.
      const slash = path.lastIndexOf("/")
      const { data: left, error: listError } = await bucket.list(path.slice(0, slash), { limit: 100 })
      if (listError || (left ?? []).some((entry) => entry.name === path.slice(slash + 1))) return jsonError("DELETE_FAILED", 502)
    }

    const { error: deleteError } = await supabase.from("documents").delete().eq("id", id).eq("household_id", householdId)
    if (deleteError) return jsonError("DELETE_FAILED", 503)

    await recordAuditEvent(supabase, {
      actorId: user.id,
      action: "document.deleted",
      metadata: { entityType: "document", entityId: id, summary: "Document deleted by the user", mimeType: document.mime_type, sizeBytes: document.size_bytes },
    })
    return NextResponse.json({ deleted: true, id })
  } catch {
    return jsonError("DELETE_FAILED", 503)
  }
}
