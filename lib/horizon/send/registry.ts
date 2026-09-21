/**
 * P11 — provider registry.
 *
 * At most one provider is active, and its key is recorded on every attempt so the
 * transport behind a delivery is always identifiable after the fact.
 *
 * The active transport is chosen here and nowhere else. When SMTP is fully
 * configured it is the SMTP provider; otherwise the active provider is
 * `unavailableProvider`: a real provider that truthfully reports it cannot send.
 * This is what makes "no credentials configured" a clean, testable state instead
 * of a crash or — far worse — a fabricated success.
 *
 * Nothing else in the pipeline changes when a transport is added, because the
 * engine never knows which transport it is using.
 */

import "server-only"

import type { EmailProvider, ProviderResult } from "./provider"
import { readSmtpConfig, type SmtpConfigResult } from "./smtp-config"
import { createSmtpProvider } from "./smtp-provider"

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
 * The SMTP configuration for this process, read once.
 *
 * Cached so that `resolveProvider` and `isSendProviderAvailable` cannot disagree
 * about whether a provider is configured, and so a send is never attempted
 * against a configuration that changed between the check and the send.
 *
 * `undefined` means "not read yet"; `null` means "read, and no usable provider".
 */
let cachedConfig: SmtpConfigResult | null | undefined

/** Reads and caches the SMTP configuration. Exposed for a redacted status display. */
export function smtpConfig(): SmtpConfigResult | null {
  if (cachedConfig === undefined) {
    const result = readSmtpConfig()
    cachedConfig = result.ok ? result : null
  }
  return cachedConfig
}

/**
 * The provider to use for this request.
 *
 * Returns the unavailable provider when SMTP is not fully configured. There is
 * deliberately no partial-credit path: a host without credentials, or credentials
 * without a sender, is treated as absent rather than as a best effort, because a
 * half-configured relay could hand a customer's documents to the wrong server or
 * send them in the clear.
 */
export async function resolveProvider(): Promise<EmailProvider> {
  const config = smtpConfig()
  if (!config) return unavailableProvider
  return createSmtpProvider(config)
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