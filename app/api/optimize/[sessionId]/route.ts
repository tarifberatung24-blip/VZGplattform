import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const sessionIdSchema = z.string().uuid()

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "OPTIMIZE_NOT_AUTHENTICATED" }, { status: 401 })
    const { sessionId } = await params
    if (!sessionIdSchema.safeParse(sessionId).success) return NextResponse.json({ code: "OPTIMIZE_SESSION_INVALID" }, { status: 400 })
    const { data, error } = await supabase.from("optimize_sessions").select("id,status,category,filled_data,comparison,partner_id,affiliate_url,ai_explanation,user_confirmed_at,created_at,updated_at").eq("id", sessionId).eq("user_id", user.id).maybeSingle()
    if (error) return NextResponse.json({ code: "OPTIMIZE_SESSION_UNAVAILABLE" }, { status: 503 })
    if (!data) return NextResponse.json({ code: "OPTIMIZE_SESSION_NOT_FOUND" }, { status: 404 })
    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ code: "OPTIMIZE_SESSION_UNAVAILABLE" }, { status: 503 })
  }
}
