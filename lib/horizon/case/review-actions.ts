"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { DRAFT_REVIEW_STATUSES, type DraftReviewStatus } from "@/lib/horizon/case/contract"
import { canApproveDraft, type DraftReleaseBlocker } from "@/lib/horizon/case/release"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"

export type DraftReviewState = {
  error: DraftReleaseBlocker | "missing_draft" | "missing_case" | "ACKNOWLEDGEMENT_REQUIRED" | "FAILED" | null
  ok: boolean
}

function resolveContext(formData: FormData): { caseId: string | null; locale: Locale } {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  return { caseId: typeof rawCaseId === "string" && rawCaseId.length > 0 ? rawCaseId : null, locale }
}

function isReviewStatus(value: unknown): value is DraftReviewStatus {
  return typeof value === "string" && (DRAFT_REVIEW_STATUSES as readonly string[]).includes(value)
}

/**
 * P8 — set a draft's review status.
 *
 * Review is a separate, weaker act than approval: it records that the text was
 * looked at and whether it needs revision. It grants no permission to export or
 * send, and approval remains a distinct write the user must make themselves.
 */
export async function submitDraftReview(
  _previous: DraftReviewState,
  formData: FormData,
): Promise<DraftReviewState> {
  const { caseId, locale } = resolveContext(formData)
  const rawDraftId = formData.get("draftId")
  const rawStatus = formData.get("status")

  if (!caseId) return { error: "missing_case", ok: false }
  if (typeof rawDraftId !== "string" || rawDraftId.length === 0) {
    return { error: "missing_draft", ok: false }
  }
  if (!isReviewStatus(rawStatus)) return { error: "FAILED", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "FAILED", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "missing_case", ok: false }

  const result = await engine.repository.setDraftReviewStatus(rawDraftId, rawStatus)
  if (result.error || !result.data) return { error: "FAILED", ok: false }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}

/**
 * P8 — record explicit user approval of a draft's current content.
 *
 * Approval is refused while facts the draft depends on are still unconfirmed. A
 * draft generated from an unverified fact must not collect an approval that
 * appears to endorse a fact the user never checked, so the gate is enforced here
 * and not only in the interface.
 *
 * The acknowledgement checkbox is required for the same reason: approving
 * correspondence that will go to an authority is a deliberate act, and the
 * server refuses an approval request that did not carry it rather than trusting
 * the form to have shown it.
 *
 * The repository binds the approval to the draft's current `content_hash`, and
 * the `approvals` foreign key to `(id, owner_id, content_hash)` means approving
 * another user's draft, or a hash the draft never had, is impossible at the
 * database level even if this check were bypassed.
 */
export async function submitDraftApproval(
  _previous: DraftReviewState,
  formData: FormData,
): Promise<DraftReviewState> {
  const { caseId, locale } = resolveContext(formData)
  const rawDraftId = formData.get("draftId")
  const acknowledged = formData.get("acknowledged")

  if (!caseId) return { error: "missing_case", ok: false }
  if (typeof rawDraftId !== "string" || rawDraftId.length === 0) {
    return { error: "missing_draft", ok: false }
  }
  if (acknowledged !== "yes") return { error: "ACKNOWLEDGEMENT_REQUIRED", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "FAILED", ok: false }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) return { error: "missing_case", ok: false }

  const drafts = await engine.repository.listDrafts(caseId)
  if (drafts.error) return { error: "FAILED", ok: false }
  const draft = (drafts.data ?? []).find((candidate) => candidate.id === rawDraftId) ?? null

  const missing = await engine.repository.getMissingInformation(caseId)
  if (missing.error) return { error: "FAILED", ok: false }

  const gate = canApproveDraft({ draft, missing: missing.data ?? null })
  if (!gate.allowed) return { error: gate.reason ?? "FAILED", ok: false }

  const result = await engine.repository.recordApproval(rawDraftId)
  if (result.error || !result.data) return { error: "FAILED", ok: false }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { error: null, ok: true }
}
