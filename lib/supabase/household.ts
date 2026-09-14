import type { SupabaseClient } from "@supabase/supabase-js"

export async function ensureHousehold(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_kintex_household")
  if (error || typeof data !== "string") throw new Error("HOUSEHOLD_NOT_AVAILABLE")
  return data
}
