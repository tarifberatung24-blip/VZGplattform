"use server"

import { createClient } from "@/lib/supabase/server"
import { setJourneyConsent } from "./consent"

export async function setJourneyConsentAction(granted: boolean): Promise<{ ok: boolean }> {
  if (typeof granted !== "boolean") return { ok: false }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  return setJourneyConsent(user.id, granted, "settings")
}
