import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { locateEvidence, type EvidencePage } from "./evidence"
import { analyseDocumentText, combineAnalysisText } from "./analysis"

const pages: EvidencePage[] = [
  {
    documentId: "doc-a",
    pageNo: 1,
    documentName: "bescheid.pdf",
    text: "Bundesagentur für Arbeit Bescheid über Arbeitslosengeld Seite 1 von 2",
  },
  {
    documentId: "doc-a",
    pageNo: 2,
    documentName: "bescheid.pdf",
    text: "Rechtsbehelfsbelehrung Widerspruch bis zum 15.11.2026 schriftlich einlegen",
  },
  {
    documentId: "doc-b",
    pageNo: 1,
    documentName: "rechnung.pdf",
    text: "Stadtwerke Rechnung Nr. 4711",
  },
]

describe("locateEvidence", () => {
  it("finds the page a quote came from", () => {
    expect(locateEvidence("Widerspruch bis zum 15.11.2026", { pages, pastedTexts: [] })).toEqual({
      kind: "page",
      documentId: "doc-a",
      documentName: "bescheid.pdf",
      pageNo: 2,
    })
  })

  it("matches across collapsed whitespace and case, as PDF text is stored", () => {
    const location = locateEvidence("STADTWERKE\n  Rechnung", { pages, pastedTexts: [] })
    expect(location).toMatchObject({ kind: "page", documentId: "doc-b", pageNo: 1 })
  })

  it("reports pasted text when the quote is only there", () => {
    expect(
      locateEvidence("Zahlung bis 01.12.2026", { pages, pastedTexts: ["Bitte Zahlung bis 01.12.2026 leisten"] }),
    ).toEqual({ kind: "pasted_text" })
  })

  it("prefers a stored page over pasted text when both contain the quote", () => {
    const location = locateEvidence("Rechnung Nr. 4711", { pages, pastedTexts: ["Rechnung Nr. 4711"] })
    expect(location).toMatchObject({ kind: "page", documentId: "doc-b" })
  })

  it("never guesses a location for a quote that is not in any source", () => {
    expect(locateEvidence("Mahnbescheid", { pages, pastedTexts: [] })).toBeNull()
    expect(locateEvidence("", { pages, pastedTexts: [] })).toBeNull()
    expect(locateEvidence(null, { pages, pastedTexts: [] })).toBeNull()
  })

  it("locates the analysis' own deadline quote on the page it was printed on", () => {
    const text = combineAnalysisText({ pages: pages.map((page) => page.text), messages: [] })
    const analysis = analyseDocumentText({ text })
    expect(analysis.deadline.quote).not.toBeNull()
    expect(locateEvidence(analysis.deadline.quote, { pages, pastedTexts: [] })).toMatchObject({
      kind: "page",
      documentId: "doc-a",
      pageNo: 2,
    })
  })
})

describe("wiring", () => {
  const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8")

  it("the case page passes the stored pages and pasted texts to the workspace", () => {
    const page = read("app/[locale]/guide/[caseId]/page.tsx")
    expect(page).toContain("evidenceSources={evidenceSources}")
    expect(page).toContain("documentDisplayName(doc.path)")
  })

  it("the P16 panel shows a location for the kind, deadline and risk quotes", () => {
    const panel = read("components/unterlagen/unterlagen-panel.tsx")
    expect(panel).toContain("whereFound(analysis.kindEvidence)")
    expect(panel).toContain("whereFound(analysis.deadline.quote)")
    expect(panel).toContain("whereFound(signal.quote)")
  })
})
