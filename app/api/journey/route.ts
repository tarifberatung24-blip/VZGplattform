import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isJourneyRecordingEnabled } from "@/lib/journey/recording"
import { createJourneyDb } from "@/lib/journey/db"
import { journeyEventSchema } from "@/lib/journey/events"
import { normalizeJourneyPath } from "@/lib/journey/paths"

const MAX_BODY_BYTES = 2000
const MAX_EVENTS_PER_MINUTE = 60
const buckets = new Map<string, { count: number; resetAt: number }>()

function withinRateLimit(userId: string, now = Date.now()): boolean {
  const bucket = buckets.get(userId)
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 5000) for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key)
    buckets.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  bucket.count += 1
  return bucket.count <= MAX_EVENTS_PER_MINUTE
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

const status = (code: number) => new NextResponse(null, { status: code })

/** Tells the browser whether to send anything: true for a signed-in user who has not switched recording off. */
export async function GET() {
  const userId = await currentUserId()
  const enabled = userId ? await isJourneyRecordingEnabled(userId) : false
  return NextResponse.json({ enabled }, { headers: { "Cache-Control": "no-store" } })
}

/**
 * Records one usage event for a signed-in user. The preference is checked here, on the server, for
 * every event: once a user has switched recording off, nothing is stored, whatever the browser sends.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return status(403)
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return status(413)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return status(400)
  }
  const parsed = journeyEventSchema.safeParse(body)
  if (!parsed.success) return status(400)

  const userId = await currentUserId()
  if (!userId || !(await isJourneyRecordingEnabled(userId))) return status(204)
  if (!withinRateLimit(userId)) return status(429)

  const route = normalizeJourneyPath(parsed.data.path)
  const db = createJourneyDb()
  if (!route || !db) return status(204)
  await db.from("product_events").insert({
    user_id: userId,
    event: parsed.data.event,
    module: route.module,
    step: route.step,
    code: parsed.data.event === "client_error" ? (parsed.data.code ?? null) : null,
    session_id: parsed.data.sessionId ?? null,
    locale: route.locale,
  })
  return status(204)
}
