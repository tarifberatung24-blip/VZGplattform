import { describe, expect, it } from "vitest"
import type { AwinTransaction } from "./awin"
import { dedupeTransactions, reconcileAwinTransactions, savingActionFor } from "./reconcile"

const KNOWN = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90"
const UNKNOWN = "11111111-2222-4333-8444-555555555555"

function tx(id: string, status: AwinTransaction["status"], clickRef: string | null): AwinTransaction {
  return { id, advertiserId: "14797", status, type: null, commissionCents: 1650, saleCents: null, currency: "EUR", clickRef, transactionDate: null, validationDate: null }
}

type Call = { table: string; op: string; args: unknown[] }

function stubClient(options: { clicks?: string[]; cancelled?: number; upsertError?: boolean; lookupError?: boolean } = {}) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const record = (op: string, ...args: unknown[]) => calls.push({ table, op, args })
      const result = () => {
        if (table === "affiliate_click_events") {
          return options.lookupError ? { data: null, error: { message: "x" } } : { data: (options.clicks ?? []).map((id) => ({ id })), error: null }
        }
        if (table === "affiliate_network_transactions") return { data: null, error: options.upsertError ? { message: "x" } : null }
        return { data: Array.from({ length: options.cancelled ?? 0 }, (_, i) => ({ id: `s${i}` })), error: null }
      }
      const builder: Record<string, unknown> = {
        select: (...args: unknown[]) => { record("select", ...args); return builder },
        in: (...args: unknown[]) => { record("in", ...args); return builder },
        eq: (...args: unknown[]) => { record("eq", ...args); return builder },
        update: (...args: unknown[]) => { record("update", ...args); return builder },
        upsert: (...args: unknown[]) => { record("upsert", ...args); return builder },
        then: (resolve: (value: unknown) => unknown) => resolve(result()),
      }
      return builder
    },
  }
  return { client: client as never, calls }
}

describe("savingActionFor", () => {
  it("cancels only on a declined transaction", () => {
    expect(savingActionFor("declined")).toBe("cancel")
    expect(savingActionFor("approved")).toBe("none")
    expect(savingActionFor("pending")).toBe("none")
    expect(savingActionFor("deleted")).toBe("none")
  })
})

describe("dedupeTransactions", () => {
  it("keeps the latest row per network id", () => {
    expect(dedupeTransactions([tx("1", "pending", null), tx("1", "approved", null)])).toEqual([tx("1", "approved", null)])
  })
})

describe("reconcileAwinTransactions", () => {
  it("links only known HORIZON clicks and stores every transaction once", async () => {
    const { client, calls } = stubClient({ clicks: [KNOWN] })
    const totals = await reconcileAwinTransactions(client, [tx("1", "approved", KNOWN), tx("2", "pending", UNKNOWN), tx("3", "pending", "not-a-uuid")])
    expect(totals).toEqual({ received: 3, stored: 3, linkedToClick: 1, cancelledSavings: 0, failures: 0 })
    const upsert = calls.find((c) => c.op === "upsert")!
    const rows = upsert.args[0] as Array<{ network_transaction_id: string; click_event_id: string | null }>
    expect(rows.map((r) => [r.network_transaction_id, r.click_event_id])).toEqual([["1", KNOWN], ["2", null], ["3", null]])
    expect(upsert.args[1]).toEqual({ onConflict: "network,network_transaction_id" })
    expect(calls.some((c) => c.table === "household_savings")).toBe(false)
  })

  it("cancels the secured saving of a declined, linked click", async () => {
    const { client, calls } = stubClient({ clicks: [KNOWN], cancelled: 1 })
    const totals = await reconcileAwinTransactions(client, [tx("9", "declined", KNOWN)])
    expect(totals.cancelledSavings).toBe(1)
    const savingCalls = calls.filter((c) => c.table === "household_savings")
    expect(savingCalls.find((c) => c.op === "update")?.args[0]).toEqual({ status: "cancelled" })
    expect(savingCalls.find((c) => c.op === "in")?.args).toEqual(["click_event_id", [KNOWN]])
    expect(savingCalls.find((c) => c.op === "eq")?.args).toEqual(["status", "secured"])
  })

  it("stops and reports a failure when the click lookup or the write fails", async () => {
    expect((await reconcileAwinTransactions(stubClient({ lookupError: true }).client, [tx("1", "approved", KNOWN)])).failures).toBe(1)
    const failedWrite = await reconcileAwinTransactions(stubClient({ clicks: [KNOWN], upsertError: true }).client, [tx("1", "declined", KNOWN)])
    expect(failedWrite).toEqual({ received: 1, stored: 0, linkedToClick: 1, cancelledSavings: 0, failures: 1 })
  })

  it("does nothing for an empty run", async () => {
    const { client, calls } = stubClient()
    expect(await reconcileAwinTransactions(client, [])).toEqual({ received: 0, stored: 0, linkedToClick: 0, cancelledSavings: 0, failures: 0 })
    expect(calls).toEqual([])
  })
})
