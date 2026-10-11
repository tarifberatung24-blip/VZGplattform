import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

/**
 * Inbox actions for the signed-in user: mark one or all notifications as read,
 * or switch the notification e-mails on or off. Runs under the user's own RLS.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().uuid().optional() }).strict(),
  z.object({ action: z.literal("email"), enabled: z.boolean() }).strict(),
])

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "VALIDATION_FAILED" }, { status: 400 })

  if (parsed.data.action === "read") {
    let query = supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null)
    if (parsed.data.id) query = query.eq("id", parsed.data.id)
    const { error } = await query
    if (error) return NextResponse.json({ code: "UPDATE_FAILED" }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, email_enabled: parsed.data.enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
  if (error) return NextResponse.json({ code: "UPDATE_FAILED" }, { status: 500 })
  return NextResponse.json({ ok: true, emailEnabled: parsed.data.enabled })
}
