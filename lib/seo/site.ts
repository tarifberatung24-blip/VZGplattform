/**
 * Canonical origin and identity constants for search engines.
 *
 * `metadataBase`, `sitemap.ts` and `robots.ts` each carried their own copy of the
 * host, so a change of domain would have had to be made in three places and a
 * missed one would emit sitemap URLs pointing at the old host. Everything now
 * resolves through here, and `NEXT_PUBLIC_SITE_URL` overrides the default without
 * a code change.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://vzgplattform.onrender.com").replace(/\/+$/, "")

export const SITE_NAME = "HORIZON by VZG"

/** The legal entity behind the product, as named on the Impressum. */
export const SITE_PUBLISHER = "Tarifberater24"

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * The canonical URL of a localized path.
 *
 * Every public page is reachable under both locales, so each one is a distinct
 * document rather than a duplicate: the canonical points at the same locale it
 * was rendered in, never at the other one.
 */
export function canonicalUrl(path: string, locale: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`
  return absoluteUrl(`/${locale}${clean}`)
}
