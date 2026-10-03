import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"

/**
 * Turns the raw text of a letter into the case's fact groups.
 *
 * Extraction is deliberately conservative: every field carries a confidence,
 * and anything below the threshold is left for the user to confirm or correct
 * in the wizard's review step. A wrong amount silently accepted would be worse
 * than an empty field, because the rule pack would then assess the wrong claim.
 *
 * A scanned letter needs OCR first; that happens in the documents pipeline
 * (/api/documents/extract) and its text is passed here as `text`.
 */

const CONFIDENT = 0.75

export interface Field<T> {
  value: T
  confidence: number
}

export interface ExtractedFacts {
  parties: Record<string, Field<string>>
  claim: Record<string, Field<number>>
  dates: Record<string, Field<string | null>>
  evidence: Record<string, Field<string | number | boolean>>
}

/**
 * German money and quantities: 1.915,65 € / 1.385 kWh / 125,66 € / 1915.65.
 *
 * The comma, when present, is always the decimal separator and dots group
 * thousands. Without a comma the dot is ambiguous, so it only counts as a
 * thousands separator when it falls in the 1.234.567 pattern — otherwise
 * "2427.05" would be read as two thousand four hundred and twenty seven.
 */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").trim()
  if (!cleaned) return null

  if (cleaned.includes(",")) {
    const normalised = cleaned.replace(/\./g, "").replace(",", ".")
    const n = Number(normalised)
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const n = Number(cleaned.replace(/\./g, ""))
    return Number.isFinite(n) ? n : null
  }

  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function findAmount(text: string, labels: string[]): Field<number> {
  for (const label of labels) {
    const re = new RegExp(`${label}[^\\d]{0,40}([\\d.,]+)\\s*€`, "i")
    const m = text.match(re)
    if (m) {
      const n = parseAmount(m[1])
      if (n !== null) return { value: n, confidence: 0.8 }
    }
  }
  return { value: 0, confidence: 0 }
}

/** dd.mm.yyyy or yyyy-mm-dd */
function findDate(text: string, labels: string[]): Field<string | null> {
  for (const label of labels) {
    const re = new RegExp(`${label}[^\\d]{0,40}(\\d{2}\\.\\d{2}\\.\\d{4}|\\d{4}-\\d{2}-\\d{2})`, "i")
    const m = text.match(re)
    if (m) {
      const raw = m[1]
      const iso = raw.includes(".")
        ? raw.split(".").reverse().join("-")
        : raw
      return { value: iso, confidence: 0.75 }
    }
  }
  return { value: null, confidence: 0 }
}

function findString(text: string, patterns: RegExp[]): Field<string> {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return { value: m[1].trim().slice(0, 200), confidence: 0.7 }
  }
  return { value: "", confidence: 0 }
}

