import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  PAGE_CONFIDENCE_FLOOR,
  documentStatusAfterExtraction,
  extractionRouteFor,
  toStoredPageRows,
} from "./extract"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

describe("P6 page storage contract", () => {
  /**
   * `document_pages` is the only place per-page text lives, and its unique key is
   * `(document_id, page_no)`. The action relies on that key for its upsert, so if
   * it changed, a re-run would append duplicate pages instead of replacing them.
   */
  it("the table the pages are written to still keys on document and page", () => {
    const baseline = read("supabase/migrations/20260909112037_kintex_assistant_baseline.sql")
    expect(baseline).toContain("unique(document_id,page_no)")
  })

  /**
   * The composite foreign key is what makes an owner/case mismatch impossible at
   * the database; the row builder below mirrors it so the failure never reaches
   * the database in the first place.
   */
  it("the pages table still forbids a row that disagrees with its document", () => {
    const baseline = read("supabase/migrations/20260909112037_kintex_assistant_baseline.sql")
    expect(baseline).toContain(
      "foreign key(document_id,case_id,owner_id) references public.source_documents(id,case_id,owner_id)",
    )
  })
})

describe("documentStatusAfterExtraction", () => {
  it("marks a fully read document READY", () => {
    expect(
      documentStatusAfterExtraction([
        { text: "Hauptvordruck", confidence: 1 },
        { text: "Anlage N", confidence: 1 },
      ]),
    ).toBe("READY")
  })

  it("asks for confirmation when a page yielded no text", () => {
    expect(
      documentStatusAfterExtraction([
        { text: "Seite eins", confidence: 1 },
        { text: "", confidence: 0 },
      ]),
    ).toBe("NEEDS_CONFIRMATION")
  })

  it("asks for confirmation when a page was read below the floor", () => {
    expect(
      documentStatusAfterExtraction([
        { text: "unscharf", confidence: PAGE_CONFIDENCE_FLOOR - 0.01 },
      ]),
    ).toBe("NEEDS_CONFIRMATION")
  })

  it("treats whitespace-only text as no text", () => {
    expect(documentStatusAfterExtraction([{ text: "   \n ", confidence: 1 }])).toBe(
      "NEEDS_CONFIRMATION",
    )
  })

  /**
   * A document with no pages at all must not be reported as READY — that would
   * say "read successfully" about something nothing was read from.
   */
  it("does not call an empty extraction READY", () => {
    expect(documentStatusAfterExtraction([])).toBe("NEEDS_CONFIRMATION")
  })
})

describe("extractionRouteFor", () => {
  it("routes a PDF through the text extractor", () => {
    expect(extractionRouteFor("application/pdf")).toBe("pdf")
  })

  it("routes photos and screenshots through OCR", () => {
    expect(extractionRouteFor("image/jpeg")).toBe("image")
    expect(extractionRouteFor("image/png")).toBe("image")
  })

  it("refuses a type the bucket cannot hold anyway", () => {
    expect(extractionRouteFor("text/plain")).toBe("unsupported")
  })
})

describe("toStoredPageRows", () => {
  it("takes owner and case from the document, never from the caller's page", () => {
    const rows = toStoredPageRows({
      ownerId: "owner-1",
      caseId: "case-1",
      documentId: "doc-1",
      pages: [{ pageNo: 2, text: "Anlage N", confidence: 0.9, needsOcr: false }],
    })
    expect(rows).toEqual([
      {
        owner_id: "owner-1",
        case_id: "case-1",
        document_id: "doc-1",
        page_no: 2,
        text_content: "Anlage N",
        confidence: 0.9,
      },
    ])
  })

  it("keeps the page number so a fact can cite the page it came from", () => {
    const rows = toStoredPageRows({
      ownerId: "o",
      caseId: "c",
      documentId: "d",
      pages: [
        { pageNo: 1, text: "a", confidence: 1, needsOcr: false },
        { pageNo: 3, text: "b", confidence: 1, needsOcr: false },
      ],
    })
    expect(rows.map((row) => row.page_no)).toEqual([1, 3])
  })

  it("produces no rows for a document with no pages", () => {
    expect(
      toStoredPageRows({ ownerId: "o", caseId: "c", documentId: "d", pages: [] }),
    ).toEqual([])
  })
})
