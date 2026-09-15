import { createClient } from './server'

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  if (!supabase) return { user: null, supabase: null }
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export function assertOwnership(ownerId: string, userId: string) {
  if (ownerId !== userId) throw new Error('Not authorized')
}
