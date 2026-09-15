import { createAdminClient } from '../supabase/admin'
import { getAuthenticatedUser } from '../supabase/auth'
import { consumeAiQuota, groqCircuitBreaker } from '../ai/guards'
import { routeWithGroq } from '../ai/routing'

export async function routeCaseMessage(caseId: string, text: string) {
  if (!process.env.GROQ_API_KEY || !text.trim()) return { routed: false as const, reason: 'fallback' as const }
  const { user } = await getAuthenticatedUser(); if (!user) return { routed: false as const, reason: 'unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { routed: false as const, reason: 'not_configured' as const }
  const { data: owned } = await admin.from('cases').select('id').eq('id', caseId).eq('owner_id', user.id).maybeSingle(); if (!owned) return { routed: false as const, reason: 'not_found' as const }
  if (!groqCircuitBreaker.allow()) return { routed: false as const, reason: 'circuit_open' as const }
  const quota = await consumeAiQuota(admin, user.id); if ('error' in quota || !quota.quota.allowed) return { routed: false as const, reason: 'quota' as const }
  try {
    const result = await routeWithGroq(text)
    groqCircuitBreaker.success()
    if (result.confidence < 0.75) return { routed: false as const, reason: 'low_confidence' as const, result }
    const updated = await admin.from('cases').update({ conversation_locale: result.language, intent: result.intent }).eq('id', caseId).eq('owner_id', user.id)
    if (updated.error) return { routed: false as const, reason: 'update_failed' as const }
    return { routed: true as const, result }
  } catch {
    groqCircuitBreaker.failure()
    return { routed: false as const, reason: 'provider_failed' as const }
  }
}
