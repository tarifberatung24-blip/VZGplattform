import "server-only"
import { createJourneyDb } from "./db"
import { JOURNEY_PURPOSE, JOURNEY_TEXT_VERSION } from "./events"

export type ConsentSource = "signup" | "settings"

/** True only when the user has an explicit, current opt-in. Any read problem counts as "no consent". */
export async function hasJourneyConsent(userId: string): Promise<boolean> {
  const db = createJourneyDb()
  if (!db) return false
  const { data, error } = await db
    .from("user_consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", JOURNEY_PURPOSE)
    .maybeSingle()
  return !error && data?.granted === true
}

/**
 * Records the user's choice. Withdrawing consent first marks it revoked, then deletes the
 * user's recorded events, so a failure in the second step can be retried without recording more.
 */
export async function setJourneyConsent(userId: string, granted: boolean, source: ConsentSource): Promise<{ ok: boolean }> {
  const db = createJourneyDb()
  if (!db) return { ok: false }
  const now = new Date().toISOString()
  const { error } = await db.from("user_consents").upsert(
    {
      user_id: userId,
      purpose: JOURNEY_PURPOSE,
      granted,
      text_version: JOURNEY_TEXT_VERSION,
      source,
      ...(granted ? { granted_at: now, revoked_at: null } : { revoked_at: now }),
      updated_at: now,
    },
    { onConflict: "user_id,purpose" },
  )
  if (error) return { ok: false }
  if (!granted) {
    const { error: deleteError } = await db.from("product_events").delete().eq("user_id", userId)
    if (deleteError) return { ok: false }
  }
  return { ok: true }
}

/** True when the sign-up checkbox was ticked: stored in the account metadata, or in a short-lived cookie for Google sign-up. */
export function signupConsentIntended(metadata: Record<string, unknown> | undefined, cookieValue: string | undefined): boolean {
  return metadata?.journey_consent === true || cookieValue === "1"
}

/** Applies the sign-up checkbox once. An existing decision, including a later withdrawal, is never overwritten. */
export async function applySignupConsent(userId: string, metadata: Record<string, unknown> | undefined, cookieValue: string | undefined): Promise<void> {
  if (!signupConsentIntended(metadata, cookieValue)) return
  const db = createJourneyDb()
  if (!db) return
  const now = new Date().toISOString()
  try {
    await db.from("user_consents").upsert(
      { user_id: userId, purpose: JOURNEY_PURPOSE, granted: true, text_version: JOURNEY_TEXT_VERSION, source: "signup", granted_at: now, updated_at: now },
      { onConflict: "user_id,purpose", ignoreDuplicates: true },
    )
  } catch {
    // Onboarding must never fail because of this; the user can still opt in from their profile.
  }
}
