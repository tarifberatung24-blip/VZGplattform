/**
 * Turning a Vorlage letter into a PDF.
 *
 * The PDF writer already exists and is shared with the Kündigung module
 * (`lib/horizon/pdf/letter-writer.ts`); this module only adapts a template's
 * output to its input, so there is one implementation of "how a letter becomes a
 * PDF" rather than one per letter.
 *
 * It runs in the browser as well as on the server. pdf-lib is pure JavaScript and
 * the writer imports nothing server-only, so the reader can see the finished
 * document before deciding to keep it — no upload, no round trip, and their data
 * never leaves the page until they choose to print or save it.
 */

import { generateLetterPdf, type LetterPdfResult } from "@/lib/horizon/pdf/letter-writer"
import type { VorlageFacts, VorlageTemplate } from "./types"

/** Renders a template's letter to PDF bytes. */
export async function renderVorlagePdf(input: {
  template: VorlageTemplate
  facts: VorlageFacts
  /** ISO date pinned by the caller, so the same input yields the same bytes. */
  letterDateIso: string
}): Promise<LetterPdfResult> {
  const letter = input.template.build(input.facts)
  return generateLetterPdf({ body: letter.body, letterDateIso: input.letterDateIso })
}
