import { headers } from "next/headers"
import { defaultLocale, isLocale, type Locale } from "./dictionaries"

/**
 * The UI locale for the current request.
 *
 * The localized routes under `app/[locale]` get their locale from the route
 * segment; the non-localized server pages (which `proxy.ts` still redirects to a
 * locale) get it from the `x-locale` header the proxy sets from that segment.
 * Reading the header is therefore the one resolution that works for both, and it
 * is what `app/dashboard/page.tsx` and `app/za-nas/page.tsx` already do. The
 * fallback only covers a direct internal render with no proxy in front.
 */
export async function requestLocale(): Promise<Locale> {
  const routeLocale = (await headers()).get("x-locale")
  return isLocale(routeLocale) ? routeLocale : defaultLocale
}
