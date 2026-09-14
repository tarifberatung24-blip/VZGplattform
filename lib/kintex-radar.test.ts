import { describe, expect, it } from "vitest"
import { getKintexRadarSignals, type RadarContract } from "./kintex-radar"

const now = new Date("2026-09-08T12:00:00Z")
const contract: RadarContract = {
  id: "contract-1", title: "Internet", category: "internet",
  monthly_amount: 30, status: "draft", review_status: "confirmed",
  end_date: "2027-03-31", cancellation_deadline: "2026-09-30",
}

describe("contract radar", () => {
  it("reports the cancellation deadline even when contract end is far away", () => {
    expect(getKintexRadarSignals([contract], now).map((signal) => signal.id)).toEqual(["contract-1-cancellation"])
  })
  it("keeps a deadline visible for the entire German calendar day", () => {
    const signals = getKintexRadarSignals([{ ...contract, cancellation_deadline: "2026-09-08", end_date: "2026-09-08" }], new Date("2026-09-08T21:59:59Z"))
    expect(signals.map((signal) => signal.id)).toEqual(["contract-1-cancellation", "contract-1-end"])
    expect(getKintexRadarSignals([{ ...contract, cancellation_deadline: "2026-09-08", end_date: "2026-09-08" }], new Date("2026-09-08T22:00:00Z"))).toEqual([])
  })
  it("includes day 90 and excludes day 91", () => {
    expect(getKintexRadarSignals([{ ...contract, cancellation_deadline: "2026-12-07" }], now)).toHaveLength(1)
    expect(getKintexRadarSignals([{ ...contract, cancellation_deadline: "2026-12-08" }], now)).toEqual([])
  })
  it("marks a recorded unconfirmed cancellation date for review", () => {
    const signals = getKintexRadarSignals([{ ...contract, review_status: "needs_review" }], now)
    expect(signals.some((signal) => signal.id.endsWith("-review"))).toBe(true)
    expect(signals.find((signal) => signal.id.endsWith("-cancellation"))?.detail).toContain("чака потвърждение")
  })
  it("rejects invalid dates instead of normalizing them into real deadlines", () => {
    expect(getKintexRadarSignals([{ ...contract, cancellation_deadline: "2026-09-31", end_date: "invalid" }], now)).toEqual([])
  })
  it("does not invent a cancellation deadline when it is missing", () => {
    expect(getKintexRadarSignals([{ ...contract, cancellation_deadline: null }], now)).toEqual([])
  })
  it("retains deadlines beyond six signals for API persistence", () => {
    const contracts = Array.from({ length: 8 }, (_, index) => ({ ...contract, id: `contract-${index}` }))
    expect(getKintexRadarSignals(contracts, now)).toHaveLength(8)
  })
  it("deduplicates signals for the same contract", () => {
    expect(getKintexRadarSignals([contract, contract], now)).toHaveLength(1)
  })
})
