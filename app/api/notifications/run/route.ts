import { NextResponse } from "next/server"
import { secretMatches } from "@/lib/affiliate/operator-auth"
import { publicOrigin } from "@/lib/http/public-origin"
import {
  createNotificationsServiceClient,
  emailPendingNotifications,
  notificationLocale,
  syncNotifications,
} from "@/lib/notifications/service"

/**
 * Daily notifications run (GitHub Actions cron, see .github/workflows/notifications.yml).
 *
 * For every user: write the due notifications, then e-mail the fresh ones when
 * SMTP is configured. Auth: `x-horizon-cron-secret` must equal
 * NOTIFICATIONS_CRON_SECRET (at least 16 characters); without the secret the
 * route is disabled (503), never open.
 */

const CRON_SECRET_HEADER = "x-horizon-cron-secret"
const PAGE_SIZE = 200
const MAX_USERS_PER_RUN = 2000

function readCronSecret(): string | null {
  const value = process.env.NOTIFICATIONS_CRON_SECRET?.trim()
  return value && value.length >= 16 ? value : null
}

export async function POST(request: Request) {
  const expected = readCronSecret()
  if (!expected) return NextResponse.json({ code: "NOTIFICATIONS_CRON_NOT_CONFIGURED" }, { status: 503 })
  if (!secretMatches(request.headers.get(CRON_SECRET_HEADER), expected)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 })
  }

  const client = createNotificationsServiceClient()
  if (!client) return NextResponse.json({ code: "SERVICE_CLIENT_UNAVAILABLE" }, { status: 503 })

  const origin = publicOrigin(request)
  const now = new Date()
  const totals = { users: 0, due: 0, emailed: 0, emailUnavailable: false, failures: 0 }

  for (let page = 1; totals.users < MAX_USERS_PER_RUN; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) return NextResponse.json({ code: "USER_LIST_FAILED", ...totals }, { status: 502 })
    const users = data?.users ?? []
    for (const user of users) {
      totals.users += 1
      try {
        totals.due += await syncNotifications(client, user.id, now)
        if (!totals.emailUnavailable) {
          const locale = await notificationLocale(client, user.id)
          const mail = await emailPendingNotifications(client, { id: user.id, email: user.email, locale }, origin, now)
          totals.emailed += mail.sent
          if (mail.result === "unavailable") totals.emailUnavailable = true
          if (mail.result === "failed") totals.failures += 1
        }
      } catch {
        totals.failures += 1
      }
    }
    if (users.length < PAGE_SIZE) break
  }

  return NextResponse.json(totals, { status: 200, headers: { "Cache-Control": "no-store" } })
}
