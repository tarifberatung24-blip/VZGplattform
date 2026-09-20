/**
 * P10 — applying a planned visual signature to the document bytes.
 *
 * The unsigned document is treated as read-only input: it is loaded, drawn on,
 * and saved as a new byte array. Nothing writes back over the input, so the
 * approved artifact keeps its hash and stays exactly what was approved.
 *
 * pdf-lib's `widthOfTextAtSize` throws on text outside WinAnsi, so the date is
 * checked before it is measured — same rule as the P9 overlay path, same shared
 * guard.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { isWinAnsiRepresentable } from "./encoding"
import {
  signatureDatePosition,
  signatureImageBox,
  type SignaturePlan,
} from "./signature-plan"
import { computeSha256 } from "./source"

export type SignatureWriteSuccess = {
  ok: true
  bytes: Uint8Array
  signedSha256: string
  page: number
}

export type SignatureWriteFailure = {
  ok: false
  code: "document_unreadable" | "page_missing" | "image_unreadable" | "date_unsupported" | "write_failed"
  detail: string | null
}

export type SignatureWriteResult = SignatureWriteSuccess | SignatureWriteFailure

export async function applyVisualSignature(input: {
  unsignedBytes: Uint8Array
  plan: SignaturePlan
  imageBytes: Uint8Array
}): Promise<SignatureWriteResult> {
  const { plan } = input

  if (!isWinAnsiRepresentable(plan.dateText)) {
    return { ok: false, code: "date_unsupported", detail: null }
  }

  let document: PDFDocument
  try {
    document = await PDFDocument.load(input.unsignedBytes)
  } catch {
    // The bytes were already hash-checked, so a parse failure here means the
    // artifact is not a readable PDF rather than that the wrong file was picked.
    return { ok: false, code: "document_unreadable", detail: null }
  }

  const pageIndex = plan.placement.page - 1
  const pages = document.getPages()
  if (pageIndex < 0 || pageIndex >= pages.length) {
    return { ok: false, code: "page_missing", detail: null }
  }
  const page = pages[pageIndex]

  let image
  try {
    image =
      plan.imageFormat === "png"
        ? await document.embedPng(input.imageBytes)
        : await document.embedJpg(input.imageBytes)
  } catch {
    return { ok: false, code: "image_unreadable", detail: null }
  }

  const box = signatureImageBox(plan)
  // Fit inside the box, preserved aspect ratio, anchored to the bottom of the
  // area so the image sits on the notional signature line.
  const scale = Math.min(box.width / image.width, box.height / image.height, 1)
  const drawnWidth = image.width * scale
  const drawnHeight = image.height * scale

  page.drawImage(image, {
    x: box.x,
    y: box.y,
    width: drawnWidth,
    height: drawnHeight,
    opacity: 1,
  })

  const font = await document.embedFont(StandardFonts.Helvetica)
  const position = signatureDatePosition(plan)
  page.drawText(plan.dateText, {
    x: position.x,
    y: position.y,
    size: plan.placement.dateFontSize,
    font,
    color: rgb(0, 0, 0),
  })

  let bytes: Uint8Array
  try {
    bytes = await document.save()
  } catch {
    return { ok: false, code: "write_failed", detail: null }
  }

  return {
    ok: true,
    bytes,
    signedSha256: await computeSha256(bytes),
    page: plan.placement.page,
  }
}