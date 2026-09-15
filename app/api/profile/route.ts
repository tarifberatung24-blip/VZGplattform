import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/office/supabase/admin"

const profileSchema = z.object({
  employment_status: z.string().trim().max(120).nullable(),
  household_size: z.number().int().min(1).max(50).nullable(),
  monthly_income: z.number().min(0).max(1_000_000).nullable(),
  monthly_fixed_costs: z.number().min(0).max(1_000_000).nullable(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = profileSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile data" }, { status: 400 })

  const values = parsed.data
  const completeness = Object.values(values).filter((value) => value !== null && value !== "").length * 25
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })

  const { error } = await admin.from("profiles").upsert({
    id: user.id,
    ...values,
    completeness,
    updated_at: new Date().toISOString(),
  } as never, { onConflict: "id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, completeness })
}
