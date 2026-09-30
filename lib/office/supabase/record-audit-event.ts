import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"

/**
 * Records an audit event on the canonical `audit_events` schema
 * (`actor_id, case_id, action, metadata`).
 *
 * These call sites previously used the legacy Kintex column set
 * (`household_id, actor_user_id, entity_type, event_type, event_summary`),
 * which does not exist on the reconciled table, so every insert failed with
 * `PGRST204` and the returned error was never inspected.
 *
 * `entity_type`/`entity_id`/`event_summary` are carried inside `metadata` so no
 * detail is lost, and the previous dotted `event_type` becomes `action`.
 *
 * Best-effort by design: the caller's user-visible operation has already
 * succeeded by this point, so a failed audit write is logged rather than thrown.
 * A hard failure here would reject an operation that is already persisted.
 */
export async function recordAuditEvent(
  client: SupabaseClient<Database>,
  event: {
    actorId: string
    caseId?: string | null
    action: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { error } = await client.from("audit_events").insert({
    actor_id: event.actorId,
    case_id: event.caseId ?? null,
    action: event.action,
    metadata: event.metadata ?? {},
  })
  if (error) console.error(`[audit] failed to record ${event.action}: ${error.message}`)
}
