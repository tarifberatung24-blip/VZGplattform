"use server"

import { createCaseEngine } from "@/lib/horizon/case"
import { submitDocumentIntake } from "@/lib/horizon/intake/document-actions"
import { validateCaseDocumentFile } from "@/lib/horizon/intake/document"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { revalidatePath } from "next/cache"
import {
  SERVICE_REQUEST_TYPE_FACT,
  serviceRequestTypeFromFacts,
} from "@/lib/horizon/service-requests/registry"
import { deriveServiceRequestReadiness } from "@/lib/horizon/service-requests/readiness"

export type CostReductionState = {
  ok: boolean
  caseId: string | null
  uploadedCount: number
  missingFactKeys: string[]
  urgent: boolean
  error: "invalid" | "consent" | "unauthorized" | "create_failed" | "upload_failed" | null
}

export const initialCostReductionState: CostReductionState = {
  ok: false,
  caseId: null,
  uploadedCount: 0,
  missingFactKeys: [],
  urgent: false,
  error: null,
}

const MAX_FILES = 3
const REQUEST_PURPOSES = ["tariff_check", "bill_help", "urgent_support"] as const

function isRequestPurpose(value: string): value is (typeof REQUEST_PURPOSES)[number] {
  return (REQUEST_PURPOSES as readonly string[]).includes(value)
}

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
  const rawPurpose = readText(formData, "requestPurpose", 40)
  const requestPurpose = isRequestPurpose(rawPurpose) ? rawPurpose : "tariff_check"
  const urgentNotice = formData.get("urgentNotice") === "yes"
  const textSignalsUrgency = /sperrandrohung|versorgungssperre|stromsperre|gassperre|abschaltung|прекъсван|спиране\s+на\s+(ток|газ)/i.test(details)
  const urgent = urgentNotice || requestPurpose === "urgent_support" || textSignalsUrgency

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
    title: urgent
      ? "Energie: dringende Sperrandrohung"
      : requestPurpose === "bill_help"
        ? "Energie: Rechnung und Verbraucherrechte"
        : "Energie-Tarifprüfung",
    module: "contract_management",
    intent: "free_email",
    uiLocale: locale,
    conversationLocale: locale,
  })
  if (created.error || !created.data) return { ...initialCostReductionState, error: "create_failed" }

  const facts = [
    [SERVICE_REQUEST_TYPE_FACT, "energy_cost_check"],
    ["energy_request_purpose", requestPurpose],
    ["energy_urgency", urgent ? "urgent" : "standard"],
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
      return {
        ...initialCostReductionState,
        caseId: created.data.id,
        uploadedCount,
        error: "upload_failed",
      }
    }
    uploadedCount += 1
  }

  const readiness = deriveServiceRequestReadiness({
    serviceType: "energy_cost_check",
    facts: facts.map(({ key, value }) => ({ key, value })),
    documentCount: uploadedCount,
  })

  // Statuses are stored in the existing case lifecycle. This makes the request
  // visible as received, waiting for information, or queued for review without
  // inventing a parallel workflow just for energy requests.
  const collecting = await engine.repository.applyAction(created.data.id, "start_collecting")
  if (!collecting.error) {
    await engine.repository.applyAction(
      created.data.id,
      readiness.nextStatus === "waiting_for_user" ? "request_user_input" : "start_processing",
    )
  }
  await engine.repository.createTask(created.data.id, { type: "human_review" })
  await engine.repository.appendAudit(created.data.id, "energy_request_readiness_checked", {
    request_purpose: requestPurpose,
    urgent: readiness.urgent,
    missing_fact_keys: readiness.missingFactKeys,
    uploaded_count: uploadedCount,
  })
  revalidatePath(`/${locale}/kosten-senken`)
  revalidatePath(`/${locale}/guide/${created.data.id}`)

  return {
    ok: true,
    caseId: created.data.id,
    uploadedCount,
    missingFactKeys: readiness.missingFactKeys,
    urgent: readiness.urgent,
    error: null,
  }
}

export type UpdateCostReductionDetailsState = {
  ok: boolean
  missingFactKeys: string[]
  error: "invalid" | "unauthorized" | "not_energy_request" | "save_failed" | null
}

export const initialUpdateCostReductionDetailsState: UpdateCostReductionDetailsState = {
  ok: false,
  missingFactKeys: [],
  error: null,
}

/** Adds only the tariff-comparison fields a customer explicitly entered later. */
export async function updateCostReductionDetails(
  _previous: UpdateCostReductionDetailsState,
  formData: FormData,
): Promise<UpdateCostReductionDetailsState> {
  const caseId = readText(formData, "caseId", 100)
  const rawLocale = formData.get("locale")
  const locale: Locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  if (!caseId) return { ...initialUpdateCostReductionDetailsState, error: "invalid" }

  const engine = await createCaseEngine()
  if (!engine.repository) return { ...initialUpdateCostReductionDetailsState, error: "unauthorized" }

  const [owned, existingFacts, documents] = await Promise.all([
    engine.repository.getMine(caseId),
    engine.repository.listFacts(caseId),
    engine.repository.listDocuments(caseId),
  ])
  if (owned.error || !owned.data || existingFacts.error || documents.error) {
    return { ...initialUpdateCostReductionDetailsState, error: "save_failed" }
  }
  if (serviceRequestTypeFromFacts(existingFacts.data ?? []) !== "energy_cost_check") {
    return { ...initialUpdateCostReductionDetailsState, error: "not_energy_request" }
  }

  const updatedFacts = [
    ["postcode", readText(formData, "postcode", 20)],
    ["current_provider", readText(formData, "provider", 120)],
    ["annual_consumption_kwh", readText(formData, "annualConsumption", 30)],
    ["monthly_payment_eur", readText(formData, "monthlyPayment", 30)],
    ["contract_information", readText(formData, "contractInfo", 120)],
  ]
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => ({ key, value }))

  if (updatedFacts.length > 0) {
    const saved = await engine.repository.addFacts(caseId, updatedFacts)
    if (saved.error) return { ...initialUpdateCostReductionDetailsState, error: "save_failed" }
  }

  const allFacts = [
    ...(existingFacts.data ?? []).map(({ key, value }) => ({ key, value })),
    ...updatedFacts,
  ]
  const readiness = deriveServiceRequestReadiness({
    serviceType: "energy_cost_check",
    facts: allFacts,
    documentCount: documents.data?.length ?? 0,
  })

  if (readiness.nextStatus === "waiting_for_user" && owned.data.status === "collecting_data") {
    await engine.repository.applyAction(caseId, "request_user_input")
  }
  if (readiness.nextStatus === "processing") {
    if (owned.data.status === "waiting_for_user") {
      await engine.repository.applyAction(caseId, "user_input_received")
      await engine.repository.applyAction(caseId, "start_processing")
    } else if (owned.data.status === "collecting_data") {
      await engine.repository.applyAction(caseId, "start_processing")
    }
  }

  await engine.repository.appendAudit(caseId, "energy_request_details_updated", {
    added_fact_keys: updatedFacts.map((fact) => fact.key),
    missing_fact_keys: readiness.missingFactKeys,
  })
  revalidatePath(`/${locale}/kosten-senken`)
  revalidatePath(`/${locale}/guide/${caseId}`)
  return { ok: true, missingFactKeys: readiness.missingFactKeys, error: null }
}
