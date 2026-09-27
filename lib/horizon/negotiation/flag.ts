/**
 * HORIZON NEGOTIATION — feature flag.
 *
 * `HORIZON_NEGOTIATION_ENABLED` is off unless it is explicitly configured to a
 * truthy value. When off, the negotiation surfaces are not offered and the API
 * routes refuse with `NEGOTIATION_DISABLED`; every pre-existing platform
 * behaviour is untouched.
 *
 * The value is read at call time rather than captured at module load, so a
 * server process that reads the environment per request stays correct and tests
 * can toggle it without reloading the module.
 */

const TRUTHY = new Set(["1", "true", "yes", "on"])

export function isNegotiationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.HORIZON_NEGOTIATION_ENABLED
  if (typeof raw !== "string") return false
  return TRUTHY.has(raw.trim().toLowerCase())
}

/** The single error code a disabled surface reports. */
export const NEGOTIATION_DISABLED_CODE = "NEGOTIATION_DISABLED"
