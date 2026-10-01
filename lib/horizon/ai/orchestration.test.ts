import { describe, expect, it } from "vitest"
import {
  HORIZON_AI_PROVIDERS,
  routeHorizonAi,
} from "./orchestration"

describe("HORIZON AI provider routing policy", () => {
  it("fails closed for personal data when the approved primary route is unavailable", () => {
    expect(
      routeHorizonAi({
        workload: "case_assistant",
        dataClass: "personal_data",
        availableProviders: ["gateway-openai", "gateway-vertex", "groq-legacy"],
        personalDataPrimaryApproved: false,
      }),
    ).toEqual({ status: "blocked", reason: "NO_APPROVED_PERSONAL_DATA_PROVIDER" })
  })

  it("routes personal data only to the explicitly approved primary provider", () => {
    expect(
      routeHorizonAi({
        workload: "document_analysis",
        dataClass: "sensitive_personal_data",
        availableProviders: ["gateway-bedrock", "gateway-openai"],
        personalDataPrimaryApproved: true,
      }),
    ).toEqual({
      status: "route",
      provider: "gateway-bedrock",
      reason: "approved primary personal-data route",
    })
  })

  it("uses provider-neutral fallback for non-personal workloads", () => {
    expect(
      routeHorizonAi({
        workload: "routing",
        dataClass: "repository",
        availableProviders: ["gateway-openai", "groq-legacy"],
      }),
    ).toEqual({
      status: "route",
      provider: "gateway-openai",
      reason: "highest-priority compatible provider",
    })
  })

  it("prefers the verifier route for non-personal multimodal verification", () => {
    expect(
      routeHorizonAi({
        workload: "multimodal_verification",
        dataClass: "public",
        availableProviders: ["gateway-bedrock", "gateway-vertex"],
      }),
    ).toEqual({
      status: "route",
      provider: "gateway-vertex",
      reason: "highest-priority compatible provider",
    })
  })

  it("never treats declared-only OpenRouter config as an implemented provider", () => {
    expect(HORIZON_AI_PROVIDERS["openrouter-declared-only"].transport).toBe("none")
    expect(
      routeHorizonAi({
        workload: "case_assistant",
        dataClass: "public",
        availableProviders: ["openrouter-declared-only"],
      }),
    ).toEqual({ status: "blocked", reason: "DECLARED_ONLY_PROVIDER" })
  })

  it("does not expand legacy provider authority during migration", () => {
    expect(HORIZON_AI_PROVIDERS["groq-legacy"].stage).toBe("legacy_runtime")
    expect(HORIZON_AI_PROVIDERS["cerebras-legacy"].stage).toBe("legacy_runtime")
    expect(HORIZON_AI_PROVIDERS["groq-legacy"].personalDataPolicy).toBe("legacy_existing")
  })
})
