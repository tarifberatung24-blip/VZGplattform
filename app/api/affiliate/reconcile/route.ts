import { NextResponse } from "next/server"
import { secretMatches } from "@/lib/affiliate/operator-auth"
import {
  awinWindows,
  fetchAwinTransactions,
  readAwinConfig,
  type AwinDateType,
  type AwinTransaction,
} from "@/lib/affiliate/awin"
import { reconcileAwinTransactions } from "@/lib/affiliate/reconcile"
import { createNotificationsServiceClient } from "@/lib/notifications/service"

/**
 * Daily Awin reconciliation (GitHub Actions cron, see .github/workflows/affiliate-reconcile.yml).
 *
 * Reads the transactions Awin reports for the last `days` (default 31, at most
 * 93) by transaction date and by validation date, stores them and ties them to
 * HORIZON clicks through the clickRef. Auth: `x-horizon-cron-secret` must equal
 * NOTIFICATIONS_CRON_SECRET, the secret the daily notifications run already uses.
 * Without it, or without AWIN_PUBLISHER_ID / AWIN_API_TOKEN, the route is
 * disabled (503), never open. The response carries counts only.
 */

const CRON_SECRET_HEADER = "x-horizon-cron-secret"
const DEFAULT_DAYS = 31
const MAX_DAYS = 93
const DATE_TYPES: readonly AwinDateType[] = ["transaction", "validation"]

function readCronSecret(): string | null {
  const value = process.env.NOTIFICATIONS_CRON_SECRET?.trim()
  return value && value.length >= 16 ? value : null
}

function readDays(request: Request): number {
  try {
    const value = Number(new URL(request.url).searchParams.get("days"))
    return Number.isInteger(value) && value > 0 ? Math.min(value, MAX_DAYS) : DEFAULT_DAYS
  } catch {
    return DEFAULT_DAYS
  }
}

export async function POST(request: Request) {
  const expected = readCronSecret()
  if (!expected) return NextResponse.json({ code: "RECONCILE_CRON_NOT_CONFIGURED" }, { status: 503 })
  if (!secretMatches(request.headers.get(CRON_SECRET_HEADER), expected)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 })
  }

  const config = readAwinConfig()
  if (!config) return NextResponse.json({ code: "AWIN_NOT_CONFIGURED" }, { status: 503 })

  const client = createNotificationsServiceClient()
  if (!client) return NextResponse.json({ code: "SERVICE_CLIENT_UNAVAILABLE" }, { status: 503 })

  const windows = awinWindows(new Date(), readDays(request))
  const collected: AwinTransaction[] = []
  for (const dateType of DATE_TYPES) {
    for (const window of windows) {
      const result = await fetchAwinTransactions(config, window, dateType)
      if (!result.ok) {
        const code = result.reason === "unauthorized" ? "AWIN_UNAUTHORIZED" : "AWIN_FETCH_FAILED"
        return NextResponse.json({ code, reason: result.reason, status: result.status ?? null }, { status: 502 })
      }
      collected.push(...result.transactions)
    }
  }

  const totals = await reconcileAwinTransactions(client, collected)
  return NextResponse.json({ network: "awin", windows: windows.length, ...totals }, {
    status: totals.failures > 0 ? 500 : 200,
    headers: { "Cache-Control": "no-store" },
  })
}
