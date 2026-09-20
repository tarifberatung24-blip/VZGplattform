"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { caseDocumentStoragePath } from "@/lib/horizon/intake/document"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { findTemplateById } from "./registry"
import { computeSha256 } from "./source"
import { renderSignatureBody, renderSignatureSubject } from "./manifest"
import { detectSignatureImageFormat, planSignature, SIGNATURE_IMAGE_MAX_BYTES } from "./signature-plan"
import { signaturePlacementForTemplate } from "./signature-map"
import { applyVisualSignature } from "./signature-writer"

export type SignatureState = {
  status:
    | "signed"
    | "document_not_found"
    | "no_verified_placement"
    | "not_approved"
    | "approval_stale"
    | "document_hash_mismatch"
    | "unsupported_image_format"
    | "image_too_large"
    | "image_empty"
    | "date_required"
    | "not_confirmed"
    | "case_not_found"
    | "storage_unavailable"
    | "failed"
    | null
  detail: string | null
  /** Set when signing cannot be offered and the user must sign by hand. */
  manualPath: string | null
}

const CASE_DOCUMENT_BUCKET = "source-documents"

/** The engine's own marker for the generated artifact's hash, as rendered into a draft body. */
const OUTPUT_SHA_LINE_PREFIX = "Ausgabe-SHA-256: "

function readOutputShaFromBody(body: string): string | null {
  const line = body
    .split("\n")
    .find((candidate) => candidate.startsWith(OUTPUT_SHA_LINE_PREFIX))
  if (!line) return null
  const value = line.slice(OUTPUT_SHA_LINE_PREFIX.length).trim()
  return /^[0-9a-f]{64}$/.test(value) ? value : null
}

/**
 * P10 — apply a visual signature to the exact approved generated document.
 *
 * **The chain this walks, and why each link is checked by value.** The artifact to
 * sign is located from the newest `pdf_form_generated` audit event, which recorded
 * the storage path and the output SHA-256 at generation time. The bytes are then
 * downloaded and hashed again: the download must still hash to the recorded value,
 * so a replaced or truncated object is refused rather than signed. The draft for
 * that generation is matched by the artifact hash it recorded in its body, and its
 * approval must still match its current content hash — if any input changed after
 * approval, the draft hash moved and the approval stops matching on its own, with
 * no rewrite of any historic approval row.
 *
 * Only when all of that holds is the signature drawn, and it is drawn onto a
 * *copy*: the approved artifact is never mutated.
 *
 * **What this is not.** The result is a visual signature. No certificate, no
 * cryptographic binding, no PAdES, no qualified or advanced electronic signature.
 * The unsigned and signed hashes are recorded so the step is auditable, but the
 * hash chain proves *what was signed*, not *who signed it* in any legal sense.
 *
 * Storage mirrors the intake and P9 paths: private bucket, owner-prefixed key, and
 * rollback of the uploaded object if any later write fails, so storage and records
 * never disagree.
 */
