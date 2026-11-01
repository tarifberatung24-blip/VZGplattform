/**
 * Forum contract constants mirrored for the Steward.
 *
 * The Steward runs as a standalone Node script and cannot import the application
 * TypeScript module `lib/forum/contract.ts`, so the values it must respect are
 * restated here. They are asserted against the real contract by a test, so a
 * change to the forum limits fails the Steward's checks instead of silently
 * producing drafts the composer would reject.
 *
 * Source of truth: `lib/forum/contract.ts` and `lib/forum/copy.ts`.
 */

/** Mirrors `forumOfficialTopics` in lib/forum/contract.ts. */
export const FORUM_OFFICIAL_TOPICS = ["platform", "law", "promotion", "innovation"]

/** Mirrors `forumMemberCategories` in lib/forum/contract.ts. */
export const FORUM_MEMBER_CATEGORIES = ["community", "feedback"]

/** Mirrors the zod field limits in lib/forum/contract.ts. */
export const FORUM_LIMITS = {
  titleMin: 3,
  titleMax: 140,
  bodyMin: 1,
  bodyMax: 5000,
  commentBodyMax: 4000,
  reportReasonMax: 500,
}

/** The forum rules text a draft must not contradict. Mirrors lib/forum/copy.ts. */
export const FORUM_RULES_BG =
  "Не публикувай лични данни, документи, адреси, номера на случаи или правни съвети за конкретен човек."

/**
 * Validate a draft against the forum contract before it is written into a
 * report, so an over-long draft is caught here rather than at a composer a human
 * later pastes it into.
 */
export function validateForumDraft(draft) {
  const errors = []
  if (!draft || typeof draft !== "object") return { valid: false, errors: ["draft is not an object"] }

  if (!FORUM_OFFICIAL_TOPICS.includes(draft.topic)) {
    errors.push(`topic must be one of ${FORUM_OFFICIAL_TOPICS.join(", ")}`)
  }
  const title = typeof draft.title === "string" ? draft.title.trim() : ""
  if (title.length < FORUM_LIMITS.titleMin) errors.push(`title must be at least ${FORUM_LIMITS.titleMin} characters`)
  if (title.length > FORUM_LIMITS.titleMax) errors.push(`title must be at most ${FORUM_LIMITS.titleMax} characters`)

  const body = typeof draft.body === "string" ? draft.body.trim() : ""
  if (body.length < FORUM_LIMITS.bodyMin) errors.push(`body must be at least ${FORUM_LIMITS.bodyMin} character`)
  if (body.length > FORUM_LIMITS.bodyMax) errors.push(`body must be at most ${FORUM_LIMITS.bodyMax} characters`)

  if (draft.publishable !== false) errors.push("draft must not be publishable")
  if (draft.status !== "draft_requires_human_review") errors.push("draft status must be draft_requires_human_review")

  return { valid: errors.length === 0, errors }
}
