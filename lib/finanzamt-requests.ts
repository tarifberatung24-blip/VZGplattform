export const finanzamtRequestTypes = [
  { value: "BELEGNACHREICHUNG", label: "Belegnachreichung", transaction: "ELSTER_BELEGNACHREICHUNG" },
  { value: "EINSPRUCH", label: "Einspruch", transaction: "ELSTER_EINSPRUCH" },
  { value: "FRISTVERLAENGERUNG", label: "Fristverlängerung", transaction: "ELSTER_FRISTVERLAENGERUNG" },
  { value: "ADDRESS_CHANGE", label: "Änderung der Adresse", transaction: "ELSTER_ADRESSAENDERUNG" },
  { value: "BANK_CHANGE", label: "Änderung der Bankverbindung", transaction: "ELSTER_BANKVERBINDUNG" },
  { value: "ADVANCE_PAYMENT_CHANGE", label: "Anpassung von Vorauszahlungen", transaction: "ELSTER_VORAUSZAHLUNGEN" },
  { value: "OTHER", label: "Sonstige Nachricht an das Finanzamt", transaction: null },
] as const

export type FinanzamtRequestType = (typeof finanzamtRequestTypes)[number]["value"]
export type FinanzamtRequestStatus = "DRAFT" | "READY_FOR_REVIEW" | "SUBMISSION_NOT_CONFIGURED" | "SUBMITTED" | "RESPONSE_RECEIVED"

export type FinanzamtRequest = {
  id?: string
  requestType: FinanzamtRequestType
  subject: string
  text: string
  linkedTaxReturnId?: string
  attachmentsMetadata: Array<{ name: string; size?: number; mimeType?: string }>
  status: FinanzamtRequestStatus
  futureElsterTransaction: string | null
}
