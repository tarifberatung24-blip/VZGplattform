import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id)) return NextResponse.json({ code: "INVALID_CASE_ID" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  const { data, error } = await loadCase(supabase, user.id, id)
  if (error) return NextResponse.json({ code: "CASES_UNAVAILABLE" }, { status: 503 })
  if (!data) return NextResponse.json({ code: "CASE_NOT_FOUND" }, { status: 404 })

  return NextResponse.json({ case: data })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id)) return NextResponse.json({ code: "INVALID_CASE_ID" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  // DSGVO erasure: the row goes, and the cascade removes anything keyed to it.
  const { error } = await supabase
    .from("inkasso_cases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ code: "CASE_DELETE_FAILED" }, { status: 503 })
  return NextResponse.json({ deleted: true })
}
