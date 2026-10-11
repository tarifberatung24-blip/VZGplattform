import "server-only"
import { createJourneyDb } from "./db"
import { TERMS_VERSION } from "./keys"

export const TERMS_PURPOSE = "terms_and_privacy" as const
export type TermsSource = "signup" | "gate"

/** True when the sign-up checkbox was ticked for the current version: account metadata (e-mail, phone) or a short-lived cookie (Google). */
export function termsIntentGiven(metadata: Record<string, unknown> | undefined, cookieValue: string | undefined): boolean {
  return metadata?.terms_accepted_version === TERMS_VERSION || cookieValue === TERMS_VERSION
}

/** True when this account has accepted the current version of the terms. A read problem counts as "not accepted". */
export async function hasAcceptedTerms(userId: string): Promise<boolean> {
  const db = createJourneyDb()
  if (!db) return false
  const { data, error } = await db
    .from("user_consents")
    .select("granted, text_version")
    .eq("user_id", userId)
    .eq("purpose", TERMS_PURPOSE)
    .maybeSingle()
  return !error && data?.granted === true && data.text_version === TERMS_VERSION
}

export async function recordTermsAcceptance(userId: string, source: TermsSource): Promise<{ ok: boolean }> {
  const db = createJourneyDb()
  if (!db) return { ok: false }
  const now = new Date().toISOString()
  const { error } = await db.from("user_consents").upsert(
    { user_id: userId, purpose: TERMS_PURPOSE, granted: true, text_version: TERMS_VERSION, source, granted_at: now, revoked_at: null, updated_at: now },
    { onConflict: "user_id,purpose" },
  )
  return { ok: !error }
}

/**
 * True when the account has accepted the current terms. The sign-up checkbox counts and is recorded
 * here; an account without it (for example one created through Google on the login page) gets false
 * and is asked before it continues.
 */
export async function ensureTermsAccepted(userId: string, metadata: Record<string, unknown> | undefined, cookieValue: string | undefined): Promise<boolean> {
  if (await hasAcceptedTerms(userId)) return true
  if (!termsIntentGiven(metadata, cookieValue)) return false
  try {
    return (await recordTermsAcceptance(userId, "signup")).ok
  } catch {
    return false
  }
}
