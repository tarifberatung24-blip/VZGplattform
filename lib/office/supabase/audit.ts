import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database'
export async function writeAuditEvent(client: SupabaseClient<Database>, actorId: string, caseId: string | null, action: string, metadata: Record<string, unknown> = {}) { const { error } = await client.from('audit_events').insert({ actor_id: actorId, case_id: caseId, action, metadata }); return error?.message ?? null }
