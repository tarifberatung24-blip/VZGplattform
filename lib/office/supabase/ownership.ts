import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database'

export function assertSameUser(resourceOwnerId: string, authenticatedUserId: string) {
  if (resourceOwnerId !== authenticatedUserId) throw new Error('Not authorized')
}

export async function assertOwnedCase(client: SupabaseClient<Database>, caseId: string, userId: string) {
  const { data, error } = await client.from('cases').select('id, owner_id').eq('id', caseId).eq('owner_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Case not found')
  return data
}
