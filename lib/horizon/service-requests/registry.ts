/**
 * Service requests use the canonical case spine. The service type is stored as
 * an append-only case fact so new commercial services can be added without
 * widening the protected `cases` database vocabulary for every launch.
 */
import { serviceRequestKinds } from "@/lib/service-request"

export const SERVICE_REQUEST_TYPES = [
  "energy_cost_check",
  "kfz_insurance",
  ...serviceRequestKinds,
] as const

export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[number]

export const SERVICE_REQUEST_TYPE_FACT = "service_request_type"

/**
 * The request id is stored as a case fact too, so a repeated submission can find
 * the case an earlier attempt already created instead of provisioning a second
 * one. The value is the `hz_<uuid>` the site returns to the customer.
 */
export const SERVICE_REQUEST_ID_FACT = "service_request_id"

export function isServiceRequestType(value: unknown): value is ServiceRequestType {
  return typeof value === "string" && (SERVICE_REQUEST_TYPES as readonly string[]).includes(value)
}

/** The latest fact wins because the case spine is append-only. */
export function serviceRequestTypeFromFacts(
  facts: readonly { key: string; value: string }[],
): ServiceRequestType | null {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    const fact = facts[index]
    if (fact.key === SERVICE_REQUEST_TYPE_FACT && isServiceRequestType(fact.value)) {
      return fact.value
    }
  }
  return null
}

export function isEnergyCostRequest(facts: readonly { key: string; value: string }[]) {
  return serviceRequestTypeFromFacts(facts) === "energy_cost_check"
}
