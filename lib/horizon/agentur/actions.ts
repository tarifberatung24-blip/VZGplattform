"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { AGENTUR_TASK_FACT_KEY } from "@/lib/horizon/case/missing-info"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { isAgenturTask } from "./registry"

export type AgenturTaskState = { error: string | null; ok: boolean }

/**
 * Records the chosen Agentur-für-Arbeit task on a case.
 *
 * The task is stored as a confirmed fact, so it flows through the same
 * confirmation and audit path as every other input rather than through a
 * side-channel. Selecting a task is a statement by the user about their own
 * situation — not an eligibility decision the system makes about them — so it is
 * written as a user-sourced, confirmed fact.
 *
 * Ownership is re-checked by the repository before the write, so a forged case id
 * fails exactly where a missing one does.
 */
export async function selectAgenturTask(
  _previous: AgenturTaskState,
  formData: FormData,
): Promise<AgenturTaskState> {
  const caseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawTask = formData.get("task")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof caseId !== "string" || caseId.length === 0) {
    return { error: "case_not_found", ok: false }
  }
  if (!isAgenturTask(rawTask)) return { error: "unknown_task", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "case_not_found", ok: false }

  // Re-selecting a different task would leave the previous value in place and
  // make `missing-info` read a stale selection, so the existing fact is confirmed
  // in place. The repository has no update-value path, so a superseding fact is
  // added and the newest one wins when the task is read back.
  const existing = await engine.repository.listFacts(caseId)
  if (existing.error) return { error: "failed", ok: false }

  const priorTaskFacts = (existing.data ?? []).filter((fact) => fact.key === AGENTUR_TASK_FACT_KEY)

  const added = await engine.repository.addFacts(caseId, [
    {
      key: AGENTUR_TASK_FACT_KEY,
      value: rawTask,
      critical: true,
      evidence: null,
      confidence: 1,
      pageNo: null,
      documentId: null,
    },
  ])
  if (added.error || !added.data) return { error: "failed", ok: false }

  const created = added.data[0]
  const confirmed = await engine.repository.confirmFact(created.id)
  if (confirmed.error) return { error: "failed", ok: false }

  await engine.repository.appendAudit(caseId, "agentur_task_selected", {
    task: rawTask,
    superseded: priorTaskFacts.length,
  })

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}
