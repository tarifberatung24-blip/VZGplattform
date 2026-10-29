import { describe, expect, it } from "vitest"
import { renderVorlagePdf } from "./pdf"
import { vorlagen } from "./index"
import type { VorlageFacts } from "./types"

/**
 * The PDF path is the part a reader actually sends, so it is exercised for real
 * here rather than assumed from the builder's text output. pdf-lib is pure
 * JavaScript and imports nothing server-only, which is why this runs in the test
 * environment exactly as it runs in the reader's browser.
 */

const fullFacts: VorlageFacts = {
  sender_name: "Ivan Petrov",
  sender_address: "Hauptstraße 1\n10115 Berlin",
  recipient_name: "Hausverwaltung GmbH",
  recipient_address: "Nebenstraße 2\n10117 Berlin",
  place: "Berlin",
  letter_date: "2026-10-23",
  defect_description: "Die Heizung im Wohnzimmer bleibt kalt.",
  defect_since: "2026-10-01",
  rental_property: "Hauptstraße 1, Wohnung 3",
  employer_name: "Beispiel GmbH",
  position: "Buchhalter",
  employment_from: "2020-01-01",
  employment_to: "2026-09-30",
  leave_from: "2026-12-01",
  leave_to: "2026-12-12",
  authority_name: "Jobcenter Berlin",
  decision_date: "2026-10-01",
  decision_reference: "123/456/789",
  objection_reason: "Die Einkommensangabe wurde falsch berechnet.",
}

describe("vorlage PDF", () => {
  it("renders a real PDF for every template", async () => {
    for (const template of vorlagen) {
      const result = await renderVorlagePdf({ template, facts: fullFacts, letterDateIso: "2026-10-23" })
      expect(result.ok, `${template.slug} failed to render: ${result.ok ? "" : result.detail}`).toBe(true)
      if (!result.ok) continue
      // The `%PDF-` magic bytes: proof that the writer produced a document, not a
      // buffer that merely happens to be non-empty.
      expect(String.fromCharCode(...result.bytes.slice(0, 5)), `${template.slug} is not a PDF`).toBe("%PDF-")
      expect(result.bytes.length, `${template.slug} produced a suspiciously small PDF`).toBeGreaterThan(500)
    }
  })

  it("refuses a letter it cannot encode instead of printing mojibake", async () => {
    // pdf-lib throws on text outside WinAnsi, so the writer refuses up front. A
    // Bulgarian name is the case a reader will actually hit: the honest answer is a
    // clear refusal, not a mangled name on a letter to an authority.
    const result = await renderVorlagePdf({
      template: vorlagen[0],
      facts: { ...fullFacts, sender_name: "Иван Петров" },
      letterDateIso: "2026-10-23",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.detail).toBe("unsupported_characters")
  })

  it("is byte-identical for the same input", async () => {
    const first = await renderVorlagePdf({ template: vorlagen[0], facts: fullFacts, letterDateIso: "2026-10-23" })
    const second = await renderVorlagePdf({ template: vorlagen[0], facts: fullFacts, letterDateIso: "2026-10-23" })
    expect(first.ok && second.ok).toBe(true)
    if (first.ok && second.ok) expect([...second.bytes]).toEqual([...first.bytes])
  })
})
