import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Locale } from "@/lib/i18n/dictionaries"
import { resolveCaseModule } from "@/lib/horizon/case/module"
import { readSmtpConfig } from "@/lib/horizon/send/smtp-config"
import { createSmtpProvider } from "@/lib/horizon/send/smtp-provider"
import { renderNotificationEmail } from "./copy"
import { computeDueNotifications, DAY_MS, type ActivitySnapshot, type NotificationKind } from "./rules"

/**
 * Server side of the notifications: load a user's own data, write the due
 * notifications (idempotent through the unique (user_id, dedupe_key)), and
 * e-mail new ones through the existing P11 SMTP transport when it is configured.
 *
 * Runs with the service role because the rows are generated for the user, not by
 * the user; clients can only read them and mark them as read (RLS).
 */

/** Only fresh notifications are e-mailed, so a first run never mails a backlog. */
export const EMAIL_MAX_AGE_MS = 2 * DAY_MS
const EMAILS_PER_USER_PER_RUN = 3

export function createNotificationsServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  } catch {
    return null
  }
}

/** The user's own activity, or null when the profile cannot be read. */
export async function loadActivitySnapshot(client: SupabaseClient, userId: string): Promise<ActivitySnapshot | null> {
  const { data: profile, error: profileError } = await client.from("profiles").select("created_at").eq("id", userId).maybeSingle()
  if (profileError || !profile?.created_at) return null

  const { data: households } = await client.from("households").select("id").eq("owner_id", userId)
  const householdIds = (households ?? []).map((row: { id: string }) => row.id)

  const empty = Promise.resolve({ data: [] as never[], count: 0, error: null })
  const [contracts, documents, cases, optimize, sent, savings] = await Promise.all([
    householdIds.length
      ? client.from("contracts").select("id,title,cancellation_deadline").in("household_id", householdIds).limit(200)
      : empty,
    householdIds.length
      ? client.from("documents").select("id", { count: "exact", head: true }).in("household_id", householdIds)
      : empty,
    client.from("cases").select("horizon_module,intent").eq("owner_id", userId).limit(500),
    client.from("optimize_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    client
      .from("audit_events")
      .select("created_at")
      .eq("actor_id", userId)
      .eq("action", "email_send_attempted")
      .eq("metadata->>state", "SENT")
      .order("created_at", { ascending: true })
      .limit(200),
    // Absent until the revenue-attribution migration is applied; an error means "no savings".
    client.from("household_savings").select("status,annual_saving_cents,created_at").eq("user_id", userId),
  ])

  return {
    accountCreatedAt: profile.created_at as string,
    contracts: ((contracts.data ?? []) as Array<{ id: string; title: string | null; cancellation_deadline: string | null }>).map((row) => ({
      id: row.id,
      title: row.title ?? "",
      cancellationDeadline: row.cancellation_deadline,
    })),
    documentCount: documents.count ?? 0,
    caseModules: ((cases.data ?? []) as Array<{ horizon_module: string | null; intent: string | null }>).map((row) => resolveCaseModule(row)),
    optimizeSessionCount: optimize.count ?? 0,
    sentLetterDates: ((sent.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at),
    savings: savings.error
      ? []
      : ((savings.data ?? []) as Array<{ status: string; annual_saving_cents: number; created_at: string }>).map((row) => ({
          status: row.status,
          annualSavingCents: row.annual_saving_cents,
          createdAt: row.created_at,
        })),
  }
}

/** Writes every due notification once. Returns how many rules were due. */
export async function syncNotifications(client: SupabaseClient, userId: string, now: Date = new Date()): Promise<number> {
  const snapshot = await loadActivitySnapshot(client, userId)
  if (!snapshot) return 0
  const drafts = computeDueNotifications(snapshot, now)
  if (drafts.length === 0) return 0
  const { error } = await client.from("user_notifications").upsert(
    drafts.map((draft) => ({ user_id: userId, kind: draft.kind, dedupe_key: draft.dedupeKey, payload: draft.payload })),
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
  )
  return error ? 0 : drafts.length
}

export type EmailRunResult = "sent" | "nothing" | "disabled" | "unavailable" | "failed"

/**
 * E-mails the user's fresh, not yet e-mailed notifications. Stops at the first
 * transport problem and leaves the rows untouched, so the next run retries.
 */
export async function emailPendingNotifications(
  client: SupabaseClient,
  user: { id: string; email: string | null | undefined; locale: Locale },
  origin: string,
  now: Date = new Date(),
): Promise<{ result: EmailRunResult; sent: number }> {
  if (!user.email) return { result: "nothing", sent: 0 }
  const { data: preference } = await client.from("notification_preferences").select("email_enabled").eq("user_id", user.id).maybeSingle()
  if (preference && preference.email_enabled === false) return { result: "disabled", sent: 0 }

  const { data: pending, error } = await client
    .from("user_notifications")
    .select("id,kind,payload,created_at")
    .eq("user_id", user.id)
    .neq("kind", "report_day14")
    .is("emailed_at", null)
    .gte("created_at", new Date(now.getTime() - EMAIL_MAX_AGE_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(EMAILS_PER_USER_PER_RUN)
  if (error || !pending?.length) return { result: "nothing", sent: 0 }

  const config = readSmtpConfig()
  if (!config.ok) return { result: "unavailable", sent: 0 }
  const provider = createSmtpProvider(config)

  let sent = 0
  for (const row of pending as Array<{ id: string; kind: NotificationKind; payload: Record<string, unknown> }>) {
    const mail = renderNotificationEmail(row.kind, row.payload ?? {}, user.locale, origin)
    const outcome = await provider.send({ to: user.email, subject: mail.subject, body: mail.body, attachments: [] })
    if (outcome.status !== "SENT") return { result: outcome.status === "UNAVAILABLE" ? "unavailable" : "failed", sent }
    await client.from("user_notifications").update({ emailed_at: outcome.acceptedAt }).eq("id", row.id).is("emailed_at", null)
    sent += 1
  }
  return { result: "sent", sent }
}

/** The user's preferred language for notifications; Bulgarian by default. */
export async function notificationLocale(client: SupabaseClient, userId: string): Promise<Locale> {
  const { data } = await client.from("profiles").select("preferred_language,locale").eq("id", userId).maybeSingle()
  const value = String(data?.preferred_language ?? data?.locale ?? "").toLowerCase()
  return value.startsWith("de") ? "de" : "bg"
}
