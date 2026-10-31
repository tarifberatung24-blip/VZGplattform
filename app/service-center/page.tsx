import { HorizonServiceCatalog } from "@/components/marketing/horizon-service-catalog"
import { requestLocale } from "@/lib/i18n/server-locale"

/**
 * The service center page.
 *
 * It lives at `app/service-center/page.tsx`, not under `app/[locale]`, because the
 * localized catch-all renders every entry in its `pages` map as a bare `<Page />`
 * with no props. Locale therefore comes from `requestLocale()`, which reads the
 * `x-locale` header the proxy sets from the route segment — the same resolution
 * `app/documents` and `app/steuer` already use. Only the catalogue is a client
 * component; the page frame stays on the server.
 */
export default async function ServiceCenterPage() {
  const locale = await requestLocale()

  return (
    <main className="min-h-screen bg-background pb-20 pt-24 text-foreground md:pt-28">
      <HorizonServiceCatalog locale={locale} />
    </main>
  )
}
