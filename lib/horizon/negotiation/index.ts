import "server-only"

import { createClient } from "@/lib/supabase/server"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { NegotiationRepository } from "./repository"

export type NegotiationEngineContext = {
  repository: NegotiationRepository | null
  userId: string | null
  configured: boolean
}

/**
 * Builds the negotiation repository bound to the authenticated user.
 *
 * Mirrors `createCaseEngine`: returns `repository: null` when there is no
 * session, so an unauthenticated caller cannot operate an engine, and checks the
 * public Supabase config first so a preview deployment renders a clean "not
 * configured" state instead of throwing.
 */
export async function createNegotiationEngine(): Promise<NegotiationEngineContext> {
  if (!hasSupabaseConfig()) return { repository: null, userId: null, configured: false }

  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return { repository: null, userId: null, configured: true }

  return {
    repository: new NegotiationRepository(client, user.id),
    userId: user.id,
    configured: true,
  }
}

export { NegotiationRepository } from "./repository"
