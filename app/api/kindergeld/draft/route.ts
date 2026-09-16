import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_ANSWERS = 30
const allowedLocales = new Set(["bg", "de"])

function error(code: string, status: number) {
  return NextResponse.json({ code }, { status })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return error("AUTH_REQUIRED", 401)
  const locale = new URL(request.url).searchParams.get("locale") ?? "bg"
  if (!allowedLocales.has(locale)) return error("INVALID_LOCALE", 400)
  const { data, error: queryError } = await supabase.from("kindergeld_cases").select("id,locale,status,answers,current_step,updated_at").eq("user_id", user.id).eq("locale", locale).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  if (queryError) return error("DRAFT_UNAVAILABLE", 503)
  return NextResponse.json({ draft: data })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return error("AUTH_REQUIRED", 401)
  try {
    const body = await request.json() as { id?: unknown; locale?: unknown; answers?: unknown; currentStep?: unknown }
    if (typeof body.locale !== "string" || !allowedLocales.has(body.locale) || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers) || Object.keys(body.answers).length > MAX_ANSWERS || typeof body.currentStep !== "number" || !Number.isInteger(body.currentStep) || body.currentStep < 0 || body.currentStep > 20) return error("INVALID_DRAFT", 400)
    const id = typeof body.id === "string" && body.id.length > 0 ? body.id : undefined
    const payload = { user_id: user.id, locale: body.locale, answers: body.answers, current_step: body.currentStep, status: "draft" }
    const query = id ? supabase.from("kindergeld_cases").update(payload).eq("id", id).eq("user_id", user.id).select("id,locale,status,answers,current_step,updated_at").maybeSingle() : supabase.from("kindergeld_cases").insert(payload).select("id,locale,status,answers,current_step,updated_at").single()
    const { data, error: saveError } = await query
    if (saveError || !data) return error(saveError?.code === "42P01" ? "DRAFT_SCHEMA_MISSING" : "DRAFT_SAVE_FAILED", 503)
    return NextResponse.json({ draft: data })
  } catch { return error("INVALID_DRAFT", 400) }
}
