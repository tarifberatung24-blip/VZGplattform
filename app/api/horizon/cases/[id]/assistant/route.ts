import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"
import { createCaseEngine } from "@/lib/horizon/case"
import { buildCaseAssistantSystemPrompt } from "@/lib/horizon/ai/prompt"
import { HORIZON_AI_MODEL, provenance } from "@/lib/horizon/ai/registry"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(30000),
  })
  .strict()

const requestSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(24),
  })
  .strict()

/**
 * P7 — case-scoped assistant.
 *
 * Answers inside one case, using the persistent case context rather than the
 * household document/contract stack. Ownership is enforced by the case engine:
 * `loadCaseContext` reads through the session client, so RLS and the `owner_id`
 * filter both apply and another user's case is indistinguishable from a missing
 * one.
 *
 * The route only explains and summarizes. It cannot approve, send, authorize or
 * calculate, because no such capability is exposed and the approval and send
 * paths are separate engines gated on a user-driven, hash-bound write.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) {
    return Response.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }

  const rate = checkRateLimit(`case-chat:user:${engine.userId}`, {
    limit: 30,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return Response.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  // The path id is authoritative. Accepting a case id in the body as well would
  // create two sources of truth for which case is being read.
  if (!z.string().uuid().safeParse(caseId).success) {
    return Response.json({ code: "CASE_NOT_FOUND" }, { status: 404 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ code: "INVALID_CHAT_REQUEST" }, { status: 400 })
  }

  const context = await engine.repository.loadCaseContext(caseId)
  if (context.error || !context.data) {
    // A case owned by someone else fails here exactly like a missing one, so the
    // response cannot be used to probe which case ids exist.
    return Response.json({ code: "CASE_NOT_FOUND" }, { status: 404 })
  }

  // The provider gate is deliberately last. If it ran before validation and
  // ownership, an unconfigured deployment would answer 503 for every request,
  // which would both skip the ownership rail entirely and confirm that an id was
  // otherwise well-formed.
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ code: "AI_PROVIDER_NOT_CONFIGURED" }, { status: 503 })
  }

  const result = streamText({
    model: groq(HORIZON_AI_MODEL),
    system: buildCaseAssistantSystemPrompt(context.data),
    messages: parsed.data.messages,
    maxOutputTokens: 700,
    temperature: 0.2,
    abortSignal: request.signal,
  })

  return result.toTextStreamResponse({
    headers: {
      "x-horizon-prompt-version": provenance("caseAssistant").promptVersion,
      "x-horizon-model": HORIZON_AI_MODEL,
    },
  })
}