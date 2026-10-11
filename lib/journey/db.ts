import "server-only"
import { createClient } from "@supabase/supabase-js"

/** Service-role client for the journey tables. Server code only; never import from a client component. */
export function createJourneyDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