export async function signGeneratedDocument(
  _previous: SignatureState,
  formData: FormData,
): Promise<SignatureState> {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawDate = formData.get("signatureDate")
  const rawConfirm = formData.get("confirmSignature")
  const image = formData.get("signatureImage")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof rawCaseId !== "string" || rawCaseId.length === 0) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }
  if (!(image instanceof File) || image.size === 0) {
    return { status: "image_empty", detail: null, manualPath: null }
  }
  if (image.size > SIGNATURE_IMAGE_MAX_BYTES) {
    return { status: "image_too_large", detail: null, manualPath: null }
  }
  if (typeof rawDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return { status: "date_required", detail: null, manualPath: null }
  }
  // Explicit intent, not merely a filled-in form. Without this the request is not
  // a signature request.
  if (rawConfirm !== "on") {
    return { status: "not_confirmed", detail: null, manualPath: null }
  }

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }
  const userId = engine.userId

  const owned = await engine.repository.getMine(rawCaseId)
  if (owned.error || !owned.data) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }

  // The newest generation for this case, per the audit trail.
  const audit = await engine.repository.listAudit(rawCaseId)
  if (audit.error) return { status: "failed", detail: audit.error, manualPath: null }
  const generated = (audit.data ?? []).find((event) => event.action === "pdf_form_generated")
  if (!generated) {
    return { status: "document_not_found", detail: null, manualPath: null }
  }

  const templateId = typeof generated.metadata.template_id === "string" ? generated.metadata.template_id : null
  const storagePath = typeof generated.metadata.storage_path === "string" ? generated.metadata.storage_path : null
  const recordedOutputSha =
    typeof generated.metadata.output_sha256 === "string" ? generated.metadata.output_sha256 : null
  const recordedTemplateSha =
    typeof generated.metadata.source_sha256 === "string" ? generated.metadata.source_sha256 : null

  if (!templateId || !storagePath || !recordedOutputSha || !recordedTemplateSha) {
    return { status: "document_not_found", detail: null, manualPath: null }
  }

  const template = findTemplateById(templateId)
  if (!template) return { status: "document_not_found", detail: null, manualPath: null }

  // Rule 6/7 — an unverified placement is refused, and the user is sent to the
  // official form to sign by hand rather than given a guessed position.
  const placement = signaturePlacementForTemplate({
    templateId: template.id,
    templateSourceSha256: recordedTemplateSha,
    taxYear: template.taxYear,
  })
  if (!placement) {
    return { status: "no_verified_placement", detail: null, manualPath: template.officialSource }
  }

  // The draft that approved this exact artifact, matched by the hash it recorded.
  const drafts = await engine.repository.listDrafts(rawCaseId)
  if (drafts.error) return { status: "failed", detail: drafts.error, manualPath: null }
  const sourceDraft = (drafts.data ?? []).find(
    (draft) => readOutputShaFromBody(draft.body) === recordedOutputSha,
  )
  if (!sourceDraft) {
    return { status: "document_not_found", detail: null, manualPath: null }
  }

  const approvalState = await engine.repository.getApprovalState(sourceDraft.id)
  if (approvalState.error) return { status: "failed", detail: approvalState.error, manualPath: null }
  if (!approvalState.data?.approved) {
    return { status: "not_approved", detail: null, manualPath: null }
  }

  const approvals = await engine.repository.listApprovals(rawCaseId)
  if (approvals.error) return { status: "failed", detail: approvals.error, manualPath: null }
  const approval = (approvals.data ?? []).find(
    (entry) => entry.draftId === sourceDraft.id,
  )
  if (!approval) return { status: "not_approved", detail: null, manualPath: null }
  if (approval.approvedHash !== sourceDraft.contentHash) {
    return { status: "approval_stale", detail: null, manualPath: null }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { status: "storage_unavailable", detail: null, manualPath: null }
  }

  const downloaded = await admin.storage.from(CASE_DOCUMENT_BUCKET).download(storagePath)
  if (downloaded.error || !downloaded.data) {
    return { status: "document_not_found", detail: null, manualPath: null }
  }
  const unsignedBytes = new Uint8Array(await downloaded.data.arrayBuffer())

  // Verified by value: the object being signed must still be the exact artifact
  // that was generated and approved, not merely the one at that path.
  const unsignedSha256 = await computeSha256(unsignedBytes)
  if (unsignedSha256 !== recordedOutputSha) {
    return { status: "document_hash_mismatch", detail: null, manualPath: null }
  }

  const imageBytes = new Uint8Array(await image.arrayBuffer())
  if (!detectSignatureImageFormat(imageBytes)) {
    return { status: "unsupported_image_format", detail: null, manualPath: null }
  }

  const planned = planSignature({
    // Taken from the audit trail, which is where generation recorded these values.
    manifest: {
      sourceSha256: recordedTemplateSha,
      outputSha256: recordedOutputSha,
      caseId: rawCaseId,
    },
    expectedCaseId: rawCaseId,
    unsignedSha256,
    templateSourceSha256: recordedTemplateSha,
    placement,
    imageBytes,
    approvedHash: approval.approvedHash,
    manifestContentHash: sourceDraft.contentHash,
    dateIso: rawDate,
    confirmed: true,
  })
  if (!planned.ok) {
    const status: SignatureState["status"] =
      planned.code === "no_verified_placement"
        ? "no_verified_placement"
        : planned.code === "approval_stale"
          ? "approval_stale"
          : planned.code === "approval_missing"
            ? "not_approved"
            : planned.code === "document_hash_mismatch" || planned.code === "template_hash_mismatch"
              ? "document_hash_mismatch"
              : planned.code === "not_confirmed"
                ? "not_confirmed"
                : planned.code === "image_empty"
                  ? "image_empty"
                  : planned.code === "image_too_large"
                    ? "image_too_large"
                    : planned.code === "unsupported_image_format"
                      ? "unsupported_image_format"
                      : planned.code === "date_unsupported"
                        ? "date_required"
                        : "failed"
    return { status, detail: planned.detail, manualPath: null }
  }

  const written = await applyVisualSignature({
    unsignedBytes,
    plan: planned.plan,
    imageBytes,
  })
  if (!written.ok) {
    return { status: "failed", detail: written.code, manualPath: null }
  }

  const signedAt = new Date().toISOString()
  const signedPath = caseDocumentStoragePath({
    ownerId: userId,
    caseId: rawCaseId,
    documentId: randomUUID(),
    fileName: `signiert_${template.formName.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`,
  })

  const uploaded = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .upload(signedPath, written.bytes, { contentType: "application/pdf", upsert: false })
  if (uploaded.error) {
    return { status: "failed", detail: uploaded.error.message, manualPath: null }
  }

  const attached = await engine.repository.attachSourceDocument({
    caseId: rawCaseId,
    path: signedPath,
    mime: "application/pdf",
    sizeBytes: written.bytes.byteLength,
    sha256: written.signedSha256,
  })
  if (attached.error || !attached.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([signedPath])
    return { status: "failed", detail: attached.error, manualPath: null }
  }

  const saved = await engine.repository.saveDraft(rawCaseId, {
    subject: renderSignatureSubject(template.formName),
    body: renderSignatureBody(
      {
        signatureType: "VISUAL",
        caseId: rawCaseId,
        sourceDocumentId: sourceDraft.id,
        unsignedSha256,
        signedSha256: written.signedSha256,
        approvalContentHash: approval.approvedHash,
        signerId: userId,
        signedAt,
        page: written.page,
        placementVersion: placement.placementVersion,
        templateId: template.id,
        templateSourceSha256: recordedTemplateSha,
      },
      sourceDraft.body,
    ),
    recipient: null,
    // Provenance: the engine applied the signature, not an AI model.
    model: "horizon-signature-engine",
    promptVersion: placement.placementVersion,
  })
  if (saved.error || !saved.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([signedPath])
    return { status: "failed", detail: saved.error, manualPath: null }
  }

  const audited = await engine.repository.appendAudit(rawCaseId, "pdf_signature_applied", {
    signature_type: "VISUAL",
    template_id: template.id,
    source_document_id: sourceDraft.id,
    signed_document_id: attached.data.id,
    unsigned_sha256: unsignedSha256,
    signed_sha256: written.signedSha256,
    approval_content_hash: approval.approvedHash,
    placement_version: placement.placementVersion,
    page: written.page,
    signed_at: signedAt,
    storage_path: signedPath,
  })
  if (audited.error) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([signedPath])
    await admin
      .from("source_documents")
      .delete()
      .eq("id", attached.data.id)
      .eq("owner_id", userId)
    return { status: "failed", detail: audited.error, manualPath: null }
  }

  revalidatePath(`/${locale}/guide/${rawCaseId}`)
  return { status: "signed", detail: null, manualPath: null }
}