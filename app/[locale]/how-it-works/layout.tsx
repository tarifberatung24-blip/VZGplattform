import type { Metadata } from "next"
import { isLocale, defaultLocale } from "@/lib/i18n/dictionaries"
import { pageMetadata } from "@/lib/seo/metadata"
import { publicPageMetaFor } from "@/lib/seo/public-pages"

/**
 * Metadata for a public page that owns its own route rather than rendering through
 * the localized catch-all.
 *
 * The page itself is a client component, so it cannot export `metadata`; this layout
 * is a server component and can. Without it the route fell back to the locale
 * layout's default title, which is the same string every public page would show.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : defaultLocale
  const meta = publicPageMetaFor("how-it-works")
  if (!meta) return {}
  return pageMetadata({
    path: "/how-it-works",
    locale,
    title: meta.title[locale],
    description: meta.description[locale],
    keywords: meta.keywords?.[locale],
  })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
