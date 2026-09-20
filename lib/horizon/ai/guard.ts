import {
  HORIZON_AI_CAPABILITIES,
  HORIZON_AI_FORBIDDEN_DECISIONS,
  isHorizonAiCapability,
  type HorizonAiCapability,
  type HorizonAiForbiddenDecision,
} from "./registry"
import { capabilitiesForModule } from "./module-rails"

/**
 * P7 — assistant guard rails.
 *
 * Enforcement is structural, not textual. The capability set is closed and
 * contains no member that authorizes, approves, sends, does arithmetic, or
 * reaches across tenants, so there is no request shape that reaches the model
 * and produces one of those decisions. Adding such a capability requires editing
 * the registry — a visible change — rather than finding phrasing that talks the
 * model into it.
 *
 * Text is deliberately NOT screened with keyword patterns. A pattern strong
 * enough to catch "approve this for me" also fires on "explain the letter the
 * authority sent me", so it would break ordinary explanation while giving false
 * assurance. The control that actually holds is that the action does not exist
 * to be invoked: approval is a user-driven, hash-bound database write (P8) and
 * sending is a separate engine (P11) with its own approval gate.
 */

export type GuardRejection =
  | { code: "unknown_capability"; capability: unknown }
  | { code: "capability_not_allowed_for_module"; capability: HorizonAiCapability; module: string }

export function screenRequest(input: {
  capability: unknown
  module: string
}): { ok: true; capability: HorizonAiCapability } | { ok: false; rejection: GuardRejection } {
  if (!isHorizonAiCapability(input.capability)) {
    return { ok: false, rejection: { code: "unknown_capability", capability: input.capability } }
  }
  if (!capabilitiesForModule(input.module).includes(input.capability)) {
    return {
      ok: false,
      rejection: {
        code: "capability_not_allowed_for_module",
        capability: input.capability,
        module: input.module,
      },
    }
  }
  return { ok: true, capability: input.capability }
}

/**
 * Asserts that the allowed set stays disjoint from the forbidden decisions.
 * Exported so a test can prove it; if someone later adds an "approve"
 * capability, this is where it is caught.
 */
export const FORBIDDEN_DECISIONS: readonly HorizonAiForbiddenDecision[] =
  HORIZON_AI_FORBIDDEN_DECISIONS

export function capabilitiesInvokeForbiddenDecision(): HorizonAiCapability[] {
  const forbidden = new Set<string>(HORIZON_AI_FORBIDDEN_DECISIONS)
  return HORIZON_AI_CAPABILITIES.filter((capability) => forbidden.has(capability))
}

export const ALL_CAPABILITIES = HORIZON_AI_CAPABILITIES