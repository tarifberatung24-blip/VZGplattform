/**
 * HORIZON NEGOTIATION — provider offer parsing.
 *
 * A provider response arrives as pasted text, an uploaded PDF/image, an imported
 * email, or an operator entry. Whatever the source, it is reduced to a structured
 * proposal whose every field is either extracted from the text or `null`. The
 * parser does not guess a price it cannot read and does not infer a fee that was
 * not stated.
 *
 * The parse is deliberately conservative: it recognises explicit euro amounts and
 * durations and leaves everything else empty, because a wrongly parsed price
 * would flow straight into an approval screen.
 */

import type { OfferTerms } from "./savings"
import { EMPTY_OFFER_TERMS } from "./savings"

export const OFFER_SOURCES = [
  "user_paste",
  "uploaded_pdf",
  "uploaded_image",
  "email_import",
  "operator_entry",
] as const

export type OfferSource = (typeof OFFER_SOURCES)[number]

export function isOfferSource(value: unknown): value is OfferSource {
  return typeof value === "string" && (OFFER_SOURCES as readonly string[]).includes(value)
}

export type ParsedOffer = {
  terms: OfferTerms
  /** Fields the parser actually found, so the UI can mark the rest as unknown. */
  extractedFields: (keyof OfferTerms)[]
  /** Raw lines that produced no recognised field, kept for the user to check. */
  unrecognized: string[]
}

// Amounts appear in German ("1.200,00 €") and sometimes English ("1200.00 EUR")
// form. The pattern captures an optional thousands-grouped integer part plus an
// optional one- or two-digit decimal part, so a grouped value is read whole
// rather than as its trailing group.
const NUMBER = "(?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:[.,]\\d{1,2})?"
const AMOUNT = new RegExp(`(${NUMBER})\\s*(?:€|eur|euro)`, "i")
const AMOUNT_PREFIX = new RegExp(`(?:€|eur|euro)\\s*(${NUMBER})`, "i")
const MONTHS = /(\d{1,3})\s*(?:monate|monat|months?|mon\.)/i
const ISO_DATE = /(\d{4}-\d{2}-\d{2})/

function toNumber(raw: string): number | null {
  const normalized = raw.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

function firstAmount(line: string): number | null {
  const match = AMOUNT.exec(line) ?? AMOUNT_PREFIX.exec(line)
  if (!match) return null
  return toNumber(match[1])
}

function contains(line: string, ...needles: string[]): boolean {
  const lower = line.toLowerCase()
  return needles.some((needle) => lower.includes(needle))
}

function splitServices(line: string): string[] {
  const separator = line.includes(";") ? ";" : line.includes(",") ? "," : null
  if (!separator) return []
  return line
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !AMOUNT.test(part))
}

/**
 * Parse a provider response into offer terms.
 *
 * Only lines that name a field are consumed; anything else is returned in
 * `unrecognized` so the review screen can show what was ignored rather than
 * silently dropping it.
 */
export function parseProviderOffer(text: string): ParsedOffer {
  const terms: OfferTerms = { ...EMPTY_OFFER_TERMS }
  const extracted = new Set<keyof OfferTerms>()
  const unrecognized: string[] = []

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    if (contains(line, "aktivierungs", "activation fee", "einrichtungsgebühr")) {
      const amount = firstAmount(line)
      if (amount != null) {
        terms.activationFee = amount
        extracted.add("activationFee")
        continue
      }
    }
    if (contains(line, "hardware", "router", "gerät", "endgerät")) {
      const amount = firstAmount(line)
      if (amount != null) {
        terms.hardwareFee = amount
        extracted.add("hardwareFee")
        continue
      }
    }
    if (contains(line, "gutschrift", "credit", "bonus")) {
      const amount = firstAmount(line)
      if (amount != null) {
        terms.oneTimeCredit = amount
        extracted.add("oneTimeCredit")
        continue
      }
    }
    if (contains(line, "nach der aktion", "danach", "post-promotion", "regulär")) {
      const amount = firstAmount(line)
      if (amount != null) {
        terms.postPromotionMonthly = amount
        extracted.add("postPromotionMonthly")
        continue
      }
    }
    if (contains(line, "aktion", "promotion", "rabatt", "discount")) {
      const months = MONTHS.exec(line)
      if (months) {
        terms.promotionDurationMonths = Number(months[1])
        extracted.add("promotionDurationMonths")
      }
      const amount = firstAmount(line)
      if (amount != null) {
        terms.newMonthly = amount
        extracted.add("newMonthly")
      }
      if (months || amount != null) continue
    }
    if (contains(line, "laufzeit", "mindestlaufzeit", "minimum term", "vertragslaufzeit")) {
      const months = MONTHS.exec(line)
      if (months) {
        terms.newContractDurationMonths = Number(months[1])
        extracted.add("newContractDurationMonths")
        continue
      }
    }
    if (contains(line, "ab ", "gültig ab", "effective", "wirksam")) {
      const date = ISO_DATE.exec(line)
      if (date) {
        terms.effectiveDate = date[1]
        extracted.add("effectiveDate")
        continue
      }
    }
    if (contains(line, "bis ", "expiry", "gültig bis", "ablauf")) {
      const date = ISO_DATE.exec(line)
      if (date) {
        terms.expiryDate = date[1]
        extracted.add("expiryDate")
        continue
      }
    }
    if (contains(line, "enthalten", "inklusive", "included", "leistungen")) {
      const services = splitServices(line)
      if (services.length > 0) {
        terms.includedServices = services
        extracted.add("includedServices")
        continue
      }
    }
    if (contains(line, "entfällt", "entfernt", "removed", "nicht mehr")) {
      const services = splitServices(line)
      if (services.length > 0) {
        terms.removedServices = services
        extracted.add("removedServices")
        continue
      }
    }
    if (contains(line, "zusätzlich", "added", "neu dazu")) {
      const services = splitServices(line)
      if (services.length > 0) {
        terms.addedServices = services
        extracted.add("addedServices")
        continue
      }
    }
    if (contains(line, "preis", "monatlich", "monat", "monthly", "kosten", "grundpreis")) {
      const amount = firstAmount(line)
      if (amount != null) {
        terms.newMonthly = amount
        extracted.add("newMonthly")
        continue
      }
    }
    if (contains(line, "bedingung", "condition", "vorbehalt")) {
      terms.specialConditions = [...terms.specialConditions, line]
      extracted.add("specialConditions")
      continue
    }

    unrecognized.push(line)
  }

  return { terms, extractedFields: [...extracted], unrecognized }
}
