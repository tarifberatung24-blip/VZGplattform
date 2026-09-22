"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "../case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { isDocumentKind } from "./classify"
import { DOCUMENT_KIND_FACT_KEY } from "./analysis"

export type UnterlagenState = {
  error: "invalid_kind" | "unauthorized" | "case_not_found" | "failed" | null
  ok: boolean
}

/**
 * Records the user's correction of a document's classification.
 *
 * Classification is a machine label read from printed cues, so it can be wrong.
 * This is the path by which the user overrides it, and it exists so the label is
 * never presented as beyond dispute. The chosen kind is stored as a confirmed,
 * user-sourced fact — the same confirmation and audit path as every other input —
 * and the audit entry records that this was a user correction, so a later reader
 * can tell a corrected label from an engine-derived one.
 */
export async function confirmDocumentKind(
  _previous: UnterlagenState,
  formData: FormData,
): Promise<UnterlagenState> {
  const caseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawKind = formData.get("kind")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof caseId !== "string" || caseId.length === 0) {
    return { error: "case_not_found", ok: false }
  }
  if (!isDocumentKind(rawKind)) return { error: "invalid_kind", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "case_not_found", ok: false }

  const added = await engine.repository.addFacts(caseId, [
    {
      key: DOCUMENT_KIND_FACT_KEY,
      value: rawKind,
      critical: false,
      evidence: null,
      confidence: 1,
      pageNo: null,
      documentId: null,
    },
  ])
  if (added.error || !added.data) return { error: "failed", ok: false }

  const confirmed = await engine.repository.confirmFact(added.data[0].id)
  if (confirmed.error) return { error: "failed", ok: false }

  await engine.repository.appendAudit(caseId, "document_kind_corrected", { kind: rawKind })

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}
