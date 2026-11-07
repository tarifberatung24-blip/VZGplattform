import { describe, expect, it } from "vitest"
import { analyseEInvoice, isEInvoiceCategory } from "./e-invoice"

/**
 * The e-invoice module must never assert legal compliance. These tests pin the
 * two honest properties: it recognises the family by namespace, and it always
 * reports `requires_external_verification` with a notice that says so — even for
 * a file where every structural term is present.
 */

const XRECHNUNG_UBL = `<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>RE-123</cbc:ID>
  <cbc:IssueDate>2026-01-15</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cbc:Name>Seller</cbc:Name></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cbc:Name>Buyer</cbc:Name></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount>19.00</cbc:TaxAmount></cac:TaxTotal>
  <cbc:PayableAmount>119.00</cbc:PayableAmount>
</Invoice>`

const ZUGFERD_CII = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <ram:ExchangedDocument><ram:ID>RE-9</ram:ID></ram:ExchangedDocument>
  <ram:IssuedDateTime>20260115</ram:IssuedDateTime>
  <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
  <ram:SellerTradeParty><ram:Name>Seller</ram:Name></ram:SellerTradeParty>
  <ram:BuyerTradeParty><ram:Name>Buyer</ram:Name></ram:BuyerTradeParty>
  <ram:ApplicableTradeTax><ram:CalculatedAmount>19.00</ram:CalculatedAmount></ram:ApplicableTradeTax>
  <ram:GrandTotalAmount>119.00</ram:GrandTotalAmount>
</rsm:CrossIndustryInvoice>`

describe("analyseEInvoice", () => {
  it("recognises an XRechnung/UBL document", () => {
    expect(analyseEInvoice(XRECHNUNG_UBL).format).toBe("xrechnung_ubl")
  })

  it("recognises a ZUGFeRD/CII document", () => {
    expect(analyseEInvoice(ZUGFERD_CII).format).toBe("zugferd_cii")
  })

  it("reports every structural term present for a complete UBL invoice", () => {
    const analysis = analyseEInvoice(XRECHNUNG_UBL)
    expect(analysis.missing).toEqual([])
  })

  it("lists the missing structural terms for an incomplete invoice", () => {
    const analysis = analyseEInvoice('<Invoice xmlns="urn:oasis:names:specification:ubl"><cbc:ID>x</cbc:ID></Invoice>')
    expect(analysis.missing.length).toBeGreaterThan(0)
  })

  it("never asserts legal conformity, even for a complete document", () => {
    expect(analyseEInvoice(XRECHNUNG_UBL).conformance).toBe("requires_external_verification")
    expect(analyseEInvoice(ZUGFERD_CII).conformance).toBe("requires_external_verification")
  })

  it("states in the notice that it is structural only and that HORIZON does not send invoices", () => {
    const notice = analyseEInvoice(XRECHNUNG_UBL).notice
    expect(notice.de).toContain("nur die Struktur")
    expect(notice.de).toContain("übermittelt und versendet keine Rechnungen")
  })

  it("returns unknown for a non-invoice file rather than guessing", () => {
    const analysis = analyseEInvoice("just some text, not xml")
    expect(analysis.format).toBe("unknown")
    expect(analysis.missing.length).toBe(analysis.checks.length)
  })

  it("is total for empty input", () => {
    expect(() => analyseEInvoice("")).not.toThrow()
    expect(analyseEInvoice("").format).toBe("unknown")
  })
})

describe("isEInvoiceCategory", () => {
  it("routes only the e_invoice category", () => {
    expect(isEInvoiceCategory("e_invoice")).toBe(true)
    expect(isEInvoiceCategory("invoice")).toBe(false)
  })
})