export function extractFacts(text: string): ExtractedFacts {
  return {
    parties: {
      creditor: findString(text, [
        /(?:Gläubiger|Inkassounternehmen|Forderungsinhaber)\s*[:\-]\s*([^\n]{2,80})/i,
        /(?:Кредитор)\s*[:\-]\s*([^\n]{2,80})/i,
      ]),
      former_creditor: findString(text, [
        /(?:ehemaliger\s+Gläubiger|Altgläubiger|vormals)\s*[:\-]?\s*([^\n]{2,80})/i,
        /(?:бивш\s+кредитор)\s*[:\-]\s*([^\n]{2,80})/i,
      ]),
      original_supplier: findString(text, [
        /(?:Lieferant|Grundversorger|Stadtwerke)\s*[:\-]?\s*([^\n]{2,80})/i,
      ]),
      court: findString(text, [/(Amtsgericht\s+[A-ZÄÖÜ][a-zäöüß\- ]{2,40})/]),
      case_no: findString(text, [
        /(?:Aktenzeichen|Az\.|Geschäftszeichen)\s*[:\-]?\s*([\w\-\/. ]{3,40})/i,
        /(?:дело)\s*(?:№|No\.?)\s*[:\-]?\s*([\w\-\/. ]{3,40})/i,
      ]),
      creditor_ref: findString(text, [/(?:Vertragskonto|Kundennummer|Kd\.-Nr\.)\s*[:\-]?\s*([\w\-\/. ]{3,40})/i]),
    },
    claim: {
      hauptforderung: findAmount(text, ["Hauptforderung", "Hauptsache"]),
      verfahrenskosten: findAmount(text, ["Verfahrenskosten", "Gerichtskosten", "Nebenforderung"]),
      inkassokosten: findAmount(text, ["Inkassokosten", "Inkassogebühr", "Gebühr"]),
      zinsen: findAmount(text, ["Zinsen", "Verzugszinsen"]),
      total: findAmount(text, ["Gesamtbetrag", "Gesamtforderung", "Summe", "Gesamt"]),
    },
    dates: {
      mahnbescheid: findDate(text, ["Mahnbescheid", "Datum"]),
      service_date: findDate(text, ["zugestellt", "Zustellung", "връчване"]),
      widerspruch_deadline: { value: null, confidence: 0 },
    },
    evidence: {
      meter_no: findString(text, [/(?:Zählernummer|Zähler\s*Nr\.?|електромер)\s*[:\-]?\s*([\w\-]{4,40})/i]),
      period: findString(text, [/(?:Abrechnungszeitraum|Zeitraum|период)\s*[:\-]?\s*([\d./]{4,40}\s*[-–]\s*[\d./]{4,40})/i]),
      consumption_kwh: (() => {
        const m = text.match(/([\d.,]+)\s*kWh/i)
        return m ? { value: parseAmount(m[1]) ?? 0, confidence: 0.7 } : { value: 0, confidence: 0 }
      })(),
      supplier: findString(text, [/(?:Lieferant)\s*[:\-]?\s*([^\n]{2,60})/i]),
      amount: findAmount(text, ["Verbrauch", "Abrechnungsbetrag"]),
    },
  }
}

/** Low-confidence fields that the wizard must ask the user to confirm. */
export function needsReview(facts: ExtractedFacts): string[] {
  const out: string[] = []
  for (const [group, fields] of Object.entries(facts)) {
    for (const [key, field] of Object.entries(fields as Record<string, Field<unknown>>)) {
      if (field.confidence < CONFIDENT) out.push(`${group}.${key}`)
    }
  }
  return out
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id)) return NextResponse.json({ code: "INVALID_CASE_ID" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  const { data: current, error } = await loadCase(supabase, user.id, id)
  if (error) return NextResponse.json({ code: "CASES_UNAVAILABLE" }, { status: 503 })
  if (!current) return NextResponse.json({ code: "CASE_NOT_FOUND" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 })
  }

  let text = typeof body.text === "string" ? body.text : ""

  // A case may point at an already-extracted document; reuse that text rather
  // than asking for the letter twice.
  if (!text && typeof body.documentId === "string") {
    const { data: doc } = await supabase
      .from("documents")
      .select("extracted_text")
      .eq("id", body.documentId)
      .maybeSingle()
    text = typeof doc?.extracted_text === "string" ? doc.extracted_text : ""
  }

  if (!text.trim()) {
    return NextResponse.json({ code: "NO_TEXT_TO_EXTRACT" }, { status: 409 })
  }

  const facts = extractFacts(text)
  const review = needsReview(facts)

  const { error: saveError } = await supabase
    .from("inkasso_cases")
    .update({ status: "extracted" })
    .eq("id", id)
    .eq("user_id", user.id)

  if (saveError) return NextResponse.json({ code: "EXTRACTION_SAVE_FAILED" }, { status: 503 })

  return NextResponse.json({
    extracted: facts,
    confidence_threshold: CONFIDENT,
    needs_review: review,
  })
}
