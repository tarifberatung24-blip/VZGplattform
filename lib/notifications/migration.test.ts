import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261011120000_user_notifications.sql"), "utf8")
const route = readFileSync(join(process.cwd(), "app/api/notifications/run/route.ts"), "utf8")

describe("notifications migration and cron route", () => {
  it("enables RLS and lets owners only read and mark as read", () => {
    expect(sql).toMatch(/alter table public\.user_notifications enable row level security/)
    expect(sql).toMatch(/alter table public\.notification_preferences enable row level security/)
    expect(sql).toMatch(/grant update \(read_at\) on table public\.user_notifications to authenticated/)
    expect(sql).not.toMatch(/grant (all|insert|delete)[^;]*user_notifications to authenticated/)
    expect(sql).toMatch(/revoke all on table public\.user_notifications from anon/)
  })

  it("keeps one notification per rule and occasion", () => {
    expect(sql).toMatch(/unique \(user_id, dedupe_key\)/)
  })

  it("is disabled without a strong secret and compares it in constant time", () => {
    expect(route).toMatch(/NOTIFICATIONS_CRON_NOT_CONFIGURED/)
    expect(route).toMatch(/value\.length >= 16/)
    expect(route).toMatch(/secretMatches\(/)
  })
})
