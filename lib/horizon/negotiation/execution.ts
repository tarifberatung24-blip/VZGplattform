/**
 * HORIZON NEGOTIATION — execution modes and the provider adapter seam.
 *
 * Three modes are designed; only two are usable in this build.
 *
 *   MODE A — SELF      HORIZON prepares the package; the user executes it.
 *   MODE B — ASSISTED  HORIZON prepares it for a VZG operator via the existing
 *                      service-request infrastructure, with an authorization
 *                      document when representation is legally required.
 *   MODE C — AUTOMATED adapter interface only. DISABLED.
 *
 * The adapter interface below exists so a future approved provider API can be
 * plugged in. Nothing here calls a provider, sends a message, accepts an offer,
 * or impersonates the customer. `AUTOMATED_EXECUTION_ENABLED` is a hard `false`
 * and there is no environment variable that can flip it, because enabling it
 * requires a provider/API agreement and a legal authorization decision that this
 * build does not have.
 */

import type { ExecutionMode } from "./contract"

/** Hard-disabled. Not configurable, by design. */
export const AUTOMATED_EXECUTION_ENABLED = false

export type NegotiationPackage = {
  mode: ExecutionMode
  /** The dossier-derived plan, in structured form. */
  plan: {
    primaryAsk: string | null
    fallbackAsk: string | null
    walkAwayCondition: string | null
    switchAlternative: string | null
  }
  /** Prepared artefacts. Each is null when it has not been generated. */
  phoneScript: string | null
  email: string | null
  contactFormText: string | null
  chatMessage: string | null
  checklist: string[]
  /** Facts the user must supply before sending, if any. */
  requiredBeforeSend: string[]
}

/** What a caller may request from a provider adapter. Deliberately read-only. */
export type ProviderAdapterCapability =
  | "supports_delegated_auth"
  | "supports_offer_query"
  | "supports_offer_accept"

export type ProviderAdapter = {
  /** Stable provider key. */
  providerKey: string
  /** Which capabilities this adapter actually implements. */
  capabilities: ProviderAdapterCapability[]
  /**
   * A delegated-access check. Returns false until a real, approved mechanism
   * exists. A caller must treat false as "no automated path".
   */
  isDelegatedAccessAvailable(): boolean
}

/**
 * The only adapter this build ships: a null adapter that implements nothing.
 * It exists so the seam is real and typed, not so it can be used.
 */
export const NULL_PROVIDER_ADAPTER: ProviderAdapter = {
  providerKey: "none",
  capabilities: [],
  isDelegatedAccessAvailable: () => false,
}

export function canExecuteAutomatically(adapter: ProviderAdapter | null): boolean {
  if (!AUTOMATED_EXECUTION_ENABLED) return false
  if (!adapter) return false
  return adapter.isDelegatedAccessAvailable()
}

/** The empty package a session starts with; artefacts are filled in per mode. */
export function emptyPackage(mode: ExecutionMode): NegotiationPackage {
  return {
    mode,
    plan: { primaryAsk: null, fallbackAsk: null, walkAwayCondition: null, switchAlternative: null },
    phoneScript: null,
    email: null,
    contactFormText: null,
    chatMessage: null,
    checklist: [],
    requiredBeforeSend: [],
  }
}
