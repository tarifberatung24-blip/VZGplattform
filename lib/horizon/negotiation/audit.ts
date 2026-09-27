import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { redactNegotiationMetadata } from "./guard"

/**
 * Writes a negotiation audit event to the platform audit log.
 *
 * The negotiation timeline (`negotiation_events`) records the workflow; this
 * records the same action in the platform-wide audit trail so an operator
 * auditing the account sees one continuous history. Metadata is redacted before
 * it is written, so a secret that somehow reached a payload cannot be persisted
 * here.
 *
 * A failure to write the audit row never fails the user's action: the primary
 * write already succeeded, and losing an audit line is preferable to rejecting a
 * completed negotiation step. The error is surfaced to the caller instead.
 */
export async function writeNegotiationAudit(
  supabase: SupabaseClient,
  input: {
    householdId: string
    /**
     * Who acted. `null` records a system/operator actor — an inbound callback has
     * no signed-in user, and attributing it to the customer would be a false
     * audit line, which is worse than an unattributed one.
     */
    actorUserId: string | null
    sessionId: string
    eventType: string
    summary: string
    metadata?: Record<string, unknown>
  },
): Promise<string | null> {
  const { error } = await supabase.from("platform_audit_events").insert({
    household_id: input.householdId,
    actor_user_id: input.actorUserId,
    entity_type: "negotiation_session",
    entity_id: input.sessionId,
    event_type: input.eventType,
    event_summary: input.summary,
    metadata: redactNegotiationMetadata(input.metadata ?? {}),
  })
  return error?.message ?? null
}
