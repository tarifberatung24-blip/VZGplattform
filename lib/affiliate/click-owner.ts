import "server-only"
import { createClient } from "../supabase/server"

export type ClickOwner = { userId: string | null; optimizeSessionId: string | null }

const anonymous: ClickOwner = { userId: null, optimizeSessionId: null }

/**
 * Who is clicking, for attribution only. Reads the signed-in user from the
 * session cookie and keeps the Optimize session id only when it belongs to that
 * user (the lookup runs under the user's own RLS). Any failure means an
 * anonymous click: attribution must never block the redirect.
 */
export async function resolveClickOwner(optimizeSessionId: string | null): Promise<ClickOwner> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return anonymous
    if (!optimizeSessionId) return { userId: user.id, optimizeSessionId: null }
    const { data: session } = await supabase
      .from("optimize_sessions")
      .select("id")
      .eq("id", optimizeSessionId)
      .eq("user_id", user.id)
      .maybeSingle()
    return { userId: user.id, optimizeSessionId: session ? optimizeSessionId : null }
  } catch {
    return anonymous
  }
}
