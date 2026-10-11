import "server-only"
import { createJourneyDb } from "@/lib/journey/db"
import { TERMS_VERSION } from "@/lib/journey/keys"
import type { AdminIdentity } from "./access"
import { summarizeUsers, type AdminSourceUser, type AdminUserRow, type JourneyEvent } from "./journey-summary"

const WINDOW_DAYS = 30
const EVENT_COLUMNS = "user_id,event,module,step,code,session_id,created_at"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Db = NonNullable<ReturnType<typeof createJourneyDb>>

/** Every admin look at customer data leaves a row in `audit_events`. Best effort: a failed write is logged, not thrown. */
async function audit(db: Db, admin: AdminIdentity, action: string, metadata: Record<string, unknown>) {
  const { error } = await db.from("audit_events").insert({ actor_id: admin.id, case_id: null, action, metadata })
  if (error) console.error(`[audit] failed to record ${action}: ${error.message}`)
}

function toSourceUser(user: { id: string; email?: string | null; created_at: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> | null }): AdminSourceUser {
  return { id: user.id, email: user.email ?? null, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at ?? null, user_metadata: user.user_metadata ?? null }
}

export async function loadAdminUsers(admin: AdminIdentity, now = new Date()): Promise<{ rows: AdminUserRow[]; error: string | null }> {
  const db = createJourneyDb()
  if (!db) return { rows: [], error: "Supabase is not configured" }
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString()
  const [usersResult, eventsResult, consentsResult] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
    db.from("product_events").select(EVENT_COLUMNS).gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
    db.from("user_consents").select("user_id,purpose,granted,text_version"),
  ])
  if (usersResult.error) return { rows: [], error: usersResult.error.message }
  const users = usersResult.data.users.map(toSourceUser)
  const profilesResult = users.length
    ? await db.from("profiles").select("id,onboarding_step").in("id", users.map((user) => user.id))
    : { data: [], error: null }
  await audit(db, admin, "admin.view_user_list", { users: users.length })
  const rows = summarizeUsers({
    users,
    events: (eventsResult.data ?? []) as JourneyEvent[],
    profiles: profilesResult.data ?? [],
    consents: consentsResult.data ?? [],
    now,
    termsVersion: TERMS_VERSION,
  })
  return { rows, error: eventsResult.error?.message ?? consentsResult.error?.message ?? profilesResult.error?.message ?? null }
}

export async function loadAdminUserJourney(admin: AdminIdentity, userId: string, now = new Date()): Promise<{ row: AdminUserRow; events: JourneyEvent[] } | null> {
  if (!UUID.test(userId)) return null
  const db = createJourneyDb()
  if (!db) return null
  const [userResult, eventsResult, consentsResult, profileResult] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("product_events").select(EVENT_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    db.from("user_consents").select("user_id,purpose,granted,text_version").eq("user_id", userId),
    db.from("profiles").select("id,onboarding_step").eq("id", userId).maybeSingle(),
  ])
  if (userResult.error || !userResult.data.user) return null
  await audit(db, admin, "admin.view_user_journey", { target_user_id: userId })
  const events = (eventsResult.data ?? []) as JourneyEvent[]
  const [row] = summarizeUsers({
    users: [toSourceUser(userResult.data.user)],
    events,
    profiles: profileResult.data ? [profileResult.data] : [],
    consents: consentsResult.data ?? [],
    now,
    termsVersion: TERMS_VERSION,
  })
  return { row, events }
}
