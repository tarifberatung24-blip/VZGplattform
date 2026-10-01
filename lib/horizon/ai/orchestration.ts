/**
 * HORIZON AI orchestration policy.
 *
 * This file is deliberately provider-neutral and contains no SDK client,
 * credential lookup, network call, or customer data. It defines the allowed
 * routing decisions that provider adapters must obey.
 *
 * The important boundary is:
 *   policy decides WHETHER a provider may be used;
 *   an adapter decides HOW to call that provider.
 *
 * Provider changes for personal/customer data are never silent. If the
 * approved personal-data route is unavailable, the policy fails closed.
 */

export const HORIZON_AI_PROVIDER_IDS = [
  "gateway-bedrock",
  "gateway-openai",
  "gateway-vertex",
  "groq-legacy",
  "cerebras-legacy",
  "openrouter-declared-only",
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
  | "target_primary"
  | "target_secondary"
  | "target_specialist"
  | "legacy_runtime"
  | "declared_only"

export type HorizonAiProviderPolicy = {
  id: HorizonAiProviderId
  stage: HorizonAiProviderStage
  transport: "litellm_gateway" | "direct_legacy" | "none"
  supports: readonly HorizonAiWorkload[]
  personalDataPolicy: "approved_only" | "not_default" | "legacy_existing" | "forbidden"
  description: string
}

export const HORIZON_AI_PROVIDERS: Readonly<Record<HorizonAiProviderId, HorizonAiProviderPolicy>> = {
  "gateway-bedrock": {
    id: "gateway-bedrock",
    stage: "target_primary",
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
    personalDataPolicy: "approved_only",
    description: "Target primary route through the provider-neutral HORIZON LiteLLM gateway.",
  },
  "gateway-openai": {
    id: "gateway-openai",
    stage: "target_secondary",
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
    personalDataPolicy: "not_default",
    description: "Secondary provider for approved non-PII/repository workloads unless separately approved.",
  },
  "gateway-vertex": {
    id: "gateway-vertex",
    stage: "target_specialist",
    transport: "litellm_gateway",
    supports: ["structured_extraction", "routing", "multimodal_verification"],
    personalDataPolicy: "not_default",
    description: "Target low-cost/multimodal verification provider behind the same gateway.",
  },
  "groq-legacy": {
    id: "groq-legacy",
    stage: "legacy_runtime",
    transport: "direct_legacy",
    supports: [
      "case_assistant",
      "household_chat",
      "document_analysis",
      "structured_extraction",
      "routing",
      "missing_info",
      "drafting",
    ],
    personalDataPolicy: "legacy_existing",
    description: "Current direct provider. Preserve during migration; do not expand its authority silently.",
  },
  "cerebras-legacy": {
    id: "cerebras-legacy",
    stage: "legacy_runtime",
    transport: "direct_legacy",
    supports: ["document_analysis", "multimodal_verification"],
    personalDataPolicy: "legacy_existing",
    description: "Current specialist document-analysis path. Preserve until the gateway replacement is verified.",
  },
  "openrouter-declared-only": {
    id: "openrouter-declared-only",
    stage: "declared_only",
    transport: "none",
    supports: [],
    personalDataPolicy: "forbidden",
    description: "Environment variables exist, but no runtime client is implemented. Never route traffic here.",
  },
}

export type HorizonAiRouteInput = {
  workload: HorizonAiWorkload
  dataClass: HorizonAiDataClass
  availableProviders: readonly HorizonAiProviderId[]
  /**
   * Explicit governance decision that the primary gateway route is approved for
   * customer personal data. Merely having credentials is not approval.
   */
  personalDataPrimaryApproved?: boolean
}

export type HorizonAiRouteDecision =
  | {
      status: "route"
      provider: HorizonAiProviderId
      reason: string
    }
  | {
      status: "blocked"
      reason:
        | "NO_APPROVED_PERSONAL_DATA_PROVIDER"
        | "NO_COMPATIBLE_PROVIDER"
        | "DECLARED_ONLY_PROVIDER"
    }

const isPersonal = (dataClass: HorizonAiDataClass) =>
  dataClass === "personal_data" || dataClass === "sensitive_personal_data"

const availableAndSupports = (
  provider: HorizonAiProviderId,
  workload: HorizonAiWorkload,
  available: ReadonlySet<HorizonAiProviderId>,
) => available.has(provider) && HORIZON_AI_PROVIDERS[provider].supports.includes(workload)

export function routeHorizonAi(input: HorizonAiRouteInput): HorizonAiRouteDecision {
  const available = new Set(input.availableProviders)

  if (isPersonal(input.dataClass)) {
    if (
      input.personalDataPrimaryApproved &&
      availableAndSupports("gateway-bedrock", input.workload, available)
    ) {
      return {
        status: "route",
        provider: "gateway-bedrock",
        reason: "approved primary personal-data route",
      }
    }

    // Deliberately no automatic OpenAI/Vertex/provider swap for customer data.
    // A different processor/subprocessor/geography/retention contract requires
    // a separate governance decision, not a retry branch.
    return { status: "blocked", reason: "NO_APPROVED_PERSONAL_DATA_PROVIDER" }
  }

  const order: readonly HorizonAiProviderId[] =
    input.workload === "multimodal_verification"
      ? ["gateway-vertex", "gateway-bedrock", "gateway-openai", "cerebras-legacy", "groq-legacy"]
      : ["gateway-bedrock", "gateway-openai", "gateway-vertex", "groq-legacy", "cerebras-legacy"]

  for (const provider of order) {
    if (availableAndSupports(provider, input.workload, available)) {
      return { status: "route", provider, reason: "highest-priority compatible provider" }
    }
  }

  if (available.has("openrouter-declared-only")) {
    return { status: "blocked", reason: "DECLARED_ONLY_PROVIDER" }
  }

  return { status: "blocked", reason: "NO_COMPATIBLE_PROVIDER" }
}
