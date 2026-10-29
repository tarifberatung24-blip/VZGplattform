import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { isLocale } from "@/lib/i18n/dictionaries"
import { runAiSearch } from "@/lib/ai/search"
import { isWebSearchConfigured, type WebSearchErrorCode } from "@/lib/ai/web-search"

export const runtime = "nodejs"
export const maxDuration = 45

const messageSchema = z
  .object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1800) })
  .strict()

const requestSchema = z
  .object({
    question: z.string().trim().min(2).max(600),
    locale: z.string().optional(),
    history: z.array(messageSchema).max(8).optional(),
  })
  .strict()

const KNOWN_ERRORS = new Set<WebSearchErrorCode>([
  "AI_SEARCH_NOT_CONFIGURED",
  "AI_SEARCH_PROVIDER_ERROR",
  "AI_SEARCH_INVALID_RESPONSE",
])

function errorStatus(code: WebSearchErrorCode): number {
  return code === "AI_SEARCH_NOT_CONFIGURED" ? 503 : 502
}

/**
 * AI search endpoint.
 *
 * Signed-in only, because the answer is presented inside the authenticated
 * workspace and may be recorded with the user's case. Rate-limited per user so a
 * single account cannot run the web-search provider unbounded.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`ai-search:user:${user.id}`, { limit: 30, windowMs: 10 * 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  if (!isWebSearchConfigured()) {
    return NextResponse.json({ code: "AI_SEARCH_NOT_CONFIGURED" }, { status: 503 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_SEARCH_REQUEST" }, { status: 400 })

  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : "bg"

  try {
    const result = await runAiSearch({
      question: parsed.data.question,
      locale,
      history: parsed.data.history ?? [],
      signal: AbortSignal.timeout(40_000),
    })
    return NextResponse.json(result)
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : ""
    const code: WebSearchErrorCode = KNOWN_ERRORS.has(raw as WebSearchErrorCode)
      ? (raw as WebSearchErrorCode)
      : "AI_SEARCH_PROVIDER_ERROR"
    return NextResponse.json({ code }, { status: errorStatus(code) })
  }
}
