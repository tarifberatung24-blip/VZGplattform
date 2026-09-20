/**
 * P9 — template loading and PDF writer boundary.
 *
 * The engine needs two capabilities from outside itself: reading a template's
 * interactive fields, and writing values into a copy of it. Both are behind this
 * boundary so the engine stays pure and testable, and so the absence of a writer
 * is an explicit, reportable state rather than a crash at generation time.
 *
 * **No writer is currently installed.** The repository ships a PDF *reader*
 * (`pdfjs-dist`) but no PDF *writer* — filling an AcroForm requires one, and
 * adding a dependency is not something this codebase does without the owner's
 * decision. The consequence is deliberate and reported, not hidden: the engine
 * can verify a template, detect its real format, map confirmed facts and produce
 * a reviewable provenance manifest, but it cannot emit a filled PDF yet. Every
 * path that would need a writer returns `writer_unavailable` and routes the user
 * to the official form.
 *
 * This is the one honest blocker in P9. When the owner approves a writer, only
 * this file changes: `planPdfFill` already produces the assignments a writer
 * needs, and `generateFilledPdf` below is the single call site to implement.
 */

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { PdfFieldAssignment } from "./fill"

export const PDF_WRITER_STATUS = "unavailable" as const

export type PdfWriterAvailability =
  | { available: true }
  | { available: false; code: "writer_unavailable"; detail: string }

/**
 * Reports whether filled output can be produced.
 *
 * Returns unavailable rather than throwing so a caller can present the manual
 * path. This must not be replaced with a stub that writes an unfilled copy: that
 * would present an unchanged official form as generated output.
 */
export function writerAvailability(): PdfWriterAvailability {
  return {
    available: false,
    code: "writer_unavailable",
    detail:
      "Es ist kein PDF-Schreibmodul installiert. Das amtliche Formular kann derzeit nicht automatisch ausgefüllt werden; bitte das amtliche Formular manuell ausfüllen.",
  }
}

export type TemplateBytes = { ok: true; bytes: Uint8Array } | { ok: false; detail: string }

/** Reads a registered template from the repository. */
export async function readTemplateBytes(path: string): Promise<TemplateBytes> {
  try {
    const loaded = await readFile(resolve(process.cwd(), path))
    return { ok: true, bytes: new Uint8Array(loaded) }
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "read_failed" }
  }
}

export type FieldReader = () => Promise<readonly string[] | null>

/**
 * Reads interactive field names from PDF bytes using the installed reader.
 *
 * The reader is imported lazily so this module stays importable in contexts
 * (tests, edge runtime) that should not pull in the PDF reader. A reader failure
 * returns `null`, which the capability detector treats as "no exposed fields" —
 * the conservative interpretation that leads to a refusal rather than a
 * guess.
 */
export async function readAcroFormFieldNames(bytes: Uint8Array): Promise<readonly string[] | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const document = await pdfjs.getDocument({
      data: bytes,
      useSystemFonts: false,
    }).promise
    try {
      const fields = await document.getFieldObjects()
      if (!fields) return null
      const names = Array.from(fields.keys())
      return names
    } finally {
      await document.cleanup()
    }
  } catch {
    return null
  }
}

export type GeneratedPdf =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; code: "writer_unavailable" | "write_failed"; detail: string }

/**
 * Produces the filled PDF. Single call site for a future writer.
 *
 * The signature takes the template bytes and the planned assignments, so a
 * writer implementation only has to apply them; it must not decide which values
 * belong in the document, because that decision is the engine's and is already
 * covered by tests.
 */
export async function generateFilledPdf(input: {
  templateBytes: Uint8Array
  assignments: readonly PdfFieldAssignment[]
  flatten: boolean
}): Promise<GeneratedPdf> {
  const availability = writerAvailability()
  if (!availability.available) {
    return { ok: false, code: "writer_unavailable", detail: availability.detail }
  }
  void input
  return { ok: false, code: "write_failed", detail: "writer_not_implemented" }
}