import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PDFDocument } from "pdf-lib"
import { findTemplateById } from "./registry"
import { createTextMeasurer, generateOverlayPdf } from "./writer"
import { planOverlayFill } from "./overlay-fill"
import { EST_1_A_2025_MAPPING, toPdfY } from "./overlay-map"
import { computeSha256 } from "./source"
import {
  SIGNATURE_PLACEMENTS,
  SIGNATURE_PLACEMENT_VERSION,
  signatureBoxes,
  signatureDrawTarget,
  signaturePlacementForTemplate,
} from "./signature-map"
import {
  readJointAssessment,
  detectSignatureImageFormat,
  formatSignatureDate,
  planSignature,
  SIGNATURE_IMAGE_MAX_BYTES,
} from "./signature-plan"
import { applyVisualSignature } from "./signature-writer"
import { renderSignatureBody, renderSignatureSubject } from "./manifest"

const template = findTemplateById("fms-2025-est-1-a")!
const placement = SIGNATURE_PLACEMENTS["fms-2025-est-1-a"]
const templateBytes = () =>
  new Uint8Array(readFileSync(resolve(process.cwd(), template.path)))

/** A 1x1 PNG, which is a real embeddable image rather than a stub. */
const PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

const CONFIRMED_FACTS = [
  { key: "last_name", value: "Müller-Öztürk", confirmedAt: "x" },
  { key: "first_name", value: "Anna", confirmedAt: "x" },
  { key: "city", value: "Berlin", confirmedAt: "x" },
]

/** Generates the real P9 artifact, so P10 is tested against real bytes. */
async function generateUnsigned(): Promise<Uint8Array> {
  const measure = await createTextMeasurer()
  const plan = planOverlayFill({
    mapping: EST_1_A_2025_MAPPING,
    templateSourceSha256: template.sourceSha256,
    taxYear: 2025,
    facts: CONFIRMED_FACTS,
    confirmedFactKeys: CONFIRMED_FACTS.map((fact) => fact.key),
    measure,
  })
  if (!plan.ok) throw new Error("plan failed: " + plan.code)
  const written = await generateOverlayPdf({
    templateBytes: templateBytes(),
    mapping: EST_1_A_2025_MAPPING,
    plan,
    shade: true,
  })
  if (!written.ok) throw new Error("write failed")
  return written.bytes
}

describe("signature placement is bound to the verified template", () => {
  it("resolves only for the exact template revision and tax year", () => {
    const found = signaturePlacementForTemplate({
      templateId: "fms-2025-est-1-a",
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
    })
    expect(found).not.toBeNull()
    expect(found!.placementVersion).toBe(SIGNATURE_PLACEMENT_VERSION)
  })

  it("refuses a different template revision", () => {
    expect(
      signaturePlacementForTemplate({
        templateId: "fms-2025-est-1-a",
        templateSourceSha256: "b".repeat(64),
        taxYear: 2025,
      }),
    ).toBeNull()
  })

  it("refuses a different tax year", () => {
    expect(
      signaturePlacementForTemplate({
        templateId: "fms-2025-est-1-a",
        templateSourceSha256: template.sourceSha256,
        taxYear: 2024,
      }),
    ).toBeNull()
  })

  it("refuses an unverified template outright", () => {
    expect(
      signaturePlacementForTemplate({
        templateId: "fms-2025-est-2-2025",
        templateSourceSha256: template.sourceSha256,
        taxYear: 2025,
      }),
    ).toBeNull()
  })

  it("binds to the hash the registry publishes for this template", () => {
    expect(placement.templateSourceSha256).toBe(template.sourceSha256)
  })

  it("keeps both drawn boxes inside the measured area", () => {
    const { areaBox } = placement.evidence
    const { dateBox, signatureBox } = signatureBoxes(placement)
    for (const box of [dateBox, signatureBox]) {
      expect(box.x0).toBeGreaterThanOrEqual(areaBox.x0)
      expect(box.x1).toBeLessThanOrEqual(areaBox.x1)
      expect(box.top).toBeGreaterThanOrEqual(areaBox.top)
      expect(box.bottom).toBeLessThanOrEqual(areaBox.bottom)
    }
  })

  it("does not let the date and signature columns overlap", () => {
    const { dateBox, signatureBox } = signatureBoxes(placement)
    expect(dateBox.x1).toBeLessThanOrEqual(signatureBox.x0)
  })

  it("derives the PDF-space y from the recorded measurement", () => {
    const target = signatureDrawTarget(placement)
    const { signatureBox } = signatureBoxes(placement)
    expect(target.yBottom).toBeCloseTo(toPdfY(signatureBox.bottom, placement.pageHeight), 6)
    expect(target.maxWidth).toBeCloseTo(signatureBox.x1 - signatureBox.x0, 6)
  })

  it("places the signature above the caption that names it", () => {
    // The caption is printed below the area; if this flips, the signature would
    // be drawn over printed text or in the wrong band entirely.
    const { areaBox, labelBox } = placement.evidence
    expect(areaBox.bottom).toBeLessThanOrEqual(labelBox.top)
  })
})

