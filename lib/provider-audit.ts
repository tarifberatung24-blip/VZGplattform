import type { SupabaseClient } from "@supabase/supabase-js"

export type ProviderLifecycleStatus =
  | "NOT_AVAILABLE" | "DRAFT" | "VALIDATED" | "REVIEW_REQUIRED"
  | "READY_FOR_PROVIDER" | "QUEUED" | "TRANSMITTING" | "ACCEPTED"
  | "REJECTED" | "FAILED" | "CANCELLED"

export type ProviderAuditEvent = {
  id: string
  event_type: string
  redacted_metadata: Record<string, unknown>
  created_at: string
}

export async function getProviderAudit(
  supabase: SupabaseClient,
  userId: string,
  declarationReference?: string,
) {
  let query = supabase
    .from("provider_submission_attempts")
    .select("id,declaration_reference,lifecycle_status,idempotency_key,payload_fingerprint,correlation_id,created_at,updated_at,provider_integrations(display_name,provider_key),provider_submission_events(id,event_type,redacted_metadata,created_at),provider_receipts(id,provider_receipt_id,receipt_timestamp,response_classification,evidence_reference)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (declarationReference) query = query.eq("declaration_reference", declarationReference)
  return query
}

export function redactAuditMetadata(metadata: Record<string, unknown>) {
  const sensitiveKeys = new Set(["password", "certificate", "privateKey", "private_key", "token", "secret", "payload"])
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !sensitiveKeys.has(key)))
}

export const providerAuditLabels: Record<string, string> = {
  created: "Създадено",
  validated: "Валидирано",
  review_required: "Изисква преглед",
  ready_for_provider: "Готово за доставчик",
  queued: "В опашка",
  transmitting: "Предаване",
  accepted: "Прието",
  rejected: "Отхвърлено",
  failed: "Неуспешно",
  cancelled: "Отказано",
}

export const providerLifecycleLabels: Record<ProviderLifecycleStatus, string> = {
  NOT_AVAILABLE: "Доставчикът не е наличен",
  DRAFT: "Чернова",
  VALIDATED: "Валидирано",
  REVIEW_REQUIRED: "Изисква преглед",
  READY_FOR_PROVIDER: "Готово за доставчик",
  QUEUED: "В опашка",
  TRANSMITTING: "Предаване",
  ACCEPTED: "Прието",
  REJECTED: "Отхвърлено",
  FAILED: "Неуспешно",
  CANCELLED: "Отказано",
}

export function isSubmissionAllowed(status: ProviderLifecycleStatus, providerAvailable: boolean) {
  return providerAvailable && status === "READY_FOR_PROVIDER"
}
