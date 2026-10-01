/**
 * HORIZON AI orchestration policy — FREE-FIRST.
 *
 * Cost policy:
 *   1. Strong free/open routes first whenever the data class allows it.
 *   2. Paid providers are escalation-only and require an explicit approval flag.
 *   3. Customer personal data never silently hops to a different external
 *      provider because a free tier is exhausted.
 *
 * This module contains no SDK client, credentials, network call or customer
 * data. It only decides whether a route is allowed.
 */

export const HORIZON_AI_PROVIDER_IDS = [
  "local-selfhosted",
  "groq-free",
  "gemini-free-target",
  "openrouter-free-target",
  "cerebras-trial",
  "bedrock-paid-escalation",
  "openai-paid-escalation",
] as const

export type HorizonAiProviderId = (typeof HORIZON_AI_PROVIDER_IDS)[number]

export type HorizonAiWorkload =
  | "case_assistant"
  | "household_chat"
  | "document_analysis"
  | "structured_extraction"
  | "routing"
  | "missing_info"
  | "drafting"
  | "multimodal_verification"

export type HorizonAiDataClass =
  | "public"
  | "repository"
  | "user_non_sensitive"
  | "personal_data"
  | "sensitive_personal_data"

export type HorizonAiProviderStage =
  | "target_free"
  | "legacy_free_runtime"
  | "trial_only"
  | "paid_escalation"

export type HorizonAiCostClass = "free" | "trial_credit" | "paid"

export type HorizonAiProviderPolicy = {
  id: HorizonAiProviderId
  stage: HorizonAiProviderStage
  costClass: HorizonAiCostClass
  transport: "direct_current" | "litellm_gateway" | "local_runtime" | "not_implemented"
  supports: readonly HorizonAiWorkload[]
  personalDataPolicy: "local_only" | "existing_only" | "non_sensitive_only" | "approval_required"
  description: string
}

export const HORIZON_AI_FREE_MODEL_ALIASES = {
  /** Strong reasoning/coding/extraction default on the Groq free tier. */
  strong: "openai/gpt-oss-120b",
  /** Very fast cheap/free-tier route for classification and short transforms. */
  fast: "openai/gpt-oss-20b",
  /** Free-tier multimodal candidate on Groq; must be canary-tested before cutover. */
  multimodal: "qwen/qwen3.8-27b",
} as const

export const HORIZON_AI_PROVIDERS: Readonly<Record<HorizonAiProviderId, HorizonAiProviderPolicy>> = {
  "local-selfhosted": {
    id: "local-selfhosted",
    stage: "target_free",
    costClass: "free",
    transport: "local_runtime",
    supports: [
      "case_assistant",
      "household_chat",
      "document_analysis",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
      "multimodal_verification",
    ],
    personalDataPolicy: "local_only",
    description:
      "Zero-API-cost target for privacy-sensitive work when suitable local hardware/model quality is verified.",
  },
  "groq-free": {
    id: "groq-free",
    stage: "legacy_free_runtime",
    costClass: "free",
    transport: "direct_current",
    supports: [
      "case_assistant",
      "household_chat",
      "document_analysis",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
      "multimodal_verification",
    ],
    personalDataPolicy: "existing_only",
    description:
      "Current runtime provider and first free/strong external route; migrate model selection to free strong/fast aliases.",
  },
  "gemini-free-target": {
    id: "gemini-free-target",
    stage: "target_free",
    costClass: "free",
    transport: "not_implemented",
    supports: [
      "case_assistant",
      "household_chat",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
      "multimodal_verification",
    ],
    personalDataPolicy: "non_sensitive_only",
    description:
      "Free-tier target for non-sensitive workloads only; never a silent fallback for customer personal data.",
  },
  "openrouter-free-target": {
    id: "openrouter-free-target",
    stage: "target_free",
    costClass: "free",
    transport: "not_implemented",
    supports: [
      "case_assistant",
      "household_chat",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
    ],
    personalDataPolicy: "non_sensitive_only",
    description:
      "Free-model target for low-volume non-sensitive fallback. Runtime client must be implemented and tested first.",
  },
  "cerebras-trial": {
    id: "cerebras-trial",
    stage: "trial_only",
    costClass: "trial_credit",
    transport: "direct_current",
    supports: ["document_analysis", "multimodal_verification"],
    personalDataPolicy: "existing_only",
    description:
      "Existing specialist adapter; free credit is trial credit, so it is not treated as a durable free primary.",
  },
  "bedrock-paid-escalation": {
    id: "bedrock-paid-escalation",
    stage: "paid_escalation",
    costClass: "paid",
    transport: "litellm_gateway",
    supports: [
      "case_assistant",
      "household_chat",
      "document_analysis",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
      "multimodal_verification",
    ],
    personalDataPolicy: "approval_required",
    description: "Paid quality/privacy escalation only; disabled by default.",
  },
  "openai-paid-escalation": {
    id: "openai-paid-escalation",
    stage: "paid_escalation",
    costClass: "paid",
    transport: "litellm_gateway",
    supports: [
      "case_assistant",
      "household_chat",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
      "multimodal_verification",
    ],
    personalDataPolicy: "approval_required",
    description: "Paid secondary escalation only; disabled by default.",
  },
}

