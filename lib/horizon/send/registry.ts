/**
 * P11 — provider registry.
 *
 * At most one provider is active, and its key is recorded on every attempt so the
 * transport behind a delivery is always identifiable after the fact.
 *
 * The repository has no mail dependency, and adding one is an owner decision, not
 * an implementation detail. So the default active provider is
 * `unavailableProvider`: a real provider that truthfully reports it cannot send.
 * This is what makes "no credentials configured" a clean, testable state instead
 * of a crash or — far worse — a fabricated success.
 *
 * A real transport is added by implementing `EmailProvider` and registering it
 * here together with its required configuration. Nothing else in the pipeline
 * changes, because the engine never knows which transport it is using.
 */

import "server-only"

import type { EmailProvider, ProviderResult } from "./provider"

/**
 * Reports unavailability rather than failing.
 *
 * `send` is implemented even though it should never be reached for this
 * provider, so that a mis-wired call still yields a truthful `UNAVAILABLE`
 * instead of an exception or an implied success.
 */
export const unavailableProvider: EmailProvider = {
  key: "none",
  displayName: "Kein E-Mail-Anbieter konfiguriert",
  async isAvailable() {
    return false
  },
  async send(): Promise<ProviderResult> {
    return {
      status: "UNAVAILABLE",
      reason: "no_provider_configured",
    }
  },
}

/**
 * The provider to use for this request.
 *
 * Returns the unavailable provider when nothing is configured. It deliberately
 * does not fall back to a "best effort" or a logged-only sender: a send that
 * cannot actually happen must be reported as such, never simulated.
 */
export async function resolveProvider(): Promise<EmailProvider> {
  return unavailableProvider
}

/**
 * Whether a provider that can actually transmit is configured.
 *
 * Used before an attempt row is created, so that an unconfigured deployment
 * produces a `PROVIDER_UNAVAILABLE` outcome with no half-written attempt, no
 * consumed idempotency key, and no misleading "queued" state.
 */
export async function isSendProviderAvailable(): Promise<boolean> {
  const provider = await resolveProvider()
  return provider.isAvailable()
}