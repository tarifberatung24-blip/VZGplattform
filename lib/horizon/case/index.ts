import { createClient } from "@/lib/supabase/server"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { CaseEngineRepository } from "./repository"

export type CaseEngineContext = {
  repository: CaseEngineRepository | null
  userId: string | null
  configured: boolean
}

/**
 * Builds the canonical case engine bound to the authenticated user.
 *
 * Returns `repository: null` when there is no session, so callers cannot
 * accidentally operate an unauthenticated engine. Uses the request-scoped
 * session client (RLS enforced), never a service-role client.
 *
 * `configured` is checked before constructing the client because
 * `createClient()` throws when the public Supabase env is absent. Without this
 * check a preview deployment would return a 500 from every engine-backed page
 * instead of a clean "not configured" state.
 */
export async function createCaseEngine(): Promise<CaseEngineContext> {
  if (!hasSupabaseConfig()) return { repository: null, userId: null, configured: false }

  const client = await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return { repository: null, userId: null, configured: true }

  return {
    repository: new CaseEngineRepository(client, user.id),
    userId: user.id,
    configured: true,
  }
}

export { CaseEngineRepository } from "./repository"