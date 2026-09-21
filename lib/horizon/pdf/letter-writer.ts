/**
 * P14 — the Kündigung letter as a PDF.
 *
 * This is the one place the project draws its own page rather than filling an
 * official template, and the difference is deliberate. Everywhere else the layout
 * is the authority's and the code only inserts values into it, so a wrong
 * coordinate would silently misplace a user's data on a real form. Here there is
 * no official template to mis-fill: the letter is our own output, addressed to a
 * private company, and its correctness is a matter of the text, not of a
 * form layout.
 *
 * The layout is therefore simple and fixed: A4, one margin, one typeface, wrapped
 * at a measured width. Text is laid out line by line so pagination is explicit
 * rather than delegated to a library that might reflow differently between
 * versions — the same letter must produce the same pagination every time.
 *
 * German letters need Umlaute and ß, which Helvetica/WinAnsi covers. Anything
 * outside WinAnsi is refused rather than transliterated, exactly as the form
 * engine does: silently altering a person's name on a legal document is a worse
 * outcome than declining.
 *
 * The document makes no signature claim. A visual signature on a self-drawn
 * letter would be a mark with no verified placement binding it to an official
 * template, so P10's engine is not invoked here at all.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { isWinAnsiRepresentable } from "./encoding"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN_X = 56.7
const MARGIN_TOP = 56.7
const MARGIN_BOTTOM = 56.7
const FONT_SIZE = 11
const LINE_HEIGHT = 15

export type LetterPdfResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; detail: string }

/**
 * Wraps text to a width using the writer's own font metrics.
 *
 * Words longer than the line are left on their own line rather than broken: a
 * split reference number is harder to read and easier to mistype than one that
 * overflows slightly.
 */
function wrapLine(
  text: string,
  widthOf: (value: string) => number,
): string[] {
  if (text.length === 0) return [""]
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`
    if (widthOf(candidate) > A4_WIDTH - 2 * MARGIN_X) {
      if (current.length === 0) {
        lines.push(word)
      } else {
        lines.push(current)
        current = word
      }
    } else {
      current = candidate
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

/**
 * Renders the letter body to PDF bytes.
 *
 * `letterDateIso` becomes the document's creation and modification date, so the
 * same letter generated for the same day produces byte-identical output. Without
 * pinning the dates, pdf-lib would embed the wall-clock time and the output hash
 * recorded in the audit trail would change on every run.
 */
export async function generateLetterPdf(input: {
  body: string
  letterDateIso: string
}): Promise<LetterPdfResult> {
  if (!isWinAnsiRepresentable(input.body)) {
    return { ok: false, detail: "unsupported_characters" }
  }

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const widthOf = (value: string) => font.widthOfTextAtSize(value, FONT_SIZE)

  const allLines: string[] = []
  for (const rawLine of input.body.split("\n")) {
    // `wrapLine` returns at least one entry, so empty source lines survive as
    // blank lines and the letter keeps the paragraphing the generator intended.
    allLines.push(...(rawLine.length === 0 ? [""] : wrapLine(rawLine, widthOf)))
  }

  const usableHeight = A4_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const linesPerPage = Math.max(1, Math.floor(usableHeight / LINE_HEIGHT))

  for (let offset = 0; offset < allLines.length; offset += linesPerPage) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
    const slice = allLines.slice(offset, offset + linesPerPage)
    slice.forEach((line, index) => {
      if (line.length === 0) return
      page.drawText(line, {
        x: MARGIN_X,
        y: A4_HEIGHT - MARGIN_TOP - index * LINE_HEIGHT,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      })
    })
  }

  // Deterministic metadata: no wall-clock read, and a producer string that names
  // the engine so a generated artifact is identifiable as ours.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.letterDateIso)
    ? new Date(`${input.letterDateIso}T00:00:00.000Z`)
    : null
  if (date && !Number.isNaN(date.getTime())) {
    pdf.setCreationDate(date)
    pdf.setModificationDate(date)
  }
  pdf.setProducer("HORIZON by VZG — Kündigungsbrief")
  pdf.setCreator("HORIZON by VZG")

  const bytes = await pdf.save()
  return { ok: true, bytes }
}