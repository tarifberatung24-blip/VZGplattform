"use server"

import { createClient } from "@/lib/supabase/server"
import { setJourneyRecording } from "./recording"

export async function setJourneyRecordingAction(enabled: boolean): Promise<{ ok: boolean }> {
  if (typeof enabled !== "boolean") return { ok: false }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  return setJourneyRecording(user.id, enabled)
}
