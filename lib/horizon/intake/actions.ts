"use server"

import { revalidatePath } from "next/cache"
import { saveTextIntake, type TextIntakeState } from "./text-service"

export type { TextIntakeState } from "./text-service"

/**
 * Server action for P6 text intake.
 *
 * The case id and locale travel in the form body; the repository re-checks
 * ownership before writing, so a forged case id fails at the same place a
 * missing one does. Text is stored verbatim — no fact, deadline or recipient is
 * derived from it here.
 */
export async function submitTextIntake(
  _previous: TextIntakeState,
  formData: FormData,
): Promise<TextIntakeState> {
  const caseId = formData.get("caseId")
  const locale = formData.get("locale")
  const result = await saveTextIntake({
    caseId,
    locale,
    kind: formData.get("kind"),
    text: formData.get("text"),
  })
  if (result.ok && typeof caseId === "string" && typeof locale === "string") {
    revalidatePath(`/${locale}/guide/${caseId}`)
  }
  return result
}
