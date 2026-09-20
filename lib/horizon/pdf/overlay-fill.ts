/**
 * P9 — static overlay fill planning.
 *
 * Turns confirmed facts into positioned text placements. Like `fill.ts` this is
 * pure: it decides what would be drawn and where, and refuses rather than
 * approximating. The rules it enforces are the ones that keep an overlay honest.
 *
 * 1. **Hash and year binding.** The mapping's `sourceSha256` and `taxYear` must
 *    match the template being generated. This is the control that stops a
 *    measured coordinate set from being reused on a different revision or a
 *    different tax year.
 * 2. **Only confirmed facts.** An absent, unconfirmed or empty fact leaves the box
 *    blank, and the reason is reported. Nothing is derived, formatted into a
 *    different value, or defaulted.
 * 3. **No overflow.** Text wider than the printed box is refused, not clipped and
 *    not shrunk to fit. A value that does not fit belongs in a corrected fact or a
 *    different form, and silently truncating an official document is worse than
 *    refusing.
 * 4. **Formatting is declared, not inferred.** `date_de` converts only an exact
 *    `YYYY-MM-DD` string; anything else is refused rather than parsed leniently.
 *    `decimal_comma_to_point` performs one deterministic substitution.
 */

import type { PdfFact } from "./fill"
import { isWinAnsiRepresentable } from "./encoding"
import type {
  OverlayFieldKind,
  OverlayFieldPlacement,
  OverlayFormat,
  StaticTemplateMapping,
} from "./overlay-map"

export const OVERLAY_REFUSAL_CODES = [
  "no_mapping",
  "source_hash_mismatch",
  "tax_year_mismatch",
  "value_too_wide",
  "unsupported_format_value",
  "unsupported_characters",
  "nothing_to_fill",
] as const
export type OverlayRefusalCode = (typeof OVERLAY_REFUSAL_CODES)[number]

export type OverlayPlacement = {
  fieldName: string
  factKey: string
  page: number
  kind: OverlayFieldKind
  x: number
  y: number
  size: number
  /** The value exactly as it will be drawn. */
  value: string
}

export type OverlayBlank = {
  fieldName: string
  factKey: string
  reason: "fact_absent" | "fact_unconfirmed" | "value_empty"
}

export type OverlayPlan =
  | {
      ok: true
      placements: OverlayPlacement[]
      blanks: OverlayBlank[]
      filledCount: number
      blankCount: number
    }
  | { ok: false; code: OverlayRefusalCode; detail?: string }

/**
 * Applies a declared format. Returns null when the value does not match the
 * format's expectations, which the caller turns into a refusal rather than a
 * best-effort parse.
 */
export function applyFormat(value: string, format: OverlayFormat | undefined): string | null {
  switch (format) {
    case undefined:
      return value
    case "date_de": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
      if (!match) return null
      return `${match[3]}.${match[2]}.${match[1]}`
    }
    case "decimal_comma_to_point":
      return value.trim().replace(",", ".")
  }
}

/** Measured width of `text` at `size` for the engine's standard Helvetica face. */
export type TextWidth = (text: string, size: number) => number

export function planOverlayFill(input: {
  mapping: StaticTemplateMapping
  /** SHA-256 of the template actually loaded. */
  templateSourceSha256: string
  /** Tax year the case is being generated for. */
  taxYear: number | null
  facts: readonly PdfFact[]
  confirmedFactKeys: readonly string[]
  measure: TextWidth
}): OverlayPlan {
  const { mapping, facts } = input

  if (mapping.sourceSha256 !== input.templateSourceSha256) {
    return {
      ok: false,
      code: "source_hash_mismatch",
      detail: input.templateSourceSha256,
    }
  }
  if (input.taxYear !== mapping.taxYear) {
    return {
      ok: false,
      code: "tax_year_mismatch",
      detail: String(input.taxYear ?? ""),
    }
  }

  const confirmed = new Set(input.confirmedFactKeys)
  const factByKey = new Map(facts.map((fact) => [fact.key, fact]))
  const placements: OverlayPlacement[] = []
  const blanks: OverlayBlank[] = []

  for (const field of mapping.fields) {
    const fact = factByKey.get(field.factKey)
    if (!fact) {
      blanks.push({ fieldName: field.fieldName, factKey: field.factKey, reason: "fact_absent" })
      continue
    }
    if (!fact.confirmedAt || !confirmed.has(field.factKey)) {
      blanks.push({
        fieldName: field.fieldName,
        factKey: field.factKey,
        reason: "fact_unconfirmed",
      })
      continue
    }
    if (fact.value === null || fact.value.trim() === "") {
      blanks.push({ fieldName: field.fieldName, factKey: field.factKey, reason: "value_empty" })
      continue
    }

    const formatted = applyFormat(fact.value, field.format)
    if (formatted === null) {
      return {
        ok: false,
        code: "unsupported_format_value",
        detail: `${field.fieldName}:${field.factKey}`,
      }
    }

    // Checked before measuring: pdf-lib throws on text outside WinAnsi, so an
    // unrepresentable value must be refused here rather than at write time.
    if (!isWinAnsiRepresentable(formatted)) {
      return {
        ok: false,
        code: "unsupported_characters",
        detail: `${field.fieldName}:${field.factKey}`,
      }
    }

    const width = input.measure(formatted, field.fontSize)
    if (width > field.maxWidth) {
      return {
        ok: false,
        code: "value_too_wide",
        detail: `${field.fieldName} (${Math.round(width)}pt > ${field.maxWidth}pt)`,
      }
    }

    // Baseline sits inside the box: one descender above the box floor, which
    // keeps umlauts clear of the printed rule at the top of the box.
    const ascent = field.fontSize * 0.75
    const boxCentre = field.yBottom + field.maxHeight / 2
    placements.push({
      fieldName: field.fieldName,
      factKey: field.factKey,
      page: field.page,
      kind: field.kind,
      x: field.x,
      y: boxCentre - ascent / 2,
      size: field.fontSize,
      value: formatted,
    })
  }

  if (placements.length === 0) {
    return { ok: false, code: "nothing_to_fill" }
  }

  return {
    ok: true,
    placements,
    blanks,
    filledCount: placements.length,
    blankCount: blanks.length,
  }
}

/** Placements for one page, in the order the mapping declares them. */
export function placementsForPage(
  placements: readonly OverlayPlacement[],
  page: number,
): OverlayPlacement[] {
  return placements.filter((placement) => placement.page === page)
}

export function overlayFieldByName(
  mapping: StaticTemplateMapping,
  fieldName: string,
): OverlayFieldPlacement | null {
  return mapping.fields.find((field) => field.fieldName === fieldName) ?? null
}