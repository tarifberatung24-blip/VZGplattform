/**
 * HORIZON Agent Runs Engine — idempotency keys.
 *
 * Duplicate suppression is enforced by the database (`unique (owner_id,
 * idempotency_key)` on `agent_runs` and `agent_run_events`). This module only
 * *derives* the keys, so the same logical request always produces the same key
 * and the constraint does the rest.
 *
 * Keys are derived from stable, caller-independent inputs and are hashed, so a
 * key never contains an objective, a document name or any other free text. A
 * caller may still supply its own key for a run it controls, but a derived key is
 * the default because it makes the common retry path duplicate-safe without
 * cooperation from the client.
 */

import { createHash } from "node:crypto"

/** Stable, bounded, non-sensitive hash. 32 hex chars keeps the key well inside the CHECK. */
function digest(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex").slice(0, 32)
}

/**
 * The key for a run. The objective participates only as a hash input, never as
 * the stored key, so an objective containing personal data cannot be read back
 * out of `agent_runs.idempotency_key`.
 *
 * Two identical requests from the same owner therefore collapse to one run, and
 * a genuinely different objective produces a different key.
 */
export function deriveRunIdempotencyKey(input: {
  ownerId: string
  objective: string
  caseId?: string | null
  serviceRequestId?: string | null
  leadAgent: string
}): string {
  return `run:${digest([
    input.ownerId,
    input.leadAgent,
    input.caseId ?? "",
    input.serviceRequestId ?? "",
    input.objective.trim().toLocaleLowerCase("de-DE"),
  ])}`
}

/**
 * The key for an event. Events are deduplicated per owner on the event type plus
 * the identity of the thing that happened, so a re-delivered
 * `DOCUMENT_READY` for the same document is a no-op while a *new* document still
 * produces work.
 */
export function deriveEventIdempotencyKey(input: {
  ownerId: string
  eventType: string
  subjectId?: string | null
  /** Optional caller-supplied discriminator, e.g. an upstream delivery id. */
  discriminator?: string | null
}): string {
  return `evt:${digest([
    input.ownerId,
    input.eventType,
    input.subjectId ?? "",
    input.discriminator ?? "",
  ])}`
}

/** True when a string is usable as a stored idempotency key (matches the DB CHECK). */
export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 200
}
