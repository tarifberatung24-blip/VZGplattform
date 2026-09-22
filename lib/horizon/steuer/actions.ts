"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "../case"
import { STEUER_TAX_YEAR_FACT_KEY } from "../case/missing-info"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { resolveTaxYear } from "./registry"

export type SteuerYearState = {
  error: "unsupported_year" | "unknown_year" | "unauthorized" | "case_not_found" | "failed" | null
  ok: boolean
  /** The year actually recorded, when the write succeeded. */
  taxYear: number | null
}

/**
 * Records the tax year the case is about.
 *
 * The year is stored as a confirmed, user-sourced fact so it travels the same
 * confirmation and audit path as every other input rather than a side channel.
 * Choosing a tax year is a statement about which declaration the user is filing,
 * not an eligibility decision the system makes.
 *
 * The year is validated through `resolveTaxYear` *before* anything is written, so
 * an unsupported or unpublished year is refused with a reason instead of being
 * stored and later discovered by the form engine. This is the point where the
 * cross-year rule is enforced on the write path, not just on the read path.
 *
 * Because the repository has no update-value path, re-selecting appends a
 * superseding fact; readers take the newest, matching the Agentur and Jobcenter
 * modules.
 */
export async function selectSteuerYear(
  _previous: SteuerYearState,
  formData: FormData,
): Promise<SteuerYearState> {
  const caseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const rawYear = formData.get("taxYear")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof caseId !== "string" || caseId.length === 0) {
    return { error: "case_not_found", ok: false, taxYear: null }
  }

  const resolved = resolveTaxYear(rawYear)
  if (!resolved.ok) {
    // Distinguish "that year is not published yet" from "we do not prepare that
    // year", so the UI can explain rather than show a generic failure.
    return {
      error: resolved.state === "not_yet_published" ? "unsupported_year" : "unknown_year",
      ok: false,
      taxYear: null,
    }
  }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false, taxYear: null }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "case_not_found", ok: false, taxYear: null }

  const existing = await engine.repository.listFacts(caseId)
  if (existing.error) return { error: "failed", ok: false, taxYear: null }

  const priorYearFacts = (existing.data ?? []).filter(
    (fact) => fact.key === STEUER_TAX_YEAR_FACT_KEY,
  )

  const added = await engine.repository.addFacts(caseId, [
    {
      key: STEUER_TAX_YEAR_FACT_KEY,
      value: String(resolved.taxYear),
      critical: true,
      evidence: null,
      confidence: 1,
      pageNo: null,
      documentId: null,
    },
  ])
  if (added.error || !added.data) return { error: "failed", ok: false, taxYear: null }

  const created = added.data[0]
  const confirmed = await engine.repository.confirmFact(created.id)
  if (confirmed.error) return { error: "failed", ok: false, taxYear: null }

  await engine.repository.appendAudit(caseId, "steuer_year_selected", {
    tax_year: resolved.taxYear,
    superseded: priorYearFacts.length,
  })

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true, taxYear: resolved.taxYear }
}
