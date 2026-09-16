import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { locales } from "@/lib/office/locales"

const leadSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().min(1).email(),
  message: z.string().trim().min(1),
  locale: z.string().optional(),
  origin: z.string().optional(),
})

export async function POST(request: Request) {
  try {
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
      origin: origin ?? request.headers.get("origin") ?? null,
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
