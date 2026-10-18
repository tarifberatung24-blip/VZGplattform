import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createNotificationsServiceClient, syncNotifications } from "@/lib/notifications/service"

/**
 * Inbox data and actions for the signed-in user. Reads, marking messages and
 * notification preferences run under the user's own RLS.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().uuid().optional() }).strict(),
  z.object({ action: z.literal("email"), enabled: z.boolean() }).strict(),
])

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 })

  const service = createNotificationsServiceClient()
  if (service) {
    try {
      await Promise.race([
        syncNotifications(service, user.id),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
    } catch {
      // Existing messages must remain available if a refresh is temporarily unavailable.
    }
  }

  const [notifications, preference] = await Promise.all([
    supabase
      .from("user_notifications")
      .select("id,kind,payload,created_at,read_at")
      .eq("user_id", user.id)
      .neq("kind", "report_day14")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  return NextResponse.json({
    items: notifications.error ? [] : notifications.data ?? [],
    emailEnabled: preference.data?.email_enabled !== false,
  })
}

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
