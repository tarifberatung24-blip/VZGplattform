"use server"

import { revalidatePath } from "next/cache"
import { saveDocumentKind, type UnterlagenState } from "./document-kind-service"

export type { UnterlagenState } from "./document-kind-service"

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
  const locale = formData.get("locale")
  const result = await saveDocumentKind({ caseId, kind: formData.get("kind") })
  if (result.ok && typeof caseId === "string" && typeof locale === "string") {
    revalidatePath(`/${locale}/guide/${caseId}`)
  }
  return result
}
