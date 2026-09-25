import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database'
import { resolveOfficeSupabaseConfig } from './public-config'

export function createClient() {
  const config = resolveOfficeSupabaseConfig()
  if (!config) return null
  return createBrowserClient<Database>(config.url, config.key)
}
