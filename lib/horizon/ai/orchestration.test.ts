import { describe, expect, it } from "vitest"
import {
  HORIZON_AI_FREE_MODEL_ALIASES,
  HORIZON_AI_PROVIDERS,
  routeHorizonAi,
} from "./orchestration"

describe("HORIZON AI FREE-FIRST provider routing policy", () => {
  it("uses Groq free first for non-sensitive workloads", () => {
    expect(
      routeHorizonAi({
        workload: "routing",
        dataClass: "repository",
        availableProviders: ["groq-free", "bedrock-paid-escalation"],
      }),
    ).toEqual({
      status: "route",
      provider: "groq-free",
      costClass: "free",
      reason: "free-first compatible provider",
    })
  })

  it("keeps strong/fast/multimodal free model aliases explicit", () => {
    expect(HORIZON_AI_FREE_MODEL_ALIASES.strong).toBe("openai/gpt-oss-120b")
    expect(HORIZON_AI_FREE_MODEL_ALIASES.fast).toBe("openai/gpt-oss-20b")
    expect(HORIZON_AI_FREE_MODEL_ALIASES.multimodal).toBe("qwen/qwen3.8-27b")
  })

  it("does not allow a paid provider unless paid escalation is explicit", () => {
    expect(
      routeHorizonAi({
        workload: "case_assistant",
        dataClass: "user_non_sensitive",
        availableProviders: ["bedrock-paid-escalation"],
      }),
    ).toEqual({ status: "blocked", reason: "PAID_ESCALATION_NOT_APPROVED" })
  })

  it("allows paid escalation only after explicit approval", () => {
    expect(
      routeHorizonAi({
        workload: "case_assistant",
        dataClass: "user_non_sensitive",
        availableProviders: ["bedrock-paid-escalation"],
        paidEscalationApproved: true,
      }),
    ).toEqual({
      status: "route",
      provider: "bedrock-paid-escalation",
      costClass: "paid",
      reason: "explicitly approved paid escalation",
    })
  })

  it("fails closed for personal data instead of sending it to free external fallbacks", () => {
    expect(
      routeHorizonAi({
        workload: "document_analysis",
        dataClass: "sensitive_personal_data",
        availableProviders: ["groq-free", "gemini-free-target", "openrouter-free-target"],
      }),
    ).toEqual({ status: "blocked", reason: "NO_APPROVED_PERSONAL_DATA_PROVIDER" })
  })

  it("prefers a verified local model for personal data at zero API cost", () => {
    expect(
      routeHorizonAi({
        workload: "document_analysis",
        dataClass: "personal_data",
        availableProviders: ["local-selfhosted", "bedrock-paid-escalation"],
        localPersonalDataApproved: true,
      }),
    ).toEqual({
      status: "route",
      provider: "local-selfhosted",
      costClass: "free",
      reason: "approved zero-API-cost local personal-data route",
    })
  })

  it("treats Gemini/OpenRouter as free targets, not implemented current runtime", () => {
    expect(HORIZON_AI_PROVIDERS["gemini-free-target"].costClass).toBe("free")
    expect(HORIZON_AI_PROVIDERS["gemini-free-target"].transport).toBe("not_implemented")
    expect(HORIZON_AI_PROVIDERS["openrouter-free-target"].costClass).toBe("free")
    expect(HORIZON_AI_PROVIDERS["openrouter-free-target"].transport).toBe("not_implemented")
  })

  it("does not mislabel Cerebras trial credit as durable free", () => {
    expect(HORIZON_AI_PROVIDERS["cerebras-trial"].costClass).toBe("trial_credit")
  })
})
