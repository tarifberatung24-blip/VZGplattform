/**
 * Small pure helpers for affiliate click measurement, kept separate from the
 * route so they can be unit-tested without a Supabase client.
 */

export const affiliateLocales = ["bg", "de"] as const
export type AffiliateLocale = (typeof affiliateLocales)[number]

/**
 * Derive the request path from a Request URL. Returns null when the URL yields no
 * usable pathname.
 */
export function affiliatePathFromRequest(request: Request): string | null {
  try {
    const pathname = new URL(request.url).pathname
    return pathname || null
  } catch {
    return null
  }
}

/**
 * Read the locale segment from a path such as `/de/go/kfz`. Returns null when the
 * path has no recognised locale prefix (for example the unprefixed `/go/kfz`).
 */
export function affiliateLocaleFromPath(path: string | null): AffiliateLocale | null {
  if (!path) return null
  const segment = path.split("/").filter(Boolean)[0]
  return segment === "bg" || segment === "de" ? segment : null
}
