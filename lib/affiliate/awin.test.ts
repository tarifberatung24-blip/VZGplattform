import { describe, expect, it } from "vitest"
import {
  amountToCents,
  awinTransactionsUrl,
  awinWindows,
  fetchAwinTransactions,
  formatAwinDate,
  isAwinConfigured,
  parseAwinTransactions,
  readAwinConfig,
} from "./awin"

const TOKEN = "0123456789abcdef0123"

describe("readAwinConfig", () => {
  it("accepts a numeric publisher id and a long token", () => {
    expect(readAwinConfig({ AWIN_PUBLISHER_ID: " 3073683 ", AWIN_API_TOKEN: TOKEN })).toEqual({ publisherId: "3073683", token: TOKEN })
  })

  it("treats missing or malformed values as not configured", () => {
    expect(readAwinConfig({ AWIN_PUBLISHER_ID: "3073683" })).toBeNull()
    expect(readAwinConfig({ AWIN_PUBLISHER_ID: "abc", AWIN_API_TOKEN: TOKEN })).toBeNull()
    expect(readAwinConfig({ AWIN_PUBLISHER_ID: "3073683", AWIN_API_TOKEN: "short" })).toBeNull()
    expect(readAwinConfig({ AWIN_PUBLISHER_ID: "3073683", AWIN_API_TOKEN: "has a space in it ok" })).toBeNull()
    expect(isAwinConfigured({})).toBe(false)
  })
})

describe("amountToCents", () => {
  it("converts reported amounts without float drift", () => {
    expect(amountToCents(16.5)).toBe(1650)
    expect(amountToCents("55.00")).toBe(5500)
    expect(amountToCents(0.1 + 0.2)).toBe(30)
  })

  it("rejects negative and non-numeric amounts", () => {
    expect(amountToCents(-1)).toBeNull()
    expect(amountToCents("abc")).toBeNull()
    expect(amountToCents(undefined)).toBeNull()
  })
})

describe("parseAwinTransactions", () => {
  const click = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90"

  it("normalizes a transaction and keeps the clickRef", () => {
    const [tx] = parseAwinTransactions([{
      id: 123456789,
      advertiserId: 14797,
      commissionStatus: "approved",
      type: "Commission group transaction",
      commissionAmount: { amount: 16.5, currency: "EUR" },
      saleAmount: { amount: 0, currency: "EUR" },
      clickRefs: { clickRef: click },
      transactionDate: "2026-10-01T10:00:00",
      validationDate: null,
    }])
    expect(tx).toEqual({
      id: "123456789",
      advertiserId: "14797",
      status: "approved",
      type: "Commission group transaction",
      commissionCents: 1650,
      saleCents: 0,
      currency: "EUR",
      clickRef: click,
      transactionDate: new Date("2026-10-01T10:00:00").toISOString(),
      validationDate: null,
    })
  })

  it("drops rows without an id or with an unknown status", () => {
    expect(parseAwinTransactions([{ commissionStatus: "approved" }, { id: "1", commissionStatus: "paid" }, null])).toEqual([])
    expect(parseAwinTransactions({ not: "an array" })).toEqual([])
  })
})

describe("windows and URL", () => {
  it("splits a long period into windows of at most 31 days, oldest first", () => {
    const now = new Date("2026-10-12T00:00:00Z")
    const windows = awinWindows(now, 93)
    expect(windows).toHaveLength(3)
    expect(windows.at(-1)?.end).toEqual(now)
    expect(windows.at(0)?.start).toEqual(new Date("2026-07-11T00:00:00Z"))
    for (const w of windows) expect((w.end.getTime() - w.start.getTime()) / 864e5).toBeLessThanOrEqual(31)
  })

  it("formats dates and builds the documented endpoint", () => {
    expect(formatAwinDate(new Date("2026-10-12T05:40:00.123Z"))).toBe("2026-10-12T05:40:00")
    const url = new URL(awinTransactionsUrl({ publisherId: "3073683" }, new Date("2026-09-11T00:00:00Z"), new Date("2026-10-12T00:00:00Z"), "validation"))
    expect(url.origin + url.pathname).toBe("https://api.awin.com/publishers/3073683/transactions/")
    expect(url.searchParams.get("startDate")).toBe("2026-09-11T00:00:00")
    expect(url.searchParams.get("dateType")).toBe("validation")
    expect(url.searchParams.get("timezone")).toBe("UTC")
    expect(url.search).not.toContain(TOKEN)
  })
})

describe("fetchAwinTransactions", () => {
  const config = { publisherId: "3073683", token: TOKEN }
  const window = { start: new Date("2026-09-11T00:00:00Z"), end: new Date("2026-10-12T00:00:00Z") }

  it("sends the token only in the Authorization header", async () => {
    let seen: { url: string; auth: string | null } | null = null
    const fakeFetch = (async (input: string, init?: RequestInit) => {
      seen = { url: String(input), auth: new Headers(init?.headers).get("authorization") }
      return new Response(JSON.stringify([{ id: "1", commissionStatus: "pending" }]), { status: 200 })
    }) as unknown as typeof fetch
    const result = await fetchAwinTransactions(config, window, "transaction", fakeFetch)
    expect(result.ok && result.transactions).toHaveLength(1)
    expect(seen!.auth).toBe(`Bearer ${TOKEN}`)
    expect(seen!.url).not.toContain(TOKEN)
  })

  it("maps failures to explicit reasons and never throws", async () => {
    const status = (code: number) => (async () => new Response("{}", { status: code })) as unknown as typeof fetch
    expect(await fetchAwinTransactions(config, window, "transaction", status(401))).toEqual({ ok: false, reason: "unauthorized", status: 401 })
    expect(await fetchAwinTransactions(config, window, "transaction", status(429))).toEqual({ ok: false, reason: "rate_limited", status: 429 })
    expect(await fetchAwinTransactions(config, window, "transaction", status(500))).toEqual({ ok: false, reason: "http_error", status: 500 })
    const broken = (async () => { throw new Error("offline") }) as unknown as typeof fetch
    expect(await fetchAwinTransactions(config, window, "transaction", broken)).toEqual({ ok: false, reason: "network_error" })
    const notJson = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch
    expect(await fetchAwinTransactions(config, window, "transaction", notJson)).toEqual({ ok: false, reason: "invalid_json" })
  })
})
