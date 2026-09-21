"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { JOBCENTER_TASK_FACT_KEY } from "@/lib/horizon/case/missing-info"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { isJobcenterTask } from "./registry"

export type JobcenterTaskState = { error: string | null; ok: boolean }

/**
 * Records the chosen Jobcenter task on a case.
 *
 * Stored as a confirmed, user-sourced fact so it travels the same confirmation and
 * audit path as every other input rather than a side channel. Selecting a task is
 * a statement about the user's own situation, not an eligibility decision the
 * system makes, so it is written as confirmed.
 *
 * Because the repository has no update-value path, re-selecting appends a
 * superseding fact; readers take the newest, matching the Agentur module.
 */
export async function selectJobcenterTask(
  _previous: JobcenterTaskState,
  formData: FormData,
): Promise<JobcenterTaskState> {
  const caseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawTask = formData.get("task")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof caseId !== "string" || caseId.length === 0) {
    return { error: "case_not_found", ok: false }
  }
  if (!isJobcenterTask(rawTask)) return { error: "unknown_task", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "case_not_found", ok: false }

  const existing = await engine.repository.listFacts(caseId)
  if (existing.error) return { error: "failed", ok: false }

  const priorTaskFacts = (existing.data ?? []).filter(
    (fact) => fact.key === JOBCENTER_TASK_FACT_KEY,
  )

  const added = await engine.repository.addFacts(caseId, [
    {
      key: JOBCENTER_TASK_FACT_KEY,
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

  await engine.repository.appendAudit(caseId, "jobcenter_task_selected", {
    task: rawTask,
    superseded: priorTaskFacts.length,
  })

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}
