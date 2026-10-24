"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import type { HorizonCaseAction } from "@/lib/horizon/case/contract"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"

export type ClosureState = {
  error: "missing_case" | "FAILED" | "NOT_ALLOWED" | null
  ok: boolean
}

function resolveContext(formData: FormData): { caseId: string | null; locale: Locale } {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  return {
    caseId: typeof rawCaseId === "string" && rawCaseId.length > 0 ? rawCaseId : null,
    locale,
  }
}

/**
 * Closes or reopens a case.
 *
 * `complete` and `reopen` are the two edges that touch a terminal case, and they
 * are the only lifecycle moves the user makes on their own authority — every
 * other status follows from an artefact (a document, a draft, an approval, a
 * delivery). The transition table still decides whether the move is legal, so a
 * case that never reached `action_ready` cannot be closed from here; this action
 * asks for the move rather than forcing a status.
 *
 * Reopen is offered for the same reason it exists in the table: a closed case is
 * not deleted, and a customer who hears back from an authority must be able to
 * continue the same case instead of opening a second one.
 */
async function applyClosure(
  formData: FormData,
  action: Extract<HorizonCaseAction, "complete" | "reopen">,
): Promise<ClosureState> {
  const { caseId, locale } = resolveContext(formData)
  if (!caseId) return { error: "missing_case", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "FAILED", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "missing_case", ok: false }

  const result = await engine.repository.applyAction(caseId, action)
  if (result.error || !result.data) {
    // The repository refuses an illegal move by message; the caller only needs to
    // know it was not allowed, not the internal transition wording.
    return { error: "NOT_ALLOWED", ok: false }
  }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}

export async function completeCase(
  _previous: ClosureState,
  formData: FormData,
): Promise<ClosureState> {
  return applyClosure(formData, "complete")
}

export async function reopenCase(
  _previous: ClosureState,
  formData: FormData,
): Promise<ClosureState> {
  return applyClosure(formData, "reopen")
}
