/**
 * P9 — generation provenance and the link to the P8 approval chain.
 *
 * A generated form is only trustworthy if you can say exactly which official
 * template it came from, which mapping produced it, and which confirmed facts
 * were used. The manifest records all three.
 *
 * **Why this reuses P8 rather than adding an approval system.** Approval in
 * `correspondence_drafts` is bound to the SHA-256 of the draft's content
 * (`saveDraft` computes it from subject, body and recipient, and `approvals` has
 * a foreign key to `(id, owner_id, content_hash)`). If the draft body *is* the
 * manifest, then an approval of that draft is an approval of these exact
 * template/mapping/fact inputs, and `assessDraftRelease` already decides whether
 * it may be released. Changing any input changes the body, changes the hash, and
 * the existing approval stops matching — with no second approval table, no
 * second hash definition, and no second release rule.
 *
 * The manifest is therefore rendered deterministically: the same inputs must
 * always produce byte-identical text, or an approval would be invalidated by
 * nothing more than a reordering. Keys are sorted for that reason.
 */

import type { PdfBlankField, PdfFieldAssignment } from "./fill"
import type { OfficialPdfTemplate } from "./registry"

export type PdfGenerationManifest = {
  templateId: string
  authority: string
  formName: string
  formId: string | null
  formVersion: string
  taxYear: number | null
  officialSource: string
  retrievalDate: string
  sourceSha256: string
  mappingVersion: string
  /** SHA-256 of the generated document bytes. Null until generation runs. */
  outputSha256: string | null
  caseId: string
  generatedAt: string
  filledCount: number
  blankCount: number
  assignments: readonly PdfFieldAssignment[]
  blanks: readonly PdfBlankField[]
}

export function buildManifest(input: {
  template: OfficialPdfTemplate
  mappingVersion: string
  caseId: string
  generatedAt: string
  assignments: readonly PdfFieldAssignment[]
  blanks: readonly PdfBlankField[]
  /** SHA-256 of the generated artifact, once the writer has produced it. */
  outputSha256?: string | null
}): PdfGenerationManifest {
  const { template } = input
  return {
    templateId: template.id,
    authority: template.authority,
    formName: template.formName,
    formId: template.formId,
    formVersion: template.version,
    taxYear: template.taxYear,
    officialSource: template.officialSource,
    retrievalDate: template.retrievalDate,
    sourceSha256: template.sourceSha256,
    mappingVersion: input.mappingVersion,
    outputSha256: input.outputSha256 ?? null,
    caseId: input.caseId,
    generatedAt: input.generatedAt,
    filledCount: input.assignments.length,
    blankCount: input.blanks.length,
    assignments: input.assignments,
    blanks: input.blanks,
  }
}

/**
 * Deterministic human-readable rendering of the manifest, used as the draft body.
 *
 * Field order is sorted so the text depends only on the values, not on the order
 * the mappings happened to be declared. Timestamps are included because they are
 * part of what the user is approving, but they are the caller's responsibility:
 * passing a fresh `generatedAt` each time is what makes each generation a
 * distinct approvable artifact.
 */
export function renderManifestBody(manifest: PdfGenerationManifest): string {
  const assignments = [...manifest.assignments].sort((a, b) =>
    a.fieldName.localeCompare(b.fieldName),
  )
  const blanks = [...manifest.blanks].sort((a, b) => a.fieldName.localeCompare(b.fieldName))

  const filled = assignments.map((entry) => `${entry.fieldName} = ${String(entry.value)}`)
  const empty = blanks.map((entry) => `${entry.fieldName} = (leer: ${entry.reason})`)

  return [
    `Amtliches Formular: ${manifest.formName}`,
    manifest.formId ? `Form-ID: ${manifest.formId}` : "Form-ID: (nicht angegeben)",
    `Behörde: ${manifest.authority}`,
    manifest.taxYear !== null ? `Steuerjahr: ${manifest.taxYear}` : "Steuerjahr: nicht zutreffend",
    `Amtliche Quelle: ${manifest.officialSource}`,
    `Abrufdatum: ${manifest.retrievalDate}`,
    `Vorlagen-Version: ${manifest.formVersion}`,
    `Vorlagen-SHA-256: ${manifest.sourceSha256}`,
    `Mapping-Version: ${manifest.mappingVersion}`,
    manifest.outputSha256
      ? `Ausgabe-SHA-256: ${manifest.outputSha256}`
      : "Ausgabe-SHA-256: (keine Ausgabe erzeugt)",
    `Vorgang: ${manifest.caseId}`,
    `Erstellt am: ${manifest.generatedAt}`,
    "",
    `Ausgefüllte Felder (${manifest.filledCount}):`,
    ...(filled.length > 0 ? filled : ["(keine)"]),
    "",
    `Leer gebliebene Felder (${manifest.blankCount}):`,
    ...(empty.length > 0 ? empty : ["(keine)"]),
    "",
    "Hinweis: Es wurden ausschließlich bestätigte Angaben eingesetzt. Nicht bestätigte oder fehlende Angaben bleiben leer und werden nicht abgeleitet.",
  ].join("\n")
}

/** The draft subject a generated form is approved under. */
export function renderManifestSubject(manifest: PdfGenerationManifest): string {
  return `Amtliches Formular ${manifest.formName}${manifest.formId ? ` (${manifest.formId})` : ""}`
}