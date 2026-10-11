"use server"

import { createClient } from "@/lib/supabase/server"
import { recordTermsAcceptance } from "./terms"

/** Records that the signed-in user accepted the current terms on the confirmation screen. */
export async function acceptTermsAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  return recordTermsAcceptance(user.id, "gate")
}
