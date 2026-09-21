"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { deriveMissingInformation } from "@/lib/horizon/case/missing-info"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { caseDocumentStoragePath } from "@/lib/horizon/intake/document"
import { computeSha256 } from "@/lib/horizon/pdf/source"
import { generateLetterPdf } from "@/lib/horizon/pdf/letter-writer"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { assessTerminationTiming, readKuendigungFacts } from "./facts"
import { buildKuendigungLetter } from "./letter"
import { renderLetterBody, renderLetterSubject } from "./manifest"

const CASE_DOCUMENT_BUCKET = "source-documents"

export type KuendigungGenerationState = {
  status: string | null
  detail: string | null
}

/**
 * P14 — prepare a Kündigung draft from confirmed facts.
 *
 * The whole flow is: read confirmed facts, decide the timing honestly, build the
 * letter deterministically, render it to PDF, store the PDF privately, and record
 * a draft whose body carries both the letter text and its provenance so P8's
 * approval binds to exactly these inputs. Nothing here consults a model, and
 * nothing is sent.
 *
 * Refusals are specific rather than generic:
 * - missing/incomplete information: no draft is written, so the user is not given
 *   a letter built on facts the case itself says are absent;
 * - unrepresentable characters: refused rather than transliterated;
 * - storage or audit failure: the stored artifact is removed, so records and
 *   storage never disagree.
 */
export async function prepareKuendigungDraft(
  _previous: KuendigungGenerationState,
  formData: FormData,
): Promise<KuendigungGenerationState> {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof rawCaseId !== "string" || rawCaseId.length === 0) {
    return { status: "case_not_found", detail: null }
  }

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) {
    return { status: "unauthorized", detail: null }
  }
  const userId = engine.userId

  const owned = await engine.repository.getMine(rawCaseId)
  if (owned.error || !owned.data) return { status: "case_not_found", detail: null }

  const factsResult = await engine.repository.listFacts(rawCaseId)
  if (factsResult.error) return { status: "failed", detail: factsResult.error }

  const rawFacts = (factsResult.data ?? []).map((fact) => ({
    key: fact.key,
    value: fact.value,
    confirmedAt: fact.confirmedAt,
    evidence: fact.evidence,
    critical: fact.critical,
  }))

  // The case's own missing-information state is authoritative: a draft is only
  // written when the module considers the inputs complete. This prevents a letter
  // from being produced that the case simultaneously reports as under-specified.
  const missing = deriveMissingInformation(rawFacts, "kuendigung")
  if (!missing.complete) {
    return { status: "not_ready", detail: missing.missingFactKeys.join(",") }
  }

  const facts = readKuendigungFacts(rawFacts)
  const today = new Date().toISOString().slice(0, 10)
  const timing = assessTerminationTiming({ facts, today })

  // The letter is written in German regardless of the user's UI language: it goes
  // to a German provider. The explanation shown beside it follows the UI locale.
  const letter = buildKuendigungLetter({ facts, timing, today, locale: "de" })

  const generatedAt = new Date().toISOString()
  const pdf = await generateLetterPdf({ body: letter.body, letterDateIso: today })
  if (!pdf.ok) return { status: "unsupported_characters", detail: pdf.detail }

  const outputSha256 = await computeSha256(pdf.bytes)

  const body = renderLetterBody({
    letterBody: letter.body,
    manifest: {
      caseId: rawCaseId,
      generatedAt,
      facts,
      timing,
      outputSha256,
      timingRule: timing.rule,
    },
  })
  const subject = renderLetterSubject(facts)

  const admin = createAdminClient()
  if (!admin) return { status: "storage_unavailable", detail: null }

  const storagePath = caseDocumentStoragePath({
    ownerId: userId,
    caseId: rawCaseId,
    documentId: randomUUID(),
    fileName: "Kuendigung.pdf",
  })

  const uploaded = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .upload(storagePath, pdf.bytes, { contentType: "application/pdf", upsert: false })
  if (uploaded.error) return { status: "failed", detail: uploaded.error.message }

  const saved = await engine.repository.saveDraft(rawCaseId, {
    subject,
    body,
    recipient: letter.recipient,
    // Provenance: produced by the engine's own rules, not by a model.
    model: "horizon-kuendigung-engine",
    promptVersion: "kuendigung-rules-v1",
  })
  if (saved.error || !saved.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([storagePath])
    return { status: "failed", detail: saved.error }
  }

  const audited = await engine.repository.appendAudit(rawCaseId, "letter_generated", {
    draft_id: saved.data.id,
    storage_path: storagePath,
    output_sha256: outputSha256,
    timing_kind: timing.kind,
    timing_rule: timing.rule,
    timing_date: timing.date,
    requires_user_verification: timing.requiresUserVerification,
    omitted_fact_keys: letter.omittedFactKeys,
  })
  if (audited.error) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([storagePath])
    return { status: "failed", detail: audited.error }
  }

  revalidatePath(`/${locale}/guide/${rawCaseId}`)
  return { status: "draft_created", detail: null }
}