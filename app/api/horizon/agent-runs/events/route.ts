import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Agent Runs Engine — event intake.
 *
 * Accepts the six lifecycle events the brief names and stores them in the
 * owner-scoped outbox. Consumption is idempotent: the unique
 * `(owner_id, idempotency_key)` constraint means a re-delivered event is
 * reported as `duplicate: true` rather than creating a second work item.
 *
 * Validation is deliberately strict:
 * - the event type must be one of the six; anything else is rejected;
 * - the `runId`, when supplied, must be a run the caller owns, so an event can
 *   never be attached to another user's run;
 * - the payload is a bounded, flat object of primitives. This is an event
 *   *envelope*, not a document store: a caller cannot push document content,
 *   prompt text or arbitrary nested data into the engine.
 */

const payloadValue = z.union([z.string().max(200), z.number(), z.boolean(), z.null()])

const eventSchema = z
  .object({
    eventType: z.enum([
      "SERVICE_REQUEST_CREATED",
      "DOCUMENT_READY",
      "CASE_UPDATED",
      "DEADLINE_APPROACHING",
      "USER_APPROVAL_GRANTED",
      "USER_APPROVAL_REJECTED",
    ]),
    runId: z.string().trim().uuid().optional(),
    subjectId: z.string().trim().uuid().optional(),
    discriminator: z.string().trim().min(1).max(200).optional(),
    payload: z.record(z.string().min(1).max(64), payloadValue).optional(),
  })
  .strict()

/** Keys that would turn an event envelope into a content store. Rejected outright. */
const FORBIDDEN_PAYLOAD_KEYS = ["content", "text", "prompt", "body", "document_text", "ocr"]

export async function POST(request: Request) {
  const engine = await createAgentRunService()
  if (!engine.userId || !engine.service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }
  if (!engine.schemaReady) {
    return NextResponse.json({ code: "ENGINE_MIGRATION_NOT_APPLIED" }, { status: 503 })
  }

  const rate = checkRateLimit(`agent-runs:events:user:${engine.userId}`, {
    limit: 120,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_EVENT" }, { status: 400 })

  const input = parsed.data
  const payloadKeys = Object.keys(input.payload ?? {})
  if (payloadKeys.some((key) => FORBIDDEN_PAYLOAD_KEYS.includes(key))) {
    return NextResponse.json({ code: "INVALID_EVENT" }, { status: 400 })
  }

  // A run id must belong to the caller. This is checked here rather than left to
  // the write, so a foreign id is refused before an event row exists.
  if (input.runId) {
    const owned = await engine.service.runs.getRun(input.runId)
    if (owned.error || !owned.data) {
      return NextResponse.json({ code: "RUN_NOT_FOUND" }, { status: 404 })
    }
  }

  const recorded = await engine.service.recordEvent({
    eventType: input.eventType,
    subjectId: input.subjectId ?? null,
    runId: input.runId ?? null,
    discriminator: input.discriminator ?? null,
    payload: input.payload,
  })

  if (recorded.error || !recorded.data) {
    return NextResponse.json({ code: "EVENT_NOT_ACCEPTED" }, { status: 502 })
  }

  return NextResponse.json(
    { event: recorded.data.event, duplicate: recorded.data.duplicate },
    { status: recorded.data.duplicate ? 200 : 202 },
  )
}
