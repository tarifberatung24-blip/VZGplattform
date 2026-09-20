"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import {
  caseDocumentStoragePath,
  classifyCaseDocumentKind,
  validateCaseDocumentFile,
  type CaseDocumentFailureCode,
} from "./document"

export type DocumentIntakeState = {
  error: CaseDocumentFailureCode | "missing_case" | "missing_file" | null
  ok: boolean
}

const CASE_DOCUMENT_BUCKET = "source-documents"

/**
 * P6 file intake: PDF, photo, screenshot onto the canonical case spine.
 *
 * Object writes go through the service-role client rather than the session
 * client on purpose. The `source-documents` bucket grants authenticated users
 * read-only access to objects — there is no INSERT policy — so the session
 * client cannot write, and adding one would let a browser put arbitrary bytes at
 * an owner-prefixed path with no server-side signature check. Routing the write
 * through the server keeps `validateDocument`'s magic-byte check on the path,
 * which is what stops a mislabelled file from being stored as its claimed type.
 *
 * Ownership is established twice and both matter: `getMine` proves the case
 * belongs to the acting user before anything is written, and the object path is
 * built from that user's id and that case id, which is the same shape the
 * `source_documents` CHECK and the bucket read policy require. The service-role
 * client bypasses RLS, so this pre-check is the authorization boundary.
 *
 * A partial failure must not leave an orphan. If the row insert or the audit
 * write fails, the uploaded object is removed and the row is deleted before
 * returning, so the bucket and the table never disagree about what exists.
 */
export async function submitDocumentIntake(
  _previous: DocumentIntakeState,
  formData: FormData,
): Promise<DocumentIntakeState> {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawKind = formData.get("kind")
  const file = formData.get("file")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  if (typeof rawCaseId !== "string" || rawCaseId.length === 0) {
    return { error: "missing_case", ok: false }
  }
  if (!(file instanceof File)) return { error: "missing_file", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) return { error: "UNAUTHORIZED", ok: false }

  const owned = await engine.repository.getMine(rawCaseId)
  if (owned.error || !owned.data) return { error: "CASE_NOT_FOUND", ok: false }

  const validated = await validateCaseDocumentFile(file)
  if (!validated.ok) return { error: validated.code, ok: false }

  const admin = createAdminClient()
  if (!admin) return { error: "STORAGE_NOT_CONFIGURED", ok: false }

  const userId = engine.userId
  const documentId = randomUUID()
  const path = caseDocumentStoragePath({
    ownerId: userId,
    caseId: rawCaseId,
    documentId,
    fileName: validated.value.name,
  })

  const uploaded = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .upload(path, file, { contentType: validated.value.mime, upsert: false })
  if (uploaded.error) return { error: "UPLOAD_FAILED", ok: false }

  const kind = classifyCaseDocumentKind(rawKind, validated.value.mime)
  const inserted = await engine.repository.attachSourceDocument({
    caseId: rawCaseId,
    path,
    mime: validated.value.mime,
    sizeBytes: validated.value.sizeBytes,
    sha256: await computeSha256(file),
  })

  if (inserted.error || !inserted.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([path])
    return { error: "UPLOAD_FAILED", ok: false }
  }

  const audited = await engine.repository.appendAudit(rawCaseId, "document_intake_added", {
    document_id: inserted.data.id,
    input_type: kind,
    mime: validated.value.mime,
    size_bytes: validated.value.sizeBytes,
    sha256: inserted.data.sha256,
  })

  if (audited.error) {
    // Without the audit entry the upload is not accountable, so it is rolled
    // back rather than left in place unrecorded.
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([path])
    await admin
      .from("source_documents")
      .delete()
      .eq("id", inserted.data.id)
      .eq("owner_id", userId)
    return { error: "UPLOAD_FAILED", ok: false }
  }

  revalidatePath(`/${locale}/guide/${rawCaseId}`)
  return { error: null, ok: true }
}

/**
 * Hashes the file bytes so the stored row can be tied to exactly the content
 * that was validated. The `source_documents.sha256` CHECK requires 64 lowercase
 * hex characters, which is what `crypto.subtle` produces.
 */
async function computeSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}