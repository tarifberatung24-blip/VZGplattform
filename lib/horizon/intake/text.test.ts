import { describe, expect, it } from "vitest"
import {
  TEXT_INTAKE_KINDS,
  TEXT_INTAKE_MAX_LENGTH,
  isTextIntakeKind,
  normalizeTextIntake,
  textIntakeAuditMetadata,
} from "./text"

const SHA = "a".repeat(64)

describe("text intake kinds", () => {
  it("accepts exactly the two text input types the master map requires", () => {
    expect([...TEXT_INTAKE_KINDS]).toEqual(["pasted_text", "email_content"])
  })

  it("rejects unknown kinds so a caller cannot smuggle a new type in", () => {
    for (const value of [null, undefined, "", "text", "document", "pdf", 1, {}]) {
      expect(isTextIntakeKind(value)).toBe(false)
    }
    for (const kind of TEXT_INTAKE_KINDS) {
      expect(isTextIntakeKind(kind)).toBe(true)
    }
  })
})

describe("normalizeTextIntake", () => {
  it("normalizes line endings without rewriting content", () => {
    const result = normalizeTextIntake("Zeile1\r\nZeile2\rZeile3", "pasted_text")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.text).toBe("Zeile1\nZeile2\nZeile3")
  })

  it("trims trailing newlines but keeps interior blank lines", () => {
    const result = normalizeTextIntake("A\n\n\nB\n\n", "email_content")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.text).toBe("A\n\n\nB")
  })

  it("rejects empty and whitespace-only input", () => {
    for (const raw of ["", "   ", "\n\n", "\t \n"]) {
      const result = normalizeTextIntake(raw, "pasted_text")
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe("empty")
    }
  })

  it("rejects an unknown kind before looking at the text", () => {
    const result = normalizeTextIntake("some text", "telegram_message")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("unknown_kind")
  })

  it("enforces the same upper bound as the case_messages content CHECK", () => {
    // The DB constraint is `length(content) between 1 and 30000`.
    expect(TEXT_INTAKE_MAX_LENGTH).toBe(30000)

    const atLimit = normalizeTextIntake("x".repeat(TEXT_INTAKE_MAX_LENGTH), "pasted_text")
    expect(atLimit.ok).toBe(true)

    const overLimit = normalizeTextIntake("x".repeat(TEXT_INTAKE_MAX_LENGTH + 1), "pasted_text")
    expect(overLimit.ok).toBe(false)
    if (overLimit.ok) return
    expect(overLimit.reason).toBe("too_long")
  })

  it("measures length on the normalized text that is actually stored", () => {
    const raw = "abc\r\n\r\n"
    const result = normalizeTextIntake(raw, "pasted_text")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.characterCount).toBe(result.value.text.length)
    expect(result.value.characterCount).toBe(3)
  })

  it("extracts nothing: returned fields are only text, kind and length", () => {
    const result = normalizeTextIntake(
      "Frist: 31.02.2026, Betrag 1.234,56 EUR, Absender Jobcenter Berlin",
      "email_content",
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.value).sort()).toEqual(["characterCount", "kind", "text"])
    // The date-like and amount-like strings stay inside the text; no field
    // surfaces them as a parsed fact.
    expect(result.value.text).toContain("31.02.2026")
    expect(result.value.text).toContain("1.234,56")
  })
})

describe("text intake audit metadata", () => {
  it("records provenance without duplicating the content", () => {
    const metadata = textIntakeAuditMetadata({
      kind: "email_content",
      characterCount: 42,
      sha256: SHA,
    })
    expect(metadata).toEqual({
      input_type: "email_content",
      character_count: 42,
      sha256: SHA,
    })
    expect(JSON.stringify(metadata)).not.toContain("Frist")
  })
})