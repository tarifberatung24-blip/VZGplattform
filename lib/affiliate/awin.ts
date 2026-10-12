/**
 * Awin Publisher API: read the transactions Awin reports for Tarifberater24.
 *
 * Pure parsing and window helpers plus one fetch function with an injectable
 * `fetch`, so everything is unit-tested without network. The token is read
 * from the environment only (AWIN_API_TOKEN) and is never logged or returned.
 *
 * API: GET https://api.awin.com/publishers/{publisherId}/transactions/
 * startDate/endDate (yyyy-MM-ddThh:mm:ss, at most 31 days apart), timezone,
 * dateType (transaction | validation). Bearer token in the Authorization header.
 */

export const AWIN_API_BASE = "https://api.awin.com"
export const AWIN_MAX_WINDOW_DAYS = 31

export const awinStatuses = ["pending", "approved", "declined", "deleted"] as const
export type AwinStatus = (typeof awinStatuses)[number]

export type AwinConfig = { publisherId: string; token: string }

/** Config from the environment, or null when either value is missing or malformed. */
export function readAwinConfig(env: Record<string, string | undefined> = process.env): AwinConfig | null {
  const publisherId = env.AWIN_PUBLISHER_ID?.trim()
  const token = env.AWIN_API_TOKEN?.trim()
  if (!publisherId || !/^\d{1,12}$/.test(publisherId)) return null
  if (!token || token.length < 16 || /\s/.test(token)) return null
  return { publisherId, token }
}

export function isAwinConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return readAwinConfig(env) !== null
}

export type AwinTransaction = {
  id: string
  advertiserId: string | null
  status: AwinStatus
  type: string | null
  commissionCents: number | null
  saleCents: number | null
  currency: string | null
  clickRef: string | null
  transactionDate: string | null
  validationDate: string | null
}

function isAwinStatus(value: unknown): value is AwinStatus {
  return typeof value === "string" && (awinStatuses as readonly string[]).includes(value)
}

/** A reported money amount in integer cents; null when absent, negative or not a finite number. */
export function amountToCents(value: unknown): number | null {
  const amount = typeof value === "string" ? Number(value) : value
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null
  const cents = Math.round(amount * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

function text(value: unknown, max: number): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : null
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function money(value: unknown): { cents: number | null; currency: string | null } {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const currency = typeof record.currency === "string" && /^[A-Z]{3}$/.test(record.currency) ? record.currency : null
    return { cents: amountToCents(record.amount), currency }
  }
  return { cents: amountToCents(value), currency: null }
}

/**
 * Normalize the API response. Rows without an id or with an unknown status are
 * dropped rather than guessed. The clickRef is kept only as the raw string; the
 * caller decides whether it is a HORIZON click id.
 */
export function parseAwinTransactions(payload: unknown): AwinTransaction[] {
  if (!Array.isArray(payload)) return []
  const result: AwinTransaction[] = []
  for (const item of payload) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const id = text(row.id, 64)
    if (!id || !isAwinStatus(row.commissionStatus)) continue
    const commission = money(row.commissionAmount)
    const sale = money(row.saleAmount)
    const clickRefs = row.clickRefs && typeof row.clickRefs === "object" ? (row.clickRefs as Record<string, unknown>) : {}
    result.push({
      id,
      advertiserId: text(row.advertiserId, 32),
      status: row.commissionStatus,
      type: text(row.type, 32),
      commissionCents: commission.cents,
      saleCents: sale.cents,
      currency: commission.currency ?? sale.currency,
      clickRef: text(clickRefs.clickRef, 100) ?? text(row.clickRef, 100),
      transactionDate: isoDate(row.transactionDate),
      validationDate: isoDate(row.validationDate),
    })
  }
  return result
}

/** Awin's date format, in UTC: yyyy-MM-ddThh:mm:ss. */
export function formatAwinDate(date: Date): string {
  return date.toISOString().slice(0, 19)
}

/** Consecutive windows of at most 31 days covering [now - days, now]. */
export function awinWindows(now: Date, days: number): Array<{ start: Date; end: Date }> {
  const total = Math.max(1, Math.floor(days))
  const windows: Array<{ start: Date; end: Date }> = []
  let end = now
  let remaining = total
  while (remaining > 0) {
    const span = Math.min(remaining, AWIN_MAX_WINDOW_DAYS)
    const start = new Date(end.getTime() - span * 864e5)
    windows.unshift({ start, end })
    end = start
    remaining -= span
  }
  return windows
}

export type AwinDateType = "transaction" | "validation"

export type AwinFetchResult =
  | { ok: true; transactions: AwinTransaction[] }
  | { ok: false; reason: "unauthorized" | "rate_limited" | "http_error" | "network_error" | "invalid_json"; status?: number }

export function awinTransactionsUrl(config: Pick<AwinConfig, "publisherId">, start: Date, end: Date, dateType: AwinDateType): string {
  const url = new URL(`/publishers/${encodeURIComponent(config.publisherId)}/transactions/`, AWIN_API_BASE)
  url.searchParams.set("startDate", formatAwinDate(start))
  url.searchParams.set("endDate", formatAwinDate(end))
  url.searchParams.set("timezone", "UTC")
  url.searchParams.set("dateType", dateType)
  return url.toString()
}

/** One window of transactions. Never throws; the token stays in the header. */
export async function fetchAwinTransactions(
  config: AwinConfig,
  window: { start: Date; end: Date },
  dateType: AwinDateType,
  fetchImpl: typeof fetch = fetch,
): Promise<AwinFetchResult> {
  let response: Response
  try {
    response = await fetchImpl(awinTransactionsUrl(config, window.start, window.end, dateType), {
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    return { ok: false, reason: "network_error" }
  }
  if (response.status === 401 || response.status === 403) return { ok: false, reason: "unauthorized", status: response.status }
  if (response.status === 429) return { ok: false, reason: "rate_limited", status: 429 }
  if (!response.ok) return { ok: false, reason: "http_error", status: response.status }
  try {
    return { ok: true, transactions: parseAwinTransactions(await response.json()) }
  } catch {
    return { ok: false, reason: "invalid_json" }
  }
}
