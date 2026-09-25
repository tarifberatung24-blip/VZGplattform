/**
 * Public Supabase credentials for the office clients (P12–P17 module surfaces).
 *
 * Both public key names are accepted, matching `lib/supabase/config.ts`. When
 * only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` was read, a deployment configured
 * with the documented primary `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
 * `.env.example`) silently fell back to the preview repository and every office
 * write failed with `Supabase is not configured`.
 */
export function resolveOfficeSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    new URL(url)
    return { url, key }
  } catch {
    return null
  }
}
