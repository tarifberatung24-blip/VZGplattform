/**
 * P9 — overlay writer (pdf-lib).
 *
 * Draws planned placements onto a copy of the verified official template and
 * returns the bytes. The source template is never modified: bytes are loaded,
 * annotated in memory and emitted as a new document.
 *
 * **Font.** Values are drawn with the standard Helvetica face, which pdf-lib
 * encodes as WinAnsi. German umlauts and `ß` are inside WinAnsi, so they render
 * and extract correctly without embedding a font — verified by round-tripping the
 * written PDF through a reader, not assumed. A value containing a character
 * outside WinAnsi is refused rather than written as a substitute, because a
 * mangled name on an official form is worse than a refusal.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { OverlayPlacement, OverlayPlan } from "./overlay-fill"
import type { StaticTemplateMapping } from "./overlay-map"
import { isWinAnsiRepresentable } from "./encoding"

export type OverlayWriteResult =
  | { ok: true; bytes: Uint8Array; filledCount: number }
  | { ok: false; code: "winansi_unsupported" | "write_failed"; detail: string }


/**
 * Writes the placements into a copy of the template.
 *
 * Page count is checked against the mapping: drawing onto a page the mapping was
 * not measured against would place values at unverified positions.
 */
export async function writeOverlay(input: {
  templateBytes: Uint8Array
  mapping: StaticTemplateMapping
  plan: Extract<OverlayPlan, { ok: true }>
  /** Draw a light background behind values so they read as entered data. */
  shade?: boolean
}): Promise<OverlayWriteResult> {
  const { plan } = input

  for (const placement of plan.placements) {
    if (!isWinAnsiRepresentable(placement.value)) {
      return {
        ok: false,
        code: "winansi_unsupported",
        detail: placement.fieldName,
      }
    }
  }

  try {
    const document = await PDFDocument.load(input.templateBytes)
    const pages = document.getPages()
    const font = await document.embedFont(StandardFonts.Helvetica)

    const maxPage = input.mapping.fields.reduce((highest, field) => Math.max(highest, field.page), 1)
    if (pages.length < maxPage) {
      return {
        ok: false,
        code: "write_failed",
        detail: `template has ${pages.length} pages, mapping expects ${maxPage}`,
      }
    }

    const byPage = new Map<number, OverlayPlacement[]>()
    for (const placement of plan.placements) {
      const list = byPage.get(placement.page) ?? []
      list.push(placement)
      byPage.set(placement.page, list)
    }

    for (const [pageNumber, placements] of byPage) {
      const page = pages[pageNumber - 1]
      for (const placement of placements) {
        const field = input.mapping.fields.find((entry) => entry.fieldName === placement.fieldName)
        if (!field) continue
        if (input.shade) {
          // A faint band improves legibility where the template has ruled lines.
          page.drawRectangle({
            x: field.x,
            y: field.yBottom,
            width: field.maxWidth,
            height: field.maxHeight,
            color: rgb(1, 1, 1),
            opacity: 0.85,
          })
        }
        page.drawText(placement.value, {
          x: placement.x,
          y: placement.y,
          size: placement.size,
          font,
          color: rgb(0, 0, 0),
        })
      }
    }

    const bytes = await document.save()
    return { ok: true, bytes, filledCount: plan.placements.length }
  } catch (error) {
    return {
      ok: false,
      code: "write_failed",
      detail: error instanceof Error ? error.message : "write_failed",
    }
  }
}