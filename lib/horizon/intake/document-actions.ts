"use server"

import { revalidatePath } from "next/cache"
import { saveDocumentIntake, type DocumentIntakeState } from "./document-service"

export type { DocumentIntakeState } from "./document-service"

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
  const caseId = formData.get("caseId")
  const locale = formData.get("locale")
  const result = await saveDocumentIntake({
    caseId,
    kind: formData.get("kind"),
    file: formData.get("file"),
  })
  if (result.ok && typeof caseId === "string" && typeof locale === "string") {
    revalidatePath(`/${locale}/guide/${caseId}`)
  }
  return result
}
