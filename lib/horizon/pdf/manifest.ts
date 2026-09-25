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

/** The engine's own marker for the generated artifact's hash, as rendered into a body. */
export const FORM_OUTPUT_SHA_PREFIX = "Ausgabe-SHA-256: "

/**
 * Reads the generated artifact's hash back out of a stored draft body.
 *
 * Used by the owner-scoped download route to locate the draft that approved a
 * given artifact, by the *value* it records rather than by its position, so a
 * different draft cannot be substituted for it. Returns null for a body that
 * carries no hash — a letter draft, or a plain correspondence draft — so the
 * three kinds stay distinguishable instead of confusable.
 */
export function readFormOutputSha(body: string): string | null {
  const line = body.split("\n").find((candidate) => candidate.startsWith(FORM_OUTPUT_SHA_PREFIX))
  if (!line) return null
  const value = line.slice(FORM_OUTPUT_SHA_PREFIX.length).trim()
  return /^[0-9a-f]{64}$/.test(value) ? value : null
}

/**
 * P10 — provenance for a visually signed artifact.
 *
 * The signed document is a new artifact, so it needs its own record rather than
 * an extra column on the unsigned one. The unsigned hash is carried in
 * deliberately: it is what ties this artifact to the exact bytes that were
 * approved, and it is the value a later step re-checks.
 *
 * No cryptographic claim is made anywhere here. `signatureType` is `VISUAL`,
 * which is the only value this engine can produce.
 */
export type PdfSignatureRecord = {
  signatureType: "VISUAL"
  caseId: string
  /** The draft id of the generated (unsigned) document this signature applies to. */
  sourceDocumentId: string
  unsignedSha256: string
  signedSha256: string
  /** The content hash the approval was bound to when signing was allowed. */
  approvalContentHash: string
  signerId: string
  signedAt: string
  page: number
  placementVersion: string
  templateId: string
  templateSourceSha256: string
}

/**
 * Rendering of the signed artifact's record, used as the body of its own draft.
 *
 * The order is fixed and it is *not* re-sorted: this body is what the user
 * reviews before release, so the hash chain reads top to bottom in the order it
 * is verified. The unsigned document's own approved body text is appended
 * verbatim — passed in as the exact text that was approved, not re-rendered from
 * a parsed manifest, so there is nothing to re-parse and no risk of the
 * reproduction drifting from what the approval actually covers.
 */
export function renderSignatureBody(
  record: PdfSignatureRecord,
  unsignedBody: string,
): string {
  return [
    "Signatur (VISUAL)",
    "Keine qualifizierte oder fortgeschrittene elektronische Signatur und keine kryptografische Signatur.",
    `Vorgang: ${record.caseId}`,
    `Dokument (unveröffentlichte Fassung): ${record.sourceDocumentId}`,
    `Unsignierte PDF-SHA-256: ${record.unsignedSha256}`,
    `Signierte PDF-SHA-256: ${record.signedSha256}`,
    `Freigabe-Inhaltshash: ${record.approvalContentHash}`,
    `Unterzeichner: ${record.signerId}`,
    `Zeitpunkt: ${record.signedAt}`,
    `Seite: ${record.page}`,
    `Platzierungsversion: ${record.placementVersion}`,
    `Vorlage: ${record.templateId}`,
    `Vorlagen-SHA-256: ${record.templateSourceSha256}`,
    "",
    "--- Unveröffentlichte Fassung ---",
    unsignedBody,
  ].join("\n")
}

export const SIGNED_SHA_PREFIX = "Signierte PDF-SHA-256: "

/**
 * P10 — the artifact a signed draft stands for.
 *
 * A signed draft is derived from an approved unsigned one: its body embeds the
 * unsigned body, which still carries the unsigned `Ausgabe-SHA-256` line. So the
 * unsigned hash alone cannot distinguish the two, and a reader that stops at it
 * will keep serving the unsigned bytes after a signature exists. The signed line
 * is the discriminator, and it is read by value rather than by position.
 */
export function readSignedOutputSha(body: string): string | null {
  const line = body.split("\n").find((candidate) => candidate.startsWith(SIGNED_SHA_PREFIX))
  if (!line) return null
  const value = line.slice(SIGNED_SHA_PREFIX.length).trim()
  return /^[0-9a-f]{64}$/.test(value) ? value : null
}

export function renderSignatureSubject(formName: string): string {
  return `Signiertes amtliches Formular ${formName} (VISUAL)`
}
