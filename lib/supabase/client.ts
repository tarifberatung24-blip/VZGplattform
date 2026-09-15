import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database"

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  client = createSupabaseClient<Database>(url, key)
  return client
}
