export type VerificationStatus = "VERIFIED" | "UNVERIFIED"
export type UserConfirmationState = "UNCONFIRMED" | "CONFIRMED"

export type Provenance = {
  sourceQuestionId?: string
  sourceForm: string
  sourceLineOrSection?: string
  sourceReference?: string
  verificationStatus: VerificationStatus
  userConfirmation: UserConfirmationState
}

export type CanonicalTaxField<T = unknown> = { value: T | null; provenance: Provenance }

export type CanonicalTaxReturn2025 = {
  taxYear: 2025
  taxpayer: Record<string, CanonicalTaxField>
  spouseOrPartner: Record<string, CanonicalTaxField>
  household: Record<string, CanonicalTaxField>
  children: Array<Record<string, CanonicalTaxField>>
  employmentIncome: Record<string, CanonicalTaxField>
  workRelatedExpenses: Record<string, CanonicalTaxField>
  doubleHousehold: Record<string, CanonicalTaxField>
  insurance: Record<string, CanonicalTaxField>
  specialExpenses: Record<string, CanonicalTaxField>
  extraordinaryBurdens: Record<string, CanonicalTaxField>
  householdServices: Record<string, CanonicalTaxField>
  maintenancePayments: Record<string, CanonicalTaxField>
  evidence: Array<{ name: string; metadata: Record<string, unknown>; linkedField?: string }>
  selectedForms: string[]
  validationIssues: Array<{ code: string; message: string; field?: string }>
}

export function emptyCanonicalTaxReturn(): CanonicalTaxReturn2025 {
  return { taxYear: 2025, taxpayer: {}, spouseOrPartner: {}, household: {}, children: [], employmentIncome: {}, workRelatedExpenses: {}, doubleHousehold: {}, insurance: {}, specialExpenses: {}, extraordinaryBurdens: {}, householdServices: {}, maintenancePayments: {}, evidence: [], selectedForms: ["034037_25"], validationIssues: [] }
}