export type HorizonAiRouteInput = {
  workload: HorizonAiWorkload
  dataClass: HorizonAiDataClass
  availableProviders: readonly HorizonAiProviderId[]
  /** Local provider was explicitly approved for the current data class and task. */
  localPersonalDataApproved?: boolean
  /** Paid use is never implicit; this must be true before any paid provider can be returned. */
  paidEscalationApproved?: boolean
  /** A specific paid route is approved for personal/customer data. */
  paidPersonalDataApproved?: boolean
}

export type HorizonAiRouteDecision =
  | {
      status: "route"
      provider: HorizonAiProviderId
      costClass: HorizonAiCostClass
      reason: string
    }
  | {
      status: "blocked"
      reason:
        | "NO_APPROVED_PERSONAL_DATA_PROVIDER"
        | "NO_FREE_PROVIDER_AVAILABLE"
        | "NO_COMPATIBLE_PROVIDER"
        | "PAID_ESCALATION_NOT_APPROVED"
    }

const isPersonal = (dataClass: HorizonAiDataClass) =>
  dataClass === "personal_data" || dataClass === "sensitive_personal_data"

const availableAndSupports = (
  provider: HorizonAiProviderId,
  workload: HorizonAiWorkload,
  available: ReadonlySet<HorizonAiProviderId>,
) => available.has(provider) && HORIZON_AI_PROVIDERS[provider].supports.includes(workload)

const route = (provider: HorizonAiProviderId, reason: string): HorizonAiRouteDecision => ({
  status: "route",
  provider,
  costClass: HORIZON_AI_PROVIDERS[provider].costClass,
  reason,
})

export function routeHorizonAi(input: HorizonAiRouteInput): HorizonAiRouteDecision {
  const available = new Set(input.availableProviders)

  if (isPersonal(input.dataClass)) {
    if (
      input.localPersonalDataApproved &&
      availableAndSupports("local-selfhosted", input.workload, available)
    ) {
      return route("local-selfhosted", "approved zero-API-cost local personal-data route")
    }

    if (
      input.paidEscalationApproved &&
      input.paidPersonalDataApproved &&
      availableAndSupports("bedrock-paid-escalation", input.workload, available)
    ) {
      return route("bedrock-paid-escalation", "explicitly approved paid personal-data escalation")
    }

    // Do not silently move customer data to free external services because a
    // quota was exhausted. Free-tier availability is not a privacy approval.
    return { status: "blocked", reason: "NO_APPROVED_PERSONAL_DATA_PROVIDER" }
  }

  const freeOrder: readonly HorizonAiProviderId[] =
    input.workload === "multimodal_verification"
      ? ["groq-free", "local-selfhosted", "gemini-free-target", "openrouter-free-target"]
      : ["groq-free", "local-selfhosted", "gemini-free-target", "openrouter-free-target"]

  for (const provider of freeOrder) {
    if (availableAndSupports(provider, input.workload, available)) {
      return route(provider, "free-first compatible provider")
    }
  }

  // Cerebras is intentionally after durable free routes: current public access
  // is trial credit rather than a recurring free primary.
  if (availableAndSupports("cerebras-trial", input.workload, available)) {
    return route("cerebras-trial", "trial-credit specialist fallback")
  }

  const paidAvailable =
    availableAndSupports("bedrock-paid-escalation", input.workload, available) ||
    availableAndSupports("openai-paid-escalation", input.workload, available)

  if (paidAvailable && !input.paidEscalationApproved) {
    return { status: "blocked", reason: "PAID_ESCALATION_NOT_APPROVED" }
  }

  if (input.paidEscalationApproved) {
    for (const provider of ["bedrock-paid-escalation", "openai-paid-escalation"] as const) {
      if (availableAndSupports(provider, input.workload, available)) {
        return route(provider, "explicitly approved paid escalation")
      }
    }
  }

  if (input.availableProviders.length > 0) {
    return { status: "blocked", reason: "NO_FREE_PROVIDER_AVAILABLE" }
  }

  return { status: "blocked", reason: "NO_COMPATIBLE_PROVIDER" }
}
