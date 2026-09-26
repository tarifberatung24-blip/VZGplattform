import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { NegotiationRepository } from "@/lib/horizon/negotiation/repository"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import {
  decideAssistedCallback,
  ASSISTED_CALLBACK_UNAUTHORIZED_CODE,
  ASSISTED_CALLBACK_UNKNOWN_REQUEST_CODE,
  ASSISTED_CALLBACK_INVALID_TRANSITION_CODE,
} from "@/lib/horizon/negotiation/callback"
import { CREDENTIAL_FIELD_REFUSED_CODE, findForbiddenFields } from "@/lib/horizon/negotiation/guard"
import { isNegotiationEnabled, NEGOTIATION_DISABLED_CODE } from "@/lib/horizon/negotiation/flag"
import {
  AUTOMATION_SECRET_HEADER,
  resolveCallbackSecret,
} from "@/lib/horizon/automation/transport"
import { timingSafeEqual } from "node:crypto"

/**
 * MODE B operator/automation callback — the inbound half of the assisted queue.
 *
 * The outbound handoff posts a package to the automation orchestrator (Activepieces,
 * n8n, Windmill, …); this is how the queue reports back. It is a separate endpoint
 * from the customer's assisted route because the caller is a different principal
 * with different powers, and conflating the two would mean the operator path
 * inherits the customer path's auth (or vice versa).
 *
 * What this route guarantees:
 *
 *   - **Authenticated.** A shared secret, compared in constant time. No session
 *     cookie is involved, so an unauthenticated caller cannot reach it by being
 *     logged in, and a logged-in customer cannot reach it by being logged in.
 *   - **Ownership.** The callback names a `requestId`; the route only accepts it
 *     when that id matches the session's recorded queue key. A callback cannot
 *     name someone else's session and move it.
 *   - **Bounded.** Only the queue status changes, only along declared edges, and
 *     only ever on `mode_b_status`. The negotiation lifecycle is never advanced
 *     from here.
 *   - **Idempotent.** A repeat of the stored status is acknowledged and writes
 *     nothing, so a retrying queue cannot duplicate a timeline event.
 *   - **Append-only.** The move is recorded as an immutable negotiation event and
 *     a platform audit line. Nothing is overwritten.
 *   - **Credential-free.** A payload carrying a credential-shaped field is
 *     refused before anything is written.
 *
 * Reads use the service-role client because an inbound callback has no session
 * and RLS would otherwise hide every row. That bypass is confined to this file:
 * the repository is constructed with the owner id read from the row itself, so
 * every write it makes is still bound to that owner and the composite foreign
 * keys still hold.
 */

const schema = z
  .object({
    requestId: z.string().trim().min(1).max(120),
    status: z.string().trim().min(1).max(40),
  })
  .strict()

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // Comparing equal-length buffers keeps the timing comparison well-defined.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function readSecret(request: Request): string | null {
  const header = request.headers.get(AUTOMATION_SECRET_HEADER)
  if (header) return header
  // Alias so a receiver still sending the earlier header name keeps working.
  const legacy = request.headers.get("x-horizon-negotiation-callback-secret")
  if (legacy) return legacy
  const bearer = request.headers.get("authorization")
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim()
  return null
}

export async function POST(request: Request) {
  // The flag is checked first so a disabled feature is indistinguishable from one
  // that does not exist — including for a caller presenting a valid secret.
  if (!isNegotiationEnabled()) {
    return NextResponse.json({ code: NEGOTIATION_DISABLED_CODE }, { status: 404 })
  }

  const expected = resolveCallbackSecret()
  if (!expected) {
    return NextResponse.json({ code: "NEGOTIATION_ASSISTED_CALLBACK_NOT_CONFIGURED" }, { status: 503 })
  }
  if (!secretMatches(readSecret(request), expected)) {
    return NextResponse.json({ code: ASSISTED_CALLBACK_UNAUTHORIZED_CODE }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { code: "NEGOTIATION_VALIDATION_FAILED", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Refuse a credential-shaped payload before any write. The body is a closed
  // shape (`.strict()` rejects unknown keys, so a stray `password` never parses),
  // and there is deliberately no free-text field: a note would be the one place a
  // secret could ride in, and prose cannot be reliably scanned for one. This
  // re-scan is belt-and-braces on top of the strict shape.
  const forbidden = findForbiddenFields(parsed.data)
  if (forbidden.length > 0) {
    return NextResponse.json(
      { code: CREDENTIAL_FIELD_REFUSED_CODE, fields: forbidden },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ code: "NEGOTIATION_ASSISTED_CALLBACK_NOT_CONFIGURED" }, { status: 503 })
  }

  const { data, error } = await admin
    .from("negotiation_sessions")
    .select("id,owner_id,household_id,mode_b_request_id,mode_b_status,state,category")
    .eq("mode_b_request_id", parsed.data.requestId)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ code: "NEGOTIATION_ASSISTED_CALLBACK_UNAVAILABLE" }, { status: 502 })
  }
  if (!data) {
    return NextResponse.json({ code: ASSISTED_CALLBACK_UNKNOWN_REQUEST_CODE }, { status: 404 })
  }

  const session = data as {
    id: string
    owner_id: string
    household_id: string
    mode_b_request_id: string | null
    mode_b_status: string | null
    state: string
    category: string
  }

  const decision = decideAssistedCallback({
    requestId: parsed.data.requestId,
    sessionRequestId: session.mode_b_request_id,
    currentStatus: session.mode_b_status,
    requestedStatus: parsed.data.status,
  })

  if (decision.kind === "UNKNOWN_REQUEST" || decision.kind === "NOT_QUEUED") {
    return NextResponse.json({ code: ASSISTED_CALLBACK_UNKNOWN_REQUEST_CODE }, { status: 404 })
  }
  if (decision.kind === "INVALID_TRANSITION") {
    return NextResponse.json(
      { code: ASSISTED_CALLBACK_INVALID_TRANSITION_CODE, from: decision.from },
      { status: 409 },
    )
  }
  if (decision.kind === "REPLAY") {
    // Acknowledged, not applied. The stored status is already what the callback
    // asks for, so there is nothing to write and nothing to duplicate.
    return NextResponse.json(
      { status: decision.status, applied: false, idempotent: true },
      { status: 200 },
    )
  }

  // The repository is bound to the session's own owner, read from the row, so the
  // write below is owner-scoped even though the read used the service role.
  const repository = new NegotiationRepository(admin, session.owner_id)
  const updated = await repository.updateAssistedStatus({
    sessionId: session.id,
    status: decision.status,
  })
  if (updated.error) {
    return NextResponse.json({ code: "NEGOTIATION_ASSISTED_CALLBACK_FAILED" }, { status: 502 })
  }

  await repository.appendEvents(session.id, [
    {
      eventType: "operator_status_changed",
      detail: {
        from: decision.from,
        to: decision.status,
        source: "operator_callback",
      },
    },
  ])

  await writeNegotiationAudit(admin, {
    householdId: session.household_id,
    actorUserId: null,
    sessionId: session.id,
    eventType: "negotiation.assisted_status_changed",
    summary: `Assisted request moved to ${decision.status} by the operator queue`,
    metadata: { request_id: parsed.data.requestId, from: decision.from, to: decision.status },
  })

  return NextResponse.json(
    { status: decision.status, applied: true, state: session.state },
    { status: 200 },
  )
}
