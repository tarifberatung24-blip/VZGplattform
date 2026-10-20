import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { locales } from "@/lib/office/locales"
import { checkRateLimit, getRequestKey } from "@/lib/rate-limit"

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().min(1).email().max(180),
  message: z.string().trim().min(1).max(5000),
  locale: z.string().optional(),
  origin: z.string().trim().max(500).optional(),
}).strict()

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(getRequestKey(request, "lead"), { limit: 5, windowMs: 10 * 60_000 })
    if (!rate.allowed) {
      return NextResponse.json({ code: "LEAD_RATE_LIMITED", retryAfter: rate.retryAfter }, {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfter) },
      })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const parsed = leadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { code: "INVALID_LEAD" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        },
      )
    }

    const { name, email, message, locale, origin } = parsed.data
    const resolvedLocale = locales.includes(locale as any) ? (locale as any) : "bg"

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 })
    }

    const { error } = await supabase.from("leads").insert({
      name,
      email,
      message,
      locale: resolvedLocale,
      origin: origin ?? request.headers.get("origin")?.slice(0, 500) ?? null,
    })

    if (error) {
      console.error("[leads] insert failed", error.message)
      return NextResponse.json({ code: "LEAD_STORE_FAILED" }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("[leads] unexpected error", error)
    return NextResponse.json({ code: "LEAD_UNEXPECTED_ERROR" }, { status: 500 })
  }
}
