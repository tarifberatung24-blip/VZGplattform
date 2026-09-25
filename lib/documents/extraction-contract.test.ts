import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  EXTRACTABLE_MIME_TYPES,
  PAGE_CONFIDENCE_FLOOR,
  documentStatusAfterExtraction,
  extractionRouteFor,
  pageNeedsConfirmation,
} from "./extraction-contract"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

describe("unified extraction contract", () => {
  /**
   * The bug this contract exists to prevent: `[].some(...)` is `false`, so a
   * status rule written as a bare `.some()` call reports READY when nothing was
   * read at all. Every calling stack must therefore refuse READY on zero pages.
   */
  it("never reports READY when nothing was extracted", () => {
    expect(documentStatusAfterExtraction([])).toBe("NEEDS_CONFIRMATION")
  })

  it("reports READY only for pages that all carry text at or above the floor", () => {
    expect(
      documentStatusAfterExtraction([
        { text: "Bescheid", confidence: 1 },
        { text: "Frist", confidence: PAGE_CONFIDENCE_FLOOR },
      ]),
    ).toBe("READY")
  })

  it("asks for confirmation below the floor or on empty text", () => {
    expect(documentStatusAfterExtraction([{ text: "x", confidence: PAGE_CONFIDENCE_FLOOR - 0.01 }])).toBe(
      "NEEDS_CONFIRMATION",
    )
    expect(documentStatusAfterExtraction([{ text: "   \n ", confidence: 1 }])).toBe("NEEDS_CONFIRMATION")
  })

  it("classifies a single page the same way as the whole document", () => {
    const confident = { text: "Antrag", confidence: 1 }
    expect(pageNeedsConfirmation(confident)).toBe(false)
    expect(documentStatusAfterExtraction([confident])).toBe("READY")

    const blank = { text: "", confidence: 1 }
    expect(pageNeedsConfirmation(blank)).toBe(true)
    expect(documentStatusAfterExtraction([blank])).toBe("NEEDS_CONFIRMATION")
  })

  it("routes only declared mime types, and pdf and image differ", () => {
    expect(extractionRouteFor("application/pdf")).toBe("pdf")
    expect(extractionRouteFor("image/jpeg")).toBe("image")
    expect(extractionRouteFor("image/png")).toBe("image")
    expect(extractionRouteFor("text/plain")).toBe("unsupported")
    for (const mime of EXTRACTABLE_MIME_TYPES) {
      expect(extractionRouteFor(mime)).not.toBe("unsupported")
    }
  })
})

/**
 * Static coherence: both stacks must actually consume the shared contract
 * rather than keeping a private copy of the rule. This is what makes the
 * reconciliation real instead of aspirational.
 */
describe("both document stacks use the shared contract", () => {
  it("the office extraction path consumes the shared status rule", () => {
    const office = read("lib/office/workflow/documents.ts")
    expect(office).toMatch(/from ['"]\.\.\/\.\.\/documents\/extraction-contract['"]/)
    expect(office).toContain("documentStatusAfterExtraction")
    expect(office).toContain("pageNeedsConfirmation")
  })

  it("the HORIZON extraction path consumes the shared status rule", () => {
    const horizon = read("lib/horizon/intake/extract.ts")
    expect(horizon).toMatch(/from ['"]\.\.\/\.\.\/documents\/extraction-contract['"]/)
  })

  it("the office path has no private empty-extraction READY rule left", () => {
    const office = read("lib/office/workflow/documents.ts")
    // The old bug: a bare `.some()` decided the status, which is false on zero
    // pages, so nothing-read was labelled READY. The status must now come from
    // the shared rule, and the old status expressions must be gone.
    expect(office).toContain("documentStatusAfterExtraction(pages)")
    expect(office).not.toMatch(/const status = .*\.some\(/)
    // The image path must route through the shared rule too, not its own compare.
    expect(office).not.toMatch(/const status = confidence </)
  })
})
