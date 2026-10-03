import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CASE_TYPES, LOCALES, sanitizeGroups } from "@/lib/inkasso/facts"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  const { data, error } = await supabase
    .from("inkasso_cases")
    .select("id,locale,case_type,status,claim,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ code: "CASES_UNAVAILABLE" }, { status: 503 })
  return NextResponse.json({ cases: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ code: "INVALID_CASE" }, { status: 400 })
  }

  const locale = typeof body.locale === "string" ? body.locale : "bg"
  const caseType = typeof body.caseType === "string" ? body.caseType : "inkasso"
  if (!LOCALES.has(locale) || !CASE_TYPES.has(caseType)) {
    return NextResponse.json({ code: "INVALID_CASE" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("inkasso_cases")
    .insert({
      user_id: user.id,
      locale,
      case_type: caseType,
      status: "intake",
      ...sanitizeGroups(body),
      document_id: typeof body.documentId === "string" ? body.documentId : null,
    })
    .select("id,locale,case_type,status,parties,claim,dates,evidence,updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { code: error?.code === "42P01" ? "SCHEMA_MISSING" : "CASE_CREATE_FAILED" },
      { status: 503 },
    )
  }
  return NextResponse.json({ case: data }, { status: 201 })
}
