/**
 * Pure helpers that tie an outbound partner click to the HORIZON user and the
 * Optimize session it came from. Kept free of Supabase so they are unit-tested
 * directly.
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && uuidPattern.test(value)
}

/** Query parameter that carries the Optimize session id through `/go/{offer}`. */
export const OPTIMIZE_SESSION_PARAM = "s"

/**
 * Internal redirect path for a confirmed Optimize session. The customer always
 * leaves through `/go/{offer}` so the click is measured and attributed.
 */
export function optimizeGoPath(offerId: string, sessionId: string): string {
  return `/go/${encodeURIComponent(offerId)}?${OPTIMIZE_SESSION_PARAM}=${encodeURIComponent(sessionId)}`
}

/** Read a well-formed Optimize session id from a `/go` request, or null. */
export function optimizeSessionFromRequest(request: Request): string | null {
  try {
    const value = new URL(request.url).searchParams.get(OPTIMIZE_SESSION_PARAM)
    return isUuid(value) ? value : null
  } catch {
    return null
  }
}

/**
 * The partner deeplink, with the click id appended only when the partner
 * program documents a sub-ID parameter. Without one the exact configured
 * deeplink is returned, so commission attribution stays as the partner set it.
 */
export function buildPartnerUrl(deeplink: string, subIdParam: string | undefined, clickId: string | null): string {
  if (!subIdParam || !clickId) return deeplink
  try {
    const url = new URL(deeplink)
    url.searchParams.set(subIdParam, clickId)
    return url.toString()
  } catch {
    return deeplink
  }
}
