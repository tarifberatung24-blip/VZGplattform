/**
 * P7 — model and prompt version registry.
 *
 * Every assistant output records which model and which prompt version produced
 * it, so a stored draft or message can be traced back to the exact
 * configuration that generated it. Versions are literals here rather than
 * inline strings at the call site, so changing a prompt is a visible edit to
 * this file rather than a silent behaviour change scattered across routes.
 *
 * Bumping a version is the way to change assistant behaviour. A prompt edit
 * without a version bump is a defect: two different outputs would claim the
 * same provenance.
 */

export const HORIZON_AI_MODEL = "openai/gpt-oss-20b" as const

export const HORIZON_PROMPT_VERSIONS = {
  /** Case-scoped assistant: explains, translates, summarizes within one case. */
  caseAssistant: "horizon-case-assistant-v1",
  /** Missing-information interviewer: asks about required facts only. */
  missingInfoInterviewer: "horizon-missing-info-interviewer-v1",
  /** Routes a free message to a language and an intent. */
  languageRouter: "horizon-language-router-v1",
  /** Produces a German draft from confirmed facts. */
  draftGenerator: "horizon-draft-generator-v1",
} as const

export type HorizonPromptId = keyof typeof HORIZON_PROMPT_VERSIONS

export type AiProvenance = {
  model: string
  promptVersion: string
}

export function provenance(promptId: HorizonPromptId): AiProvenance {
  return { model: HORIZON_AI_MODEL, promptVersion: HORIZON_PROMPT_VERSIONS[promptId] }
}

/**
 * Output shapes the assistant is permitted to produce. This is the closed list:
 * a capability not named here cannot be requested through the assistant.
 */
export const HORIZON_AI_CAPABILITIES = [
  "explain",
  "translate",
  "extract_assist",
  "ask_missing_questions",
  "draft",
  "summarize",
] as const

export type HorizonAiCapability = (typeof HORIZON_AI_CAPABILITIES)[number]

export function isHorizonAiCapability(value: unknown): value is HorizonAiCapability {
  return typeof value === "string" && (HORIZON_AI_CAPABILITIES as readonly string[]).includes(value)
}

/**
 * Decisions the assistant is never permitted to make, however it is prompted.
 * These are enforced in application code, not by asking the model to behave:
 * an instruction in a prompt is not a control.
 */
export const HORIZON_AI_FORBIDDEN_DECISIONS = [
  "authorization",
  "user_approval",
  "send_execution",
  "deterministic_arithmetic",
  "tenant_access",
] as const

export type HorizonAiForbiddenDecision = (typeof HORIZON_AI_FORBIDDEN_DECISIONS)[number]