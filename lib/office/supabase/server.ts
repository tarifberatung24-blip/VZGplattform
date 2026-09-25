import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database'
import { resolveOfficeSupabaseConfig } from './public-config'

export async function createClient() {
  const cookieStore = await cookies()
  const config = resolveOfficeSupabaseConfig()
  if (!config) return null
  return createServerClient<Database>(config.url, config.key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } },
  })
}
