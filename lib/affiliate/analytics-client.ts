import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only client for the affiliate analytics tables.
 *
 * Both `affiliate_requests` and `affiliate_click_events` are service-role only,
 * so this needs the secret key, never the public anon key. Returns null when the
 * configuration is missing so callers degrade to "no measurement" instead of
 * throwing inside a public route.
 */
export function createAffiliateAnalyticsClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  } catch {
    return null
  }
}
