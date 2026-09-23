import { headers } from "next/headers"
import { FinanceModulePage } from "@/components/finance/module-page"
import { getDictionary, isLocale, defaultLocale } from "@/lib/i18n/dictionaries"

/**
 * `za-nas` sits outside app/[locale], so the locale is not a route param. proxy.ts sets the
 * x-locale header from the resolved route segment; without it this page fell back to German
 * for every visitor. The unprefixed route is still redirected to a locale by proxy.ts, so the
 * fallback only covers a direct internal render.
 */
export default async function AboutPage() {
  const routeLocale = (await headers()).get("x-locale")
  const locale = isLocale(routeLocale) ? routeLocale : defaultLocale
  const text = getDictionary(locale).cleanup
  return <FinanceModulePage title={text.about.title} description={text.about.description} items={text.documents.items} />
}
