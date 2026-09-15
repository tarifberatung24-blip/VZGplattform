import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Locale } from '../supabase/database'

export type ProfilePreferences = { display_name: string; locale: Locale; conversation_locale: Locale; output_locale: Locale }
export async function upsertOwnProfile(client: SupabaseClient<Database>, userId: string, input: ProfilePreferences) {
  const { data, error } = await client.from('profiles').upsert({ id: userId, ...input }, { onConflict: 'id' }).select('*').single()
  return { data, error: error?.message ?? null }
}
