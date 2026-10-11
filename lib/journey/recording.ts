import "server-only"
import { createJourneyDb } from "./db"
import { JOURNEY_NOTICE_VERSION, JOURNEY_PURPOSE } from "./events"

/**
 * Recording is on by default for signed-in users. A `user_consents` row with `granted = false`
 * is the user's objection and switches it off. Any read problem counts as "off", so a failure
 * can never record someone who objected.
 */
export async function isJourneyRecordingEnabled(userId: string): Promise<boolean> {
  const db = createJourneyDb()
  if (!db) return false
  const { data, error } = await db
    .from("user_consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", JOURNEY_PURPOSE)
    .maybeSingle()
  if (error) return false
  return data?.granted !== false
}

/**
 * Stores the user's choice. Switching recording off first records the objection, then deletes the
 * user's recorded events, so a failure in the second step can be retried without recording more.
 */
export async function setJourneyRecording(userId: string, enabled: boolean): Promise<{ ok: boolean }> {
  const db = createJourneyDb()
  if (!db) return { ok: false }
  const now = new Date().toISOString()
  const { error } = await db.from("user_consents").upsert(
    {
      user_id: userId,
      purpose: JOURNEY_PURPOSE,
      granted: enabled,
      text_version: JOURNEY_NOTICE_VERSION,
      source: "settings",
      ...(enabled ? { granted_at: now, revoked_at: null } : { revoked_at: now }),
      updated_at: now,
    },
    { onConflict: "user_id,purpose" },
  )
  if (error) return { ok: false }
  if (!enabled) {
    const { error: deleteError } = await db.from("product_events").delete().eq("user_id", userId)
    if (deleteError) return { ok: false }
  }
  return { ok: true }
}
