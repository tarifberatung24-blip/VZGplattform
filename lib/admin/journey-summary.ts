const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const LOOP_MIN_VIEWS = 3
// Hubs people return to all the time; repeated visits there are normal, not a sign of being stuck.
const HUB_MODULES = new Set(["dashboard", "home"])

export type AdminSourceUser = {
  id: string
  email?: string | null
  created_at: string
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown> | null
}

export type JourneyEvent = {
  user_id: string
  event: string
  module: string
  step: string | null
  code: string | null
  session_id: string | null
  created_at: string
}

export type AdminFlag = "errors" | "loop" | "onboarding" | "inactive" | "terms"

export type AdminUserRow = {
  id: string
  email: string | null
  name: string | null
  createdAt: string
  lastSignInAt: string | null
  onboardingStep: string | null
  recordingOff: boolean
  termsAccepted: boolean
  events: number
  errors7d: number
  lastActivity: string | null
  lastPlace: { module: string; step: string | null } | null
  loop: { module: string; step: string | null; count: number } | null
  modules: string[]
  flags: AdminFlag[]
  score: number
}

type SummaryInput = {
  users: AdminSourceUser[]
  events: JourneyEvent[]
  profiles: Array<{ id: string; onboarding_step: string | null }>
  consents: Array<{ user_id: string; purpose: string; granted: boolean; text_version: string }>
  now: Date
  termsVersion: string
}

/**
 * One row per user, with the signs that someone needs help, most in need first:
 * script errors in the last 7 days, the same screen opened again and again in one visit,
 * onboarding not finished, no activity for a week after signing up, terms not accepted.
 */
export function summarizeUsers({ users, events, profiles, consents, now, termsVersion }: SummaryInput): AdminUserRow[] {
  const nowMs = now.getTime()
  const eventsByUser = new Map<string, JourneyEvent[]>()
  for (const event of events) {
    const list = eventsByUser.get(event.user_id)
    if (list) list.push(event)
    else eventsByUser.set(event.user_id, [event])
  }
  const steps = new Map(profiles.map((profile) => [profile.id, profile.onboarding_step]))

  const rows = users.map((user): AdminUserRow => {
    const list = [...(eventsByUser.get(user.id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const errors7d = list.filter((event) => event.event === "client_error" && nowMs - Date.parse(event.created_at) <= 7 * DAY_MS).length

    const views = new Map<string, { module: string; step: string | null; count: number }>()
    for (const event of list) {
      if (event.event !== "page_view" || HUB_MODULES.has(event.module)) continue
      const key = `${event.session_id ?? "none"}|${event.module}|${event.step ?? ""}`
      const entry = views.get(key)
      if (entry) entry.count += 1
      else views.set(key, { module: event.module, step: event.step, count: 1 })
    }
    let loop: AdminUserRow["loop"] = null
    for (const entry of views.values()) if (entry.count >= LOOP_MIN_VIEWS && (!loop || entry.count > loop.count)) loop = entry

    const modules: string[] = []
    for (const event of list) if (!modules.includes(event.module)) modules.push(event.module)

    const journey = consents.find((consent) => consent.user_id === user.id && consent.purpose === "product_journey")
    const terms = consents.find((consent) => consent.user_id === user.id && consent.purpose === "terms_and_privacy")
    const recordingOff = journey?.granted === false
    const termsAccepted = terms?.granted === true && terms.text_version === termsVersion
    const onboardingStep = steps.get(user.id) ?? null
    const age = nowMs - Date.parse(user.created_at)
    const lastActivity = list[0]?.created_at ?? null

    const flags: AdminFlag[] = []
    if (errors7d > 0) flags.push("errors")
    if (loop) flags.push("loop")
    if (onboardingStep !== "completed" && age > HOUR_MS) flags.push("onboarding")
    if (!recordingOff && age > DAY_MS && age <= 30 * DAY_MS && (!lastActivity || nowMs - Date.parse(lastActivity) > 7 * DAY_MS)) flags.push("inactive")
    if (!termsAccepted && age > HOUR_MS) flags.push("terms")

    const score =
      (errors7d > 0 ? 3 + Math.min(errors7d, 5) : 0) +
      (loop ? 2 : 0) +
      (flags.includes("onboarding") ? 2 : 0) +
      (flags.includes("inactive") ? 1 : 0) +
      (flags.includes("terms") ? 1 : 0)

    const firstName = user.user_metadata?.first_name
    return {
      id: user.id,
      email: user.email ?? null,
      name: typeof firstName === "string" && firstName.trim() ? firstName.trim() : null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      onboardingStep,
      recordingOff,
      termsAccepted,
      events: list.length,
      errors7d,
      lastActivity,
      lastPlace: list[0] ? { module: list[0].module, step: list[0].step } : null,
      loop,
      modules: modules.slice(0, 6),
      flags,
      score,
    }
  })

  return rows.sort((a, b) =>
    b.score - a.score ||
    (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "") ||
    b.createdAt.localeCompare(a.createdAt),
  )
}
