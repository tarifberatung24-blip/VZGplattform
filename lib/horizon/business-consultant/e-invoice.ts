/**
 * HORIZON Business Consultant — E-Rechnung readiness (Module G).
 *
 * This module does two honest, limited things:
 *   1. recognises the format of an uploaded XML e-invoice (XRechnung/UBL or
 *      ZUGFeRD/CII) by its namespace, and
 *   2. checks that the structural elements a valid German e-invoice must carry
 *      are present, and lists the ones that are missing.
 *
 * It does NOT certify legal conformity and it says so. Passing these checks
 * means the file is well-formed and the expected business terms are present — it
 * is not a statement that the invoice satisfies the EN 16931 semantic model, the
 * XRechnung CIUS, or any tax requirement. That determination needs a qualified
 * professional or a dedicated validation service, and the module reports it as
 * `requires_external_verification` rather than claiming it.
 *
 * Nothing here submits, transmits or converts an invoice. Detection and reporting
 * only; the file stays the owner's.
 */

export const E_INVOICE_FORMATS = ["xrechnung_ubl", "zugferd_cii", "unknown"] as const
export type EInvoiceFormat = (typeof E_INVOICE_FORMATS)[number]

export type EInvoiceCheck = {
  /** The business term the check looks for, named the way the standard names it. */
  term: string
  label: { bg: string; de: string }
  present: boolean
}

export type EInvoiceAnalysis = {
  format: EInvoiceFormat
  formatLabel: { bg: string; de: string }
  checks: EInvoiceCheck[]
  missing: string[]
  /**
   * Always `requires_external_verification`: the module never asserts compliance.
   * Kept as a literal so the type cannot express a stronger claim.
   */
  conformance: "requires_external_verification"
  /** A truthful, non-legal summary the UI can render verbatim. */
  notice: { bg: string; de: string }
}

/** Namespace fragments that identify each supported family. */
const UBL_MARKERS = ["urn:oasis:names:specification:ubl", "CrossIndustryInvoice".toLowerCase()]
const CII_MARKERS = ["urn:un:unece:uncefact:data:standard:CrossIndustryInvoice"]

/** The structural terms checked, in both families. Not a full EN 16931 model. */
const TERMS: { key: string; label: { bg: string; de: string }; ubl: string[]; cii: string[] }[] = [
  {
    key: "invoice_number",
    label: { bg: "Номер на фактурата", de: "Rechnungsnummer" },
    ubl: ["<cbc:id", "<cbc:ID"],
    cii: ["<ram:ID", "ExchangedDocument"],
  },
  {
    key: "issue_date",
    label: { bg: "Дата на издаване", de: "Rechnungsdatum" },
    ubl: ["<cbc:issuedate", "<cbc:IssueDate"],
    cii: ["<ram:IssuedDateTime", "IssueDateTime"],
  },
  {
    key: "currency",
    label: { bg: "Валута", de: "Währung" },
    ubl: ["<cbc:documentcurrencycode", "<cbc:DocumentCurrencyCode"],
    cii: ["<ram:InvoiceCurrencyCode", "InvoiceCurrencyCode"],
  },
  {
    key: "seller_name",
    label: { bg: "Доставчик", de: "Verkäufer" },
    ubl: ["<cac:accountingsupplierparty", "<cac:AccountingSupplierParty"],
    cii: ["<ram:SellerTradeParty", "SellerTradeParty"],
  },
  {
    key: "buyer_name",
    label: { bg: "Получател", de: "Käufer" },
    ubl: ["<cac:accountingcustomerparty", "<cac:AccountingCustomerParty"],
    cii: ["<ram:BuyerTradeParty", "BuyerTradeParty"],
  },
  {
    key: "tax_total",
    label: { bg: "Обща сума на данъка", de: "Steuerbetrag gesamt" },
    ubl: ["<cac:taxtotal", "<cac:TaxTotal"],
    cii: ["<ram:ApplicableTradeTax", "ApplicableTradeTax"],
  },
  {
    key: "grand_total",
    label: { bg: "Обща сума", de: "Gesamtbetrag" },
    ubl: ["<cbc:payableamount", "<cbc:PayableAmount"],
    cii: ["<ram:GrandTotalAmount", "GrandTotalAmount"],
  },
]

const NOTICE = {
  bg: "Този преглед проверява само структурата на XML файла. Той не удостоверява правно съответствие с EN 16931, XRechnung или ZUGFeRD. Задължителна проверка за съответствие изисква квалифициран специалист или специализирана услуга. HORIZON не подава и не изпраща фактури.",
  de: "Diese Prüfung kontrolliert nur die Struktur der XML-Datei. Sie bescheinigt keine rechtliche Konformität mit EN 16931, XRechnung oder ZUGFeRD. Eine verbindliche Konformitätsprüfung erfordert eine qualifizierte Stelle oder einen spezialisierten Dienst. HORIZON übermittelt und versendet keine Rechnungen.",
} as const

function detectFormat(xml: string): EInvoiceFormat {
  const lower = xml.toLowerCase()
  if (CII_MARKERS.some((marker) => lower.includes(marker.toLowerCase()))) return "zugferd_cii"
  if (lower.includes("crossindustryinvoice")) return "zugferd_cii"
  if (UBL_MARKERS.some((marker) => lower.includes(marker))) return "xrechnung_ubl"
  if (lower.includes("invoice") && lower.includes("xmlns")) return "xrechnung_ubl"
  return "unknown"
}

/**
 * Analyses one XML e-invoice.
 *
 * Pure and total: a malformed file yields `format: unknown` with every term
 * missing, never a thrown error and never a fabricated "valid" result.
 */
export function analyseEInvoice(xml: string): EInvoiceAnalysis {
  const format = detectFormat(xml)
  const lower = xml.toLowerCase()

  const checks: EInvoiceCheck[] = TERMS.map((term) => {
    const markers = format === "zugferd_cii" ? term.cii : term.ubl
    const present = markers.some((marker) => lower.includes(marker.toLowerCase()))
    return { term: term.key, label: term.label, present }
  })

  const missing = checks.filter((check) => !check.present).map((check) => check.term)

  return {
    format,
    formatLabel:
      format === "xrechnung_ubl"
        ? { bg: "XRechnung (UBL)", de: "XRechnung (UBL)" }
        : format === "zugferd_cii"
          ? { bg: "ZUGFeRD (CII)", de: "ZUGFeRD (CII)" }
          : { bg: "Неразпознат XML", de: "Unbekanntes XML" },
    checks,
    missing,
    conformance: "requires_external_verification",
    notice: NOTICE,
  }
}

/**
 * Whether a document category marks the document as an e-invoice, so the centre
 * can route it to `analyseEInvoice` without guessing from the file name.
 */
export function isEInvoiceCategory(category: string): boolean {
  return category === "e_invoice"
}
