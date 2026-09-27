import type { CanonicalTaxField, CanonicalTaxReturn2025, Provenance } from "@/lib/canonical-tax-model"
import { fms2025Registry } from "@/lib/fms-2025-registry"
import { FMS_2025_TEMPLATES } from "@/lib/horizon/pdf/registry"
import { formSupportForTemplate } from "@/lib/horizon/steuer/registry"

export type TaxPipelineIssue = { code: string; message: string; field?: string }

const provenance = (questionId: string, sourceForm: string, status: Provenance["verificationStatus"] = "UNVERIFIED"): Provenance => ({ sourceQuestionId: questionId, sourceForm, verificationStatus: status, userConfirmation: "UNCONFIRMED" })
const field = (value: unknown, questionId: string, sourceForm: string): CanonicalTaxField => ({ value: value === "" ? null : value, provenance: provenance(questionId, sourceForm) })

export function buildCanonicalTaxReturn(answers: Record<string, unknown>): CanonicalTaxReturn2025 {
  const result: CanonicalTaxReturn2025 = { taxYear: 2025, taxpayer: {}, spouseOrPartner: {}, household: {}, children: [], employmentIncome: {}, workRelatedExpenses: {}, doubleHousehold: {}, insurance: {}, specialExpenses: {}, extraordinaryBurdens: {}, householdServices: {}, maintenancePayments: {}, evidence: [], selectedForms: ["034037_25"], validationIssues: [] }
  for (const [questionId, value] of Object.entries(answers)) {
    const target = questionId.includes("child") ? result.household : questionId.includes("income") || questionId.includes("employer") ? result.employmentIncome : questionId.includes("commut") || questionId.includes("home") || questionId.includes("expense") ? result.workRelatedExpenses : result.taxpayer
    target[questionId] = field(value, questionId, "Tax questionnaire 2025")
  }
  if (answers.children_count && Number(answers.children_count) > 0) result.selectedForms.push("034025_25")
  if (answers.has_double_household === "yes") result.selectedForms.push("034027d_25")
  if (!answers.tax_year) result.validationIssues.push({ code: "TAX_YEAR_REQUIRED", message: "Steuerjahr fehlt.", field: "tax_year" })
  if (!answers.first_name || !answers.last_name) result.validationIssues.push({ code: "IDENTITY_INCOMPLETE", message: "Name der steuerpflichtigen Person ist unvollständig.", field: "first_name" })
  return result
}

export function getSelectedFormStatus(selectedForms: string[]) {
  return selectedForms.map((identifier) => {
    const legacyForm = fms2025Registry.find((entry) => entry.fmsIdentifier === identifier)
    const template = FMS_2025_TEMPLATES.find((entry) => entry.formId === identifier)
    const fillable = Boolean(template && formSupportForTemplate(template.id) === "fillable")
    return {
      identifier,
      title: template?.formName ?? legacyForm?.officialGermanTitle ?? identifier,
      verificationStatus: template ? ("VERIFIED" as const) : (legacyForm?.verificationStatus ?? "UNVERIFIED"),
      mappingStatus: fillable ? ("FIELD_MAPPING_VERIFIED" as const) : ("FIELD_MAPPING_UNVERIFIED" as const),
      templateId: template?.id ?? null,
      fillable,
    }
  })
}

export function getPdfReadiness(canonical: CanonicalTaxReturn2025) {
  const forms = getSelectedFormStatus(canonical.selectedForms)
  const mappingIssues: TaxPipelineIssue[] = forms
    .filter((form) => !form.fillable)
    .map((form) => ({
      code: "PDF_MAPPING_UNAVAILABLE",
      message: `Няма проверено PDF съответствие за формуляр ${form.identifier}.`,
      field: form.identifier,
    }))
  const issues: TaxPipelineIssue[] = [...canonical.validationIssues, ...mappingIssues]
  return {
    status: issues.length > 0 ? ("BLOCKED" as const) : ("READY_FOR_USER_USE" as const),
    forms,
    issues,
  }
}
