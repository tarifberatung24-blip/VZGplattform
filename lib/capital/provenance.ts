/**
 * Explicit provenance for Capital domain records.
 *
 * Provenance is required so every fact can be traced to a source, an optional
 * evidence reference, and the time it was observed/retrieved. This mirrors the
 * existing `Provenance` pattern in `lib/canonical-tax-model.ts` and the
 * `source` tagging in `lib/optimize/flow.ts`, generalised for Capital.
 */

export const PROVENANCE_SOURCES = ["USER", "DOCUMENT", "PROVIDER", "SYSTEM", "AI_EXTRACTED"] as const

export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number]

/** Sources whose values are derived by a model and therefore never authoritative on their own. */
export const AI_DERIVED_SOURCES: readonly ProvenanceSource[] = ["AI_EXTRACTED"]

export function isProvenanceSource(value: unknown): value is ProvenanceSource {
  return typeof value === "string" && (PROVENANCE_SOURCES as readonly string[]).includes(value)
}

/** Machine-derived facts require explicit human confirmation before use. */
export function isAiDerivedSource(source: ProvenanceSource): boolean {
  return AI_DERIVED_SOURCES.includes(source)
}

export type Provenance = {
  source: ProvenanceSource
  /** Pointer to the origin: form section, document id, provider id, run id. */
  sourceReference: string | null
  /** Pointer to the evidence backing the value, when evidence exists. */
  evidenceReference: string | null
  /** Identifier of the extraction run that produced the value, when applicable. */
  extractionRunId: string | null
  /** Version of the source artifact, when applicable. */
  sourceVersion: string | null
  /** When the fact was true in the world. */
  observedAt: string | null
  /** When the value was read from the source. */
  retrievedAt: string | null
}

export type ProvenanceInput = {
  source: ProvenanceSource
  sourceReference?: string | null
  evidenceReference?: string | null
  extractionRunId?: string | null
  sourceVersion?: string | null
  observedAt?: string | null
  retrievedAt?: string | null
}

export function createProvenance(input: ProvenanceInput): Provenance {
  return {
    source: input.source,
    sourceReference: input.sourceReference ?? null,
    evidenceReference: input.evidenceReference ?? null,
    extractionRunId: input.extractionRunId ?? null,
    sourceVersion: input.sourceVersion ?? null,
    observedAt: input.observedAt ?? null,
    retrievedAt: input.retrievedAt ?? null,
  }
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Deterministic ISO-8601 timestamp check; no locale or clock dependence. */
export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

/** A provenance record must at least name a valid source. */
export function hasUsableProvenance(provenance: Provenance): boolean {
  return isProvenanceSource(provenance.source)
}
