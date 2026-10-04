import { describe, expect, it } from "vitest"
import { BASISZINSSATZ_PCT, PACK_VERSION, deadlineFor, evaluate } from "./rule-pack"

/**
 * The reference case from the specification: Bad Homburger Inkasso GmbH
 * pursuing 2,427.05 € over a utility period in which the customer had a
 * different supplier and where a data-exchange failure was admitted.
 */
const REFERENCE = {
  claim: {
    hauptforderung: 1915.65,
    verfahrenskosten: 232.38,
    inkassokosten: 125.66,
    zinsen: 153.36,
    total: 2427.05,
    currency: "EUR" as const,
  },
  dates: {
    mahnbescheid: "2026-03-02",
    service_date: "2026-03-05",
    widerspruch_deadline: null,
  },
  evidence: {
    supplier: "energis",
    meter_no: "115K0070733086",
    period: "11.01.2025–31.07.2025",
    consumption_kwh: 1385,
    amount: 609.98,
    parallel_billing: true,
    data_exchange_delay_admitted: true,
  },
  now: new Date("2026-03-10T00:00:00Z"),
}

describe("inkasso rule pack", () => {
  it("returns the documented outcomes for the reference case", () => {
    const r = evaluate(REFERENCE)

    expect(r.pack_version).toBe(PACK_VERSION)
    expect(r.basiszinssatz_pct).toBe(BASISZINSSATZ_PCT)
    expect(r.risk).toBe("high")
    expect(r.deadline_status).toBe("open")

    // Interest, inkasso fee and reminder costs are all challenged once the
    // data-exchange failure removes default: 153.36 + 125.66 + 232.38.
    expect(r.reducible_total).toBe(511.4)

    expect(r.actions).toContain("WIDERSPRUCH")
    expect(r.actions).toContain("ABTRETUNGSNACHWEIS")
    expect(r.actions).toContain("VERGLEICH")

    // Every rule must contribute a position with a legal basis.
    const rules = r.positions.map((p) => p.rule)
    for (const rule of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R9", "R10", "R11"]) {
      expect(rules).toContain(rule)
    }
    for (const position of r.positions) expect(position.basis.length).toBeGreaterThan(0)

    expect(r.disclaimer).toMatch(/не е правна консултация|keine Rechtsberatung/)
  })

  it("computes the two-week objection deadline", () => {
    const open = deadlineFor("2026-03-05", new Date("2026-03-10T00:00:00Z"))
    expect(open.deadline).toBe("2026-03-19")
    expect(open.status).toBe("open")

    const critical = deadlineFor("2026-03-05", new Date("2026-03-17T00:00:00Z"))
    expect(critical.status).toBe("critical")

    const expired = deadlineFor("2026-03-05", new Date("2026-04-01T00:00:00Z"))
    expect(expired.status).toBe("expired")

    expect(deadlineFor(null, new Date()).status).toBe("unknown")
  })

  it("marks a claim as due when nothing is wrong with it", () => {
    const clean = evaluate({
      claim: {
        hauptforderung: 500,
        verfahrenskosten: 0,
        inkassokosten: 0,
        zinsen: 0,
        total: 500,
        currency: "EUR",
      },
      dates: { mahnbescheid: null, service_date: "2026-03-05", widerspruch_deadline: null },
      evidence: {
        supplier: "Stadtwerke",
        meter_no: "",
        period: "2026",
        consumption_kwh: 0,
        amount: 0,
        parallel_billing: false,
        data_exchange_delay_admitted: false,
      },
      abtretung_proven: true,
      now: new Date("2026-03-07T00:00:00Z"),
    })

    expect(clean.reducible_total).toBe(0)
    expect(clean.risk).toBe("low")
    expect(clean.actions).not.toContain("SCHUFA_UNTERLASSUNG")
    expect(clean.actions).not.toContain("VERGLEICH")
  })

  it("halves the inkasso fee on a claim that is not yet titulated", () => {
    const r = evaluate({
      claim: {
        hauptforderung: 1000,
        verfahrenskosten: 0,
        inkassokosten: 100,
        zinsen: 0,
        total: 1100,
        currency: "EUR",
      },
      dates: { mahnbescheid: null, service_date: "2026-03-05", widerspruch_deadline: null },
      evidence: {
        supplier: "Stadtwerke",
        meter_no: "",
        period: "2026",
        consumption_kwh: 0,
        amount: 0,
        parallel_billing: false,
        data_exchange_delay_admitted: false,
      },
      abtretung_proven: true,
      now: new Date("2026-03-07T00:00:00Z"),
    })

    const fee = r.positions.find((p) => p.rule === "R4")
    expect(fee?.assessment).toBe("reducible")
    expect(fee?.amount).toBe(50)
  })

  it("treats a claim past the limitation period as unfounded", () => {
    const r = evaluate({
      claim: {
        hauptforderung: 300,
        verfahrenskosten: 0,
        inkassokosten: 0,
        zinsen: 0,
        total: 300,
        currency: "EUR",
      },
      dates: { mahnbescheid: null, service_date: null, widerspruch_deadline: null },
      evidence: {
        supplier: "Stadtwerke",
        meter_no: "",
        period: "2021",
        consumption_kwh: 0,
        amount: 0,
        parallel_billing: false,
        data_exchange_delay_admitted: false,
      },
      abtretung_proven: true,
      now: new Date("2026-03-07T00:00:00Z"),
    })

    expect(r.positions.find((p) => p.rule === "R6")?.assessment).toBe("unfounded")
  })
})
