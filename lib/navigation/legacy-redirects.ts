import { stripLocale } from "@/lib/i18n/routing"

/**
 * N7 legacy redirects, as approved in `docs/FINAL_SITE_MAP.md` §8.
 *
 * Each entry forwards an obsolete pre-HORIZON surface to its canonical destination. The map holds
 * only redirects; routes the site map marks KEEP (`/kindergeld`, `/za-nas`, `/app`, the lead-capture
 * pair) are deliberately absent and stay reachable. `/email-generator` is RETIRE-on-approval, not
 * approved yet, so it is absent too.
 *
 * The proxy applies these before the localized catch-all renders, so a bookmarked legacy URL lands
 * on the canonical route instead of the legacy page. Matching is exact on the stripped path: a
 * legacy page with real children (`/office/cases/[id]`) is handled by its own page, not here.
 */
export const legacyRedirects: Readonly<Record<string, string>> = {
  "/office": "/guide",
  "/check": "/dashboard",
  "/uslugi": "/functions",
  "/produkte": "/functions",
  "/tarife": "/versicherungen",
  "/protected/home-office": "/assistant",
  "/protected/security": "/konto/sicherheit",
  "/onboarding/language": "/onboarding/profile",
}

/** The canonical destination for a legacy path, or null when the path is not a redirect. */
export function legacyRedirectTarget(pathname: string): string | null {
  const path = stripLocale(pathname)
  const exact = legacyRedirects[path]
  if (exact) return exact

  // `/office/cases/{id}` is the KintexBG case detail. Office and HORIZON share the `cases` table
  // (both keyed on `owner_id`), so the case id is valid in the case workspace. Only a single path
  // segment is carried over and it is always re-prefixed, so nothing user-supplied reaches the host.
  const officeCase = path.match(/^\/office\/cases\/([^/]+)$/)
  if (officeCase) return `/guide/${officeCase[1]}`

  return null
}
