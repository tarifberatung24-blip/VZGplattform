"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { isTextIntakeKind } from "./text"

export type TextIntakeState = { error: string | null; ok: boolean }

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
  const rawLocale = formData.get("locale")
  const rawKind = formData.get("kind")
  const rawText = formData.get("text")

  const locale: Locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  if (typeof caseId !== "string" || caseId.length === 0) return { error: "missing_case", ok: false }
  if (!isTextIntakeKind(rawKind)) return { error: "unknown_kind", ok: false }
  if (typeof rawText !== "string") return { error: "empty", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const result = await engine.repository.addTextIntake(caseId, {
    text: rawText,
    kind: rawKind,
    locale,
  })
  if (result.error) return { error: result.error, ok: false }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}