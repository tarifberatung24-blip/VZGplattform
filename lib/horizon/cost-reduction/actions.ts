"use server"

import { createCaseEngine } from "@/lib/horizon/case"
import { submitDocumentIntake } from "@/lib/horizon/intake/document-actions"
import { validateCaseDocumentFile } from "@/lib/horizon/intake/document"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/dictionaries"

export type CostReductionState = {
  ok: boolean
  caseId: string | null
  uploadedCount: number
  error: "invalid" | "consent" | "unauthorized" | "create_failed" | "upload_failed" | null
}

export const initialCostReductionState: CostReductionState = {
  ok: false,
  caseId: null,
  uploadedCount: 0,
  error: null,
}

const MAX_FILES = 3

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

/**
 * Creates one owner-scoped contract-management case for a manual energy-cost
 * review. The request stays inside the canonical HORIZON case spine; it is not
 * sent to WhatsApp, ENNUX, or any other partner from this action.
 */
export async function startCostReductionRequest(
  _previous: CostReductionState,
  formData: FormData,
): Promise<CostReductionState> {
  const rawLocale = formData.get("locale")
  const locale: Locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  const firstName = readText(formData, "firstName", 80)
  const lastName = readText(formData, "lastName", 80)
  const email = readText(formData, "email", 254)
  const mobile = readText(formData, "mobile", 40)
  const birthDate = readText(formData, "birthDate", 10)
  const energyType = readText(formData, "energyType", 30)
  const provider = readText(formData, "provider", 120)
  const postcode = readText(formData, "postcode", 20)
  const annualConsumption = readText(formData, "annualConsumption", 30)
  const monthlyPayment = readText(formData, "monthlyPayment", 30)
  const contractInfo = readText(formData, "contractInfo", 120)
  const documentType = readText(formData, "documentType", 120)
  const details = readText(formData, "details", 3_000)

  if (!firstName || !lastName || !email.includes("@") || !mobile || !energyType) {
    return { ...initialCostReductionState, error: "invalid" }
  }
  if (formData.get("consent") !== "yes") {
    return { ...initialCostReductionState, error: "consent" }
  }

  const files = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (files.length > MAX_FILES) return { ...initialCostReductionState, error: "invalid" }
  for (const file of files) {
    const validation = await validateCaseDocumentFile(file)
    if (!validation.ok) return { ...initialCostReductionState, error: "upload_failed" }
  }

  const engine = await createCaseEngine()
  if (!engine.repository) return { ...initialCostReductionState, error: "unauthorized" }

  const created = await engine.repository.createCase({
    title: "Energie-Tarifprüfung",
    module: "contract_management",
    intent: "free_email",
    uiLocale: locale,
    conversationLocale: locale,
  })
  if (created.error || !created.data) return { ...initialCostReductionState, error: "create_failed" }

  const facts = [
    ["contact_first_name", firstName],
    ["contact_last_name", lastName],
    ["contact_email", email],
    ["contact_mobile", mobile],
    ["birth_date", birthDate],
    ["energy_type", energyType],
    ["current_provider", provider],
    ["postcode", postcode],
    ["annual_consumption_kwh", annualConsumption],
    ["monthly_payment_eur", monthlyPayment],
    ["contract_information", contractInfo],
    ["submitted_document_type", documentType],
  ]
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => ({ key, value, critical: key.startsWith("contact_") }))

  const storedFacts = await engine.repository.addFacts(created.data.id, facts)
  if (storedFacts.error) return { ...initialCostReductionState, caseId: created.data.id, error: "create_failed" }

  if (details) {
    const storedText = await engine.repository.addTextIntake(created.data.id, {
      locale,
      kind: "pasted_text",
      text: details,
    })
    if (storedText.error) return { ...initialCostReductionState, caseId: created.data.id, error: "create_failed" }
  }

  let uploadedCount = 0
  for (const file of files) {
    const uploadForm = new FormData()
    uploadForm.set("caseId", created.data.id)
    uploadForm.set("locale", locale)
    uploadForm.set("kind", "pdf")
    uploadForm.set("file", file)
    const uploaded = await submitDocumentIntake({ error: null, ok: false }, uploadForm)
    if (!uploaded.ok) {
      return { ok: false, caseId: created.data.id, uploadedCount, error: "upload_failed" }
    }
    uploadedCount += 1
  }

  return { ok: true, caseId: created.data.id, uploadedCount, error: null }
}
