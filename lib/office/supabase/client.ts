import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  try { new URL(url); return createBrowserClient<Database>(url, key) } catch { return null }
}
