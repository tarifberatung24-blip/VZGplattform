/**
 * P6/P16 — where a quoted piece of evidence came from.
 *
 * The P16 analysis runs over the combined text of every stored page plus the
 * user's pasted text, so its quotes ("Belegstelle") lost the page they were read
 * from. A user checking a deadline against a five-page letter then had to search
 * the whole document for the quoted line.
 *
 * This module finds the quote again in the stored sources and returns the
 * document and page it sits on. It is pure and deterministic: the same quote and
 * sources always give the same location, the first match in document/page order
 * wins, and a quote found nowhere returns `null` — a location is never guessed.
 */

export type EvidencePage = {
  documentId: string
  pageNo: number
  /** Display name of the document, as shown in the case's document list. */
  documentName: string
  text: string
}

export type EvidenceLocation =
  | { kind: "page"; documentId: string; documentName: string; pageNo: number }
  | { kind: "pasted_text" }

/**
 * Comparison form of a text: whitespace collapsed and lower-cased. PDF text
 * extraction collapses line breaks while the analysis quotes individual lines, so
 * an exact comparison would miss quotes that are plainly present.
 */
function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase()
}

export function locateEvidence(
  quote: string | null | undefined,
  sources: { pages: readonly EvidencePage[]; pastedTexts: readonly string[] },
): EvidenceLocation | null {
  if (typeof quote !== "string") return null
  const needle = normalise(quote)
  if (needle.length === 0) return null

  for (const page of sources.pages) {
    if (normalise(page.text).includes(needle)) {
      return {
        kind: "page",
        documentId: page.documentId,
        documentName: page.documentName,
        pageNo: page.pageNo,
      }
    }
  }

  if (sources.pastedTexts.some((text) => normalise(text).includes(needle))) {
    return { kind: "pasted_text" }
  }

  return null
}
