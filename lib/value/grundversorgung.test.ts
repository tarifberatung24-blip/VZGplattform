import { describe, expect, it } from "vitest"
import { findGrundversorgung, isGrundversorgung } from "./grundversorgung"

const base = { id: "c1", title: "Strom", category: "electricity", provider_name: "Stadtwerke Beispiel" }

describe("Grundversorgungs-Check", () => {
  it("detects Grundversorgung evidenced in the title, notes or extracted facts", () => {
    expect(isGrundversorgung({ ...base, title: "Strom Grundversorgung" })).toBe(true)
    expect(isGrundversorgung({ ...base, notes: "Tarif: Grundversorgungstarif" })).toBe(true)
    expect(isGrundversorgung({ ...base, category: "gas", extracted_facts: { tariff: "Ersatzversorgung Gas" } })).toBe(true)
  })

  it("does not guess without evidence", () => {
    expect(isGrundversorgung(base)).toBe(false)
    expect(isGrundversorgung({ ...base, extracted_facts: null, notes: null })).toBe(false)
  })

  it("only looks at electricity and gas contracts", () => {
    expect(isGrundversorgung({ ...base, category: "internet", title: "Grundversorgung" })).toBe(false)
  })

  it("returns compact matches with a normalized category", () => {
    expect(findGrundversorgung([
      { ...base, title: "Grundversorgung Strom" },
      { ...base, id: "c2", category: "Gas", title: "", notes: "grundversorgung" },
      { ...base, id: "c3" },
    ])).toEqual([
      { id: "c1", title: "Grundversorgung Strom", providerName: "Stadtwerke Beispiel", category: "electricity" },
      { id: "c2", title: "Stadtwerke Beispiel", providerName: "Stadtwerke Beispiel", category: "gas" },
    ])
  })
})
