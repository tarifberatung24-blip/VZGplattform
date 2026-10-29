import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { buildSchufaPlan, parseSchufaText } from "@/lib/schufa/plan"

export const runtime = "nodejs"

const MAX_CHARS = 60_000

/**
 * Turns the text of a SCHUFA data copy into a recovery plan.
 *
 * Signed-in only and rate-limited, because the document is personal data even
 * though the parsing itself is pure. The text is processed in memory and never
 * stored by this route: the plan is returned to the page, and saving is a
 * separate, explicit user action.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`schufa-analyze:user:${user.id}`, { limit: 20, windowMs: 10 * 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_CHARS) : ""
  if (text.trim().length < 20) return NextResponse.json({ code: "NO_TEXT_TO_ANALYZE" }, { status: 400 })

  const parsed = parseSchufaText(text)
  const plan = buildSchufaPlan(parsed)
  return NextResponse.json({ plan })
}