describe("signature image and date are validated before use", () => {
  it("recognises PNG and JPEG by their magic bytes", () => {
    expect(detectSignatureImageFormat(PNG_1X1)).toBe("png")
    expect(detectSignatureImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg")
  })

  it("rejects a PDF or arbitrary bytes as a signature image", () => {
    expect(detectSignatureImageFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull()
    expect(detectSignatureImageFormat(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull()
  })

  it("formats an unambiguous ISO date in German", () => {
    expect(formatSignatureDate("2026-03-04")).toBe("04. März 2026")
    expect(formatSignatureDate("2026-12-31")).toBe("31. Dezember 2026")
  })

  it("refuses an ambiguous or invalid date rather than guessing", () => {
    expect(formatSignatureDate("03/04/2026")).toBeNull()
    expect(formatSignatureDate("2026-3-4")).toBeNull()
    expect(formatSignatureDate("2026-13-01")).toBeNull()
    expect(formatSignatureDate("2026-02-30")).toBeNull()
    expect(formatSignatureDate("")).toBeNull()
  })
})

describe("an unapproved or stale document cannot be signed", () => {
  const base = {
    manifest: {
      sourceSha256: template.sourceSha256,
      outputSha256: "a".repeat(64),
      caseId: "case-1",
    },
    expectedCaseId: "case-1",
    unsignedSha256: "a".repeat(64),
    templateSourceSha256: template.sourceSha256,
    placement,
    imageBytes: PNG_1X1,
    approvedHash: "a".repeat(64),
    manifestContentHash: "a".repeat(64),
    dateIso: "2026-03-04",
    confirmed: true,
    jointAssessment: false,
    jointAssessmentUnconfirmed: false,
  }

  it("accepts a fully consistent request", () => {
    expect(planSignature(base).ok).toBe(true)
  })

  it("refuses when no approval exists", () => {
    const result = planSignature({ ...base, approvedHash: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("approval_missing")
  })

  it("refuses a stale approval whose content hash moved", () => {
    const result = planSignature({ ...base, manifestContentHash: "b".repeat(64) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("approval_stale")
  })

  it("refuses when the document is not the bytes the manifest recorded", () => {
    const result = planSignature({ ...base, unsignedSha256: "c".repeat(64) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("document_hash_mismatch")
  })

  it("refuses a manifest with no recorded output hash", () => {
    const result = planSignature({
      ...base,
      manifest: { ...base.manifest, outputSha256: null },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("document_hash_mismatch")
  })

  it("refuses when the template bytes do not match the manifest", () => {
    const result = planSignature({ ...base, templateSourceSha256: "d".repeat(64) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("template_hash_mismatch")
  })

  it("refuses cross-case signing", () => {
    const result = planSignature({ ...base, expectedCaseId: "case-2" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("case_mismatch")
  })

  it("refuses without an unverified placement", () => {
    const result = planSignature({ ...base, placement: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("no_verified_placement")
  })

  it("refuses without explicit confirmation", () => {
    const result = planSignature({ ...base, confirmed: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("not_confirmed")
  })

  it("refuses an oversized or empty image", () => {
    const huge = planSignature({
      ...base,
      imageBytes: new Uint8Array(SIGNATURE_IMAGE_MAX_BYTES + 1),
    })
    expect(huge.ok).toBe(false)
    if (!huge.ok) expect(huge.code).toBe("image_too_large")

    const empty = planSignature({ ...base, imageBytes: new Uint8Array() })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe("image_empty")
  })

  it("never reports a signature type stronger than VISUAL", () => {
    const result = planSignature(base)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.plan.kind).toBe("VISUAL")
  })
})

describe("writing a signature onto the real generated document", () => {
  it("leaves the approved input untouched and produces a different artifact", async () => {
    const unsigned = await generateUnsigned()
    const unsignedSha = await computeSha256(unsigned)
    // A copy is kept to prove the writer did not mutate the input in place.
    const before = new Uint8Array(unsigned)

    const planned = planSignature({
      manifest: {
        sourceSha256: template.sourceSha256,
        outputSha256: unsignedSha,
        caseId: "case-1",
      },
      expectedCaseId: "case-1",
      unsignedSha256: unsignedSha,
      templateSourceSha256: template.sourceSha256,
      placement,
      imageBytes: PNG_1X1,
      approvedHash: "f".repeat(64),
      manifestContentHash: "f".repeat(64),
      dateIso: "2026-03-04",
      confirmed: true,
      jointAssessment: false,
      jointAssessmentUnconfirmed: false,
    })
    expect(planned.ok).toBe(true)
    if (!planned.ok) return

    const written = await applyVisualSignature({ unsignedBytes: unsigned, plan: planned.plan, imageBytes: PNG_1X1 })
    expect(written.ok).toBe(true)
    if (!written.ok) return

    expect(await computeSha256(unsigned)).toBe(unsignedSha)
    expect(unsigned).toEqual(before)
    expect(written.signedSha256).not.toBe(unsignedSha)
    expect(written.page).toBe(placement.page)
  }, 60_000)

  it("keeps the signed artifact readable and on the same page count", async () => {
    const unsigned = await generateUnsigned()
    const unsignedSha = await computeSha256(unsigned)
    const planned = planSignature({
      manifest: { sourceSha256: template.sourceSha256, outputSha256: unsignedSha, caseId: "c" },
      expectedCaseId: "c",
      unsignedSha256: unsignedSha,
      templateSourceSha256: template.sourceSha256,
      placement,
      imageBytes: PNG_1X1,
      approvedHash: "f".repeat(64),
      manifestContentHash: "f".repeat(64),
      dateIso: "2026-03-04",
      confirmed: true,
      jointAssessment: false,
      jointAssessmentUnconfirmed: false,
    })
    if (!planned.ok) throw new Error("plan failed")
    const written = await applyVisualSignature({ unsignedBytes: unsigned, plan: planned.plan, imageBytes: PNG_1X1 })
    if (!written.ok) throw new Error("write failed: " + written.code)

    const reloaded = await PDFDocument.load(written.bytes)
    const original = await PDFDocument.load(unsigned)
    expect(reloaded.getPageCount()).toBe(original.getPageCount())
  }, 60_000)

  it("refuses to draw onto a page the document does not have", async () => {
    const unsigned = await generateUnsigned()
    const unsignedSha = await computeSha256(unsigned)
    const planned = planSignature({
      manifest: { sourceSha256: template.sourceSha256, outputSha256: unsignedSha, caseId: "c" },
      expectedCaseId: "c",
      unsignedSha256: unsignedSha,
      templateSourceSha256: template.sourceSha256,
      placement: { ...placement, page: 99 },
      imageBytes: PNG_1X1,
      approvedHash: "f".repeat(64),
      manifestContentHash: "f".repeat(64),
      dateIso: "2026-03-04",
      confirmed: true,
      jointAssessment: false,
      jointAssessmentUnconfirmed: false,
    })
    if (!planned.ok) throw new Error("plan failed")
    const written = await applyVisualSignature({ unsignedBytes: unsigned, plan: planned.plan, imageBytes: PNG_1X1 })
    expect(written.ok).toBe(false)
    if (!written.ok) expect(written.code).toBe("page_missing")
  }, 60_000)
})

describe("the signature record states plainly what kind of signature it is", () => {
  const record = {
    signatureType: "VISUAL" as const,
    caseId: "case-1",
    sourceDocumentId: "draft-1",
    unsignedSha256: "a".repeat(64),
    signedSha256: "b".repeat(64),
    approvalContentHash: "c".repeat(64),
    signerId: "user-1",
    signedAt: "2026-03-04T10:00:00.000Z",
    page: 2,
    placementVersion: SIGNATURE_PLACEMENT_VERSION,
    templateId: "fms-2025-est-1-a",
    templateSourceSha256: template.sourceSha256,
  }

  it("records every required field", () => {
    const body = renderSignatureBody(record, "unveröffentlichte Fassung")
    for (const value of [
      record.caseId,
      record.sourceDocumentId,
      record.unsignedSha256,
      record.signedSha256,
      record.approvalContentHash,
      record.signerId,
      record.signedAt,
      record.placementVersion,
      record.templateSourceSha256,
    ]) {
      expect(body).toContain(value)
    }
  })

  it("says explicitly that it is not a qualified or cryptographic signature", () => {
    const body = renderSignatureBody(record, "x")
    expect(body).toContain("Keine qualifizierte oder fortgeschrittene elektronische Signatur")
    expect(body).toContain("keine kryptografische Signatur")
  })

  it("carries the unsigned text of the document it signed", () => {
    const body = renderSignatureBody(record, "Ausgabe-SHA-256: " + "a".repeat(64))
    expect(body).toContain("Unveröffentlichte Fassung")
    expect(body).toContain("a".repeat(64))
  })

  it("labels the subject as VISUAL", () => {
    expect(renderSignatureSubject("Hauptvordruck ESt 1 A")).toContain("VISUAL")
  })
})
describe("multi-signatory refusal", () => {
  const base = {
    manifest: {
      sourceSha256: template.sourceSha256,
      outputSha256: "a".repeat(64),
      caseId: "case-1",
    },
    expectedCaseId: "case-1",
    unsignedSha256: "a".repeat(64),
    templateSourceSha256: template.sourceSha256,
    placement,
    imageBytes: PNG_1X1,
    approvedHash: "a".repeat(64),
    manifestContentHash: "a".repeat(64),
    dateIso: "2026-03-04",
    confirmed: true,
    jointAssessment: false,
    jointAssessmentUnconfirmed: false,
  }

  it("the reference form is recorded as possibly requiring two signatures", () => {
    expect(placement.signatoryRule.max).toBe(2)
    expect(placement.signatoryRule.basis).toContain("Ehegatten")
  })

  it("refuses when the form can require two signatures and a joint assessment is confirmed", () => {
    const planned = planSignature({ ...base, jointAssessment: true })
    expect(planned.ok).toBe(false)
    if (planned.ok) throw new Error("expected refusal")
    expect(planned.code).toBe("multiple_signatures_required")
  })

  it("refuses when a joint-assessment fact exists but is unconfirmed", () => {
    // Neither answer is safe: assuming single may under-sign, assuming joint
    // blocks a valid single signature. The user must resolve it.
    const planned = planSignature({ ...base, jointAssessmentUnconfirmed: true })
    expect(planned.ok).toBe(false)
    if (planned.ok) throw new Error("expected refusal")
    expect(planned.code).toBe("joint_assessment_unconfirmed")
  })

  it("still allows a single signature when no joint assessment is evidenced", () => {
    const planned = planSignature(base)
    expect(planned.ok).toBe(true)
  })
})

describe("readJointAssessment", () => {
  const fact = (key: string, value: string, confirmed: boolean) => ({
    key,
    value,
    confirmedAt: confirmed ? "2026-03-01T00:00:00.000Z" : null,
  })

  it("treats no recognised fact as not joint and not unconfirmed", () => {
    expect(readJointAssessment([fact("city", "Berlin", true)])).toEqual({
      joint: false,
      unconfirmed: false,
    })
  })

  it("reads a confirmed affirmative fact as joint", () => {
    expect(readJointAssessment([fact("joint_assessment", "true", true)])).toEqual({
      joint: true,
      unconfirmed: false,
    })
  })

  it("reads a confirmed negative fact as deliberately not joint", () => {
    expect(readJointAssessment([fact("joint_assessment", "false", true)])).toEqual({
      joint: false,
      unconfirmed: false,
    })
  })

  it("reports an unconfirmed recognised fact as unconfirmed rather than guessing", () => {
    expect(readJointAssessment([fact("joint_assessment", "true", false)])).toEqual({
      joint: false,
      unconfirmed: true,
    })
  })

  it("does not infer joint status from free-text marital wording", () => {
    // "verheiratet" is not a recognised key; the engine must not infer from it.
    expect(readJointAssessment([fact("marital_status", "verheiratet", true)])).toEqual({
      joint: false,
      unconfirmed: false,
    })
  })
})
