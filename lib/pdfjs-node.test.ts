import { existsSync } from "node:fs"
import { isAbsolute } from "node:path"
import { describe, expect, it } from "vitest"
import { PDFJS_STANDARD_FONT_DATA_URL } from "./pdfjs-node"

describe("pdf.js Node resources", () => {
  it("resolves the installed standard-font directory with a trailing separator", () => {
    expect(isAbsolute(PDFJS_STANDARD_FONT_DATA_URL)).toBe(true)
    expect(PDFJS_STANDARD_FONT_DATA_URL.endsWith("/")).toBe(true)
    expect(PDFJS_STANDARD_FONT_DATA_URL).not.toContain("\\\\")
    expect(existsSync(PDFJS_STANDARD_FONT_DATA_URL)).toBe(true)
  })
})
