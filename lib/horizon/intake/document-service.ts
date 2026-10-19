import "server-only"

import { randomUUID } from "node:crypto"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
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
 * Stores a validated document on the owner-scoped case spine.
 *
 * The authorization and integrity rules intentionally stay here rather than in
 * the client. The API route below is merely a stable transport for it.
 */
export async function saveDocumentIntake(input: {
  caseId: unknown
  kind: unknown
  file: unknown
}): Promise<DocumentIntakeState> {
  if (typeof input.caseId !== "string" || input.caseId.length === 0) {
    return { error: "missing_case", ok: false }
  }
  if (!(input.file instanceof File)) return { error: "missing_file", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) return { error: "UNAUTHORIZED", ok: false }

  const owned = await engine.repository.getMine(input.caseId)
  if (owned.error || !owned.data) return { error: "CASE_NOT_FOUND", ok: false }

  const validated = await validateCaseDocumentFile(input.file)
  if (!validated.ok) return { error: validated.code, ok: false }

  const admin = createAdminClient()
  if (!admin) return { error: "STORAGE_NOT_CONFIGURED", ok: false }

  const documentId = randomUUID()
  const path = caseDocumentStoragePath({
    ownerId: engine.userId,
    caseId: input.caseId,
    documentId,
    fileName: validated.value.name,
  })
  const uploaded = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .upload(path, input.file, { contentType: validated.value.mime, upsert: false })
  if (uploaded.error) return { error: "UPLOAD_FAILED", ok: false }

  const inserted = await engine.repository.attachSourceDocument({
    caseId: input.caseId,
    path,
    mime: validated.value.mime,
    sizeBytes: validated.value.sizeBytes,
    sha256: await computeSha256(input.file),
  })

  if (inserted.error || !inserted.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([path])
    return { error: "UPLOAD_FAILED", ok: false }
  }

  const audited = await engine.repository.appendAudit(input.caseId, "document_intake_added", {
    document_id: inserted.data.id,
    input_type: classifyCaseDocumentKind(input.kind, validated.value.mime),
    mime: validated.value.mime,
    size_bytes: validated.value.sizeBytes,
    sha256: inserted.data.sha256,
  })
  if (audited.error) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([path])
    await admin.from("source_documents").delete().eq("id", inserted.data.id).eq("owner_id", engine.userId)
    return { error: "UPLOAD_FAILED", ok: false }
  }

  return { error: null, ok: true }
}

async function computeSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
