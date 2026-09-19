import { createClient } from "@/lib/supabase/server"
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
 */
export async function createCaseEngine(): Promise<CaseEngineContext> {
  const client = await createClient()
  if (!client) return { repository: null, userId: null, configured: false }

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