import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { businessProfileInputSchema } from "@/lib/horizon/business-profile/validation"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data, error } = await supabase.from("business_profiles").select("*").eq("owner_id", user.id).maybeSingle()
  if (error) {
    const schemaNotReady = error.code === "42P01" || error.code === "PGRST205"
    return NextResponse.json(
      { error: schemaNotReady ? "Business profile storage is not installed yet." : "Could not load business profile.", code: schemaNotReady ? "BUSINESS_PROFILE_SCHEMA_NOT_READY" : "BUSINESS_PROFILE_READ_FAILED" },
      { status: schemaNotReady ? 503 : 500 },
    )
  }
  return NextResponse.json({ profile: data })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = businessProfileInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid business profile.", issues: parsed.error.flatten().fieldErrors }, { status: 400 })
  const { data, error } = await supabase.from("business_profiles").upsert({
    ...parsed.data,
    owner_id: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" }).select("*").single()
  if (error) {
    const schemaNotReady = error.code === "42P01" || error.code === "PGRST205"
    return NextResponse.json(
      { error: schemaNotReady ? "Business profile storage is not installed yet." : "Could not save business profile.", code: schemaNotReady ? "BUSINESS_PROFILE_SCHEMA_NOT_READY" : "BUSINESS_PROFILE_WRITE_FAILED" },
      { status: schemaNotReady ? 503 : 500 },
    )
  }
  return NextResponse.json({ profile: data })
}
