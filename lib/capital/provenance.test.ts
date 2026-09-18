import { describe, expect, it } from "vitest"

import {
  createProvenance,
  isAiDerivedSource,
  isIsoDate,
  isIsoTimestamp,
  isProvenanceSource,
  PROVENANCE_SOURCES,
} from "./provenance"

describe("capital provenance", () => {
  it("supports the five required sources", () => {
    expect([...PROVENANCE_SOURCES]).toEqual(["USER", "DOCUMENT", "PROVIDER", "SYSTEM", "AI_EXTRACTED"])
    for (const source of PROVENANCE_SOURCES) {
      expect(isProvenanceSource(source)).toBe(true)
    }
  })

  it("rejects unknown or non-string sources", () => {
    expect(isProvenanceSource("LLM_GUESS")).toBe(false)
    expect(isProvenanceSource("ai_extracted")).toBe(false)
    expect(isProvenanceSource(null)).toBe(false)
    expect(isProvenanceSource(undefined)).toBe(false)
    expect(isProvenanceSource(42)).toBe(false)
  })

  it("classifies only AI_EXTRACTED as AI-derived", () => {
    expect(isAiDerivedSource("AI_EXTRACTED")).toBe(true)
    for (const source of ["USER", "DOCUMENT", "PROVIDER", "SYSTEM"] as const) {
      expect(isAiDerivedSource(source)).toBe(false)
    }
  })

  it("normalizes absent optional fields to null", () => {
    expect(createProvenance({ source: "USER" })).toEqual({
      source: "USER",
      sourceReference: null,
      evidenceReference: null,
      extractionRunId: null,
      sourceVersion: null,
      observedAt: null,
      retrievedAt: null,
    })
  })

  it("carries source reference and timestamps when supplied", () => {
    const provenance = createProvenance({
      source: "DOCUMENT",
      sourceReference: "doc-1",
      evidenceReference: "page-3",
      sourceVersion: "v2",
      observedAt: "2025-01-31",
      retrievedAt: "2025-02-01T10:00:00.000Z",
    })
    expect(provenance.sourceReference).toBe("doc-1")
    expect(provenance.evidenceReference).toBe("page-3")
    expect(provenance.sourceVersion).toBe("v2")
    expect(provenance.observedAt).toBe("2025-01-31")
    expect(provenance.retrievedAt).toBe("2025-02-01T10:00:00.000Z")
  })

  it("validates ISO timestamps and dates deterministically", () => {
    expect(isIsoTimestamp("2025-02-01T10:00:00.000Z")).toBe(true)
    expect(isIsoTimestamp("2025-02-01T10:00:00+02:00")).toBe(true)
    expect(isIsoTimestamp("2025-02-01")).toBe(false)
    expect(isIsoTimestamp("01.02.2025")).toBe(false)
    expect(isIsoTimestamp("not-a-date")).toBe(false)
    expect(isIsoTimestamp(1_700_000_000_000)).toBe(false)

    expect(isIsoDate("2025-02-01")).toBe(true)
    expect(isIsoDate("2025-2-1")).toBe(false)
    expect(isIsoDate("2025-02-01T10:00:00Z")).toBe(false)
    expect(isIsoDate("")).toBe(false)
  })
})
