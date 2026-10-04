import { describe, expect, it } from "vitest"
import { extractFacts, needsReview } from "@/app/api/inkasso/cases/[id]/extract/route"
import { renderDraft, submissionGuidance } from "./drafts"
import { evaluate } from "./rule-pack"
import { sanitizeGroups } from "./facts"

/**
 * A Mahnbescheid in the shape the reference case arrives in: German letterhead,
 * a creditor block, the itemised claim, and a utility period.
 */
const LETTER = `
Amtsgericht Hünfeld
Aktenzeichen: 26-5844927-0-0

Gläubiger: Bad Homburger Inkasso GmbH
ehemaliger Gläubiger: BHS / Stadtwerke Duisburg AG
Vertragskonto: 8802312928

Hauptforderung: 1.915,65 €
Verfahrenskosten: 232,38 €
Inkassokosten: 125,66 €
Verzugszinsen: 153,36 €
Gesamtbetrag: 2.427,05 €

Zugestellt am 05.03.2026
Zählernummer: 115K0070733086
Abrechnungszeitraum: 11.01.2025-31.07.2025
Verbrauch: 1.385 kWh
`

describe("inkasso pipeline", () => {
  it("extracts the parties, amounts and dates from a Mahnbescheid", () => {
    const facts = extractFacts(LETTER)

    expect(facts.parties.creditor.value).toContain("Bad Homburger Inkasso")
    expect(facts.parties.former_creditor.value).toContain("Stadtwerke Duisburg")
    expect(facts.parties.case_no.value).toContain("26-5844927-0-0")
    expect(facts.parties.court.value).toContain("Hünfeld")

    expect(facts.claim.hauptforderung.value).toBe(1915.65)
    expect(facts.claim.verfahrenskosten.value).toBe(232.38)
    expect(facts.claim.inkassokosten.value).toBe(125.66)
    expect(facts.claim.zinsen.value).toBe(153.36)
    expect(facts.claim.total.value).toBe(2427.05)

    expect(facts.dates.service_date.value).toBe("2026-03-05")
    expect(facts.evidence.meter_no.value).toBe("115K0070733086")
    expect(facts.evidence.consumption_kwh.value).toBe(1385)
  })

  it("flags the fields it could not read with confidence", () => {
    const sparse = extractFacts("Irgendein Schreiben ohne Beträge.")
    const review = needsReview(sparse)
    expect(review).toContain("claim.hauptforderung")
    expect(review).toContain("parties.creditor")
  })

  it("carries the letter through sanitising, evaluation and drafting", () => {
    const facts = extractFacts(LETTER)

    // The wizard turns extraction into the case groups, then the API sanitises.
    const sanitized = sanitizeGroups({
      parties: {
        creditor: facts.parties.creditor.value,
        former_creditor: facts.parties.former_creditor.value,
        court: facts.parties.court.value,
        case_no: facts.parties.case_no.value,
      },
      claim: {
        hauptforderung: facts.claim.hauptforderung.value,
        verfahrenskosten: facts.claim.verfahrenskosten.value,
        inkassokosten: facts.claim.inkassokosten.value,
        zinsen: facts.claim.zinsen.value,
        total: facts.claim.total.value,
      },
      dates: { service_date: facts.dates.service_date.value },
      evidence: {
        meter_no: facts.evidence.meter_no.value,
        consumption_kwh: facts.evidence.consumption_kwh.value,
        parallel_billing: true,
        data_exchange_delay_admitted: true,
      },
    })

    const evaluation = evaluate({ ...sanitized, now: new Date("2026-03-10T00:00:00Z") })

    expect(evaluation.risk).toBe("high")
    expect(evaluation.deadline_status).toBe("open")
    expect(evaluation.reducible_total).toBeCloseTo(511.4, 2)
    expect(evaluation.actions).toContain("WIDERSPRUCH")

    const reference = {
      caseNo: sanitized.parties.case_no,
      court: sanitized.parties.court,
      creditor: sanitized.parties.creditor,
      reducible: evaluation.reducible_total,
      deadline: "2026-03-19",
    }

    for (const locale of ["bg", "de"] as const) {
      const letter = renderDraft("WIDERSPRUCH", locale, sanitized, reference)
      expect(letter).toContain("§ 694 ZPO")
      expect(letter).toContain("2.427,05 €")
      expect(letter).toContain("Bad Homburger Inkasso")
      expect(letter).toMatch(/ENTWURF|ЧЕРНОВА/)
    }

    for (const locale of ["bg", "de"] as const) {
      const guidance = submissionGuidance(locale, "2026-03-19")
      expect(guidance.join(" ")).toContain("online-mahnantrag.de")
      expect(guidance.join(" ")).toContain("2026-03-19")
    }
  })

  it("rejects a negative amount rather than assessing it", () => {
    const groups = sanitizeGroups({
      claim: { hauptforderung: -500, total: 100 },
      parties: {},
      dates: {},
      evidence: {},
    })
    expect(groups.claim.hauptforderung).toBe(0)
    expect(groups.claim.total).toBe(100)
  })
})
