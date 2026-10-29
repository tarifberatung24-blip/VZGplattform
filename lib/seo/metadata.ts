import type { Metadata } from "next"
import { absoluteUrl, canonicalUrl, SITE_NAME } from "./site"

/**
 * Per-page metadata, in one place.
 *
 * The site emitted no `canonical` and no `hreflang` at all, and only three Open
 * Graph tags. Two problems followed. A page reachable as both `/bg/kindergeld`
 * and `/de/kindergeld` had nothing telling a search engine which document each
 * URL was, so the pair competed with itself; and a shared link rendered as a bare
 * title with no description or image.
 *
 * Every public page now goes through here, so the four facts a crawler needs —
 * canonical URL, language alternates, social preview and card type — cannot drift
 * apart between pages.
 */

const OG_LOCALE: Record<string, string> = { bg: "bg_BG", de: "de_DE" }
const HTML_LANG: Record<string, string> = { bg: "bg-BG", de: "de-DE" }

export function pageMetadata(input: {
  path: string
  locale: string
  title: string
  description: string
  keywords?: string[]
  /** `article` for a guide page, so a share shows it as content rather than a site root. */
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  /** Absolute URL of a page-specific image; defaults to the brand logo. */
  imagePath?: string
}): Metadata {
  const { path, locale, title, description } = input
  const canonical = canonicalUrl(path, locale)
  const image = absoluteUrl(input.imagePath ?? "/logo-horizon.png")

  return {
    title,
    description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: {
      canonical,
      languages: {
        bg: canonicalUrl(path, "bg"),
        de: canonicalUrl(path, "de"),
        // A single unqualified `x-default` entry would point every unmatched
        // language at one locale. The product is Bulgarian-first, so that is `bg`.
        "x-default": canonicalUrl(path, "bg"),
      },
    },
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale] ?? OG_LOCALE.bg,
      alternateLocale: Object.entries(OG_LOCALE)
        .filter(([code]) => code !== locale)
        .map(([, value]) => value),
      images: [{ url: image, width: 1217, height: 174, alt: SITE_NAME }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

/** The `lang` value for a locale, for JSON-LD and the document element. */
export function htmlLang(locale: string): string {
  return HTML_LANG[locale] ?? HTML_LANG.bg
}
