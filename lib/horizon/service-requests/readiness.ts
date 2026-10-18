import type { HorizonCaseStatus } from "../case/contract"
import type { ServiceRequestType } from "./registry"

export type ServiceFact = { key: string; value: string }

export type ServiceRequestReadiness = {
  missingFactKeys: string[]
  urgent: boolean
  nextStatus: Extract<HorizonCaseStatus, "waiting_for_user" | "processing">
}

function latestValue(facts: readonly ServiceFact[], key: string) {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    const fact = facts[index]
    if (fact.key === key && fact.value.trim().length > 0) return fact.value.trim()
  }
  return ""
}

/**
 * A transparent starter check, deliberately not an AI judgement. A bill or
 * contract can contain provider and consumption data, so those are requested
 * only when the user supplied neither documents nor the data themselves.
 */
export function deriveServiceRequestReadiness(input: {
  serviceType: ServiceRequestType
  facts: readonly ServiceFact[]
  documentCount: number
}): ServiceRequestReadiness {
  if (input.serviceType !== "energy_cost_check") {
    return { missingFactKeys: [], urgent: false, nextStatus: "processing" }
  }

  const missingFactKeys: string[] = []
  if (!latestValue(input.facts, "postcode")) missingFactKeys.push("postcode")

  if (input.documentCount === 0) {
    if (!latestValue(input.facts, "current_provider")) missingFactKeys.push("current_provider")
    if (!latestValue(input.facts, "annual_consumption_kwh")) missingFactKeys.push("annual_consumption_kwh")
    if (!latestValue(input.facts, "monthly_payment_eur")) missingFactKeys.push("monthly_payment_eur")
  }

  const urgent = latestValue(input.facts, "energy_urgency") === "urgent"
  return {
    missingFactKeys,
    urgent,
    nextStatus: urgent || missingFactKeys.length === 0 ? "processing" : "waiting_for_user",
  }
}
