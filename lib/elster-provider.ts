import type { CanonicalTaxReturn2025 } from "./canonical-tax-model"

export type ElsterState = "DRAFT" | "VALIDATION_REQUIRED" | "READY_FOR_USER_REVIEW" | "READY_FOR_AUTHENTICATED_SUBMISSION" | "SUBMISSION_NOT_CONFIGURED" | "SUBMITTED" | "REJECTED" | "NEEDS_CORRECTION"
export type SubmissionRole = "SELF_SUBMISSION" | "AUTHORIZED_REPRESENTATIVE"
export type SubmissionReceipt = { receiptId: string; receivedAt: string; official: true }

export interface ElsterProvider {
  validateTaxReturn(taxReturn: CanonicalTaxReturn2025): Promise<{ state: ElsterState; issues: CanonicalTaxReturn2025["validationIssues"] }>
  prepareSubmissionPayload(taxReturn: CanonicalTaxReturn2025): Promise<{ state: ElsterState; payload: unknown }>
  createUserReviewPackage(taxReturn: CanonicalTaxReturn2025): Promise<{ state: "READY_FOR_USER_REVIEW"; summary: string }>
  submitAuthenticated(payload: unknown, role: SubmissionRole): Promise<{ state: ElsterState; receipt?: SubmissionReceipt }>
  getSubmissionReceipt(): Promise<SubmissionReceipt | null>
  getSubmissionStatus(): Promise<ElsterState>
}

export const elsterSafetyNotice = "Подаването към ELSTER ще изисква потвърждение и удостоверяване с Вашия ELSTER сертификат. Данъчната декларация няма да бъде изпратена без Вашето изрично действие."
export const elsterCredentialPolicy = "Не се събират и не се съхраняват ELSTER пароли, пароли за сертификати, .pfx файлове, частни ключове или удостоверителни данни."

export class UnconfiguredElsterProvider implements ElsterProvider {
  async validateTaxReturn(taxReturn: CanonicalTaxReturn2025) { return { state: taxReturn.validationIssues.length ? "VALIDATION_REQUIRED" as const : "READY_FOR_USER_REVIEW" as const, issues: taxReturn.validationIssues } }
  async prepareSubmissionPayload(taxReturn: CanonicalTaxReturn2025) { return { state: "SUBMISSION_NOT_CONFIGURED" as const, payload: { taxYear: taxReturn.taxYear, selectedForms: taxReturn.selectedForms } } }
  async createUserReviewPackage() { return { state: "READY_FOR_USER_REVIEW" as const, summary: "Пакетът е подготвен за преглед." } }
  async submitAuthenticated() { return { state: "SUBMISSION_NOT_CONFIGURED" as const } }
  async getSubmissionReceipt() { return null }
  async getSubmissionStatus() { return "SUBMISSION_NOT_CONFIGURED" as const }
}
