import { absoluteUrl, canonicalUrl, SITE_NAME, SITE_PUBLISHER, SITE_URL } from "./site"

/**
 * Schema.org JSON-LD builders.
 *
 * The platform previously emitted no structured data at all, so a search engine
 * had to guess whether this is a company, a blog or a tool. These builders state
 * it: who publishes the site, what the site is, and what each service does.
 *
 * Only values that are already public are emitted — the Impressum data and the
 * page's own copy. No user data, no internal identifier and no credential ever
 * reaches a response body, which is also why nothing here reads the database.
 */

export type JsonLd = Record<string, unknown>

/** The publisher, as a legal entity. */
export function organizationJsonLd(legal: {
  businessName: string
  representative: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_PUBLISHER,
    alternateName: SITE_NAME,
    url: SITE_URL,
    ...(legal.email ? { email: legal.email } : {}),
    ...(legal.phone ? { telephone: legal.phone } : {}),
    address: {
      "@type": "PostalAddress",
      ...(legal.street ? { streetAddress: legal.street } : {}),
      ...(legal.postalCode ? { postalCode: legal.postalCode } : {}),
      ...(legal.city ? { addressLocality: legal.city } : {}),
      ...(legal.country ? { addressCountry: "DE" } : {}),
    },
    ...(legal.representative ? { founder: { "@type": "Person", name: legal.representative } } : {}),
  }
}

/** The site itself, with the search action a browser can offer. */
export function webSiteJsonLd(locale: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: canonicalUrl("/", locale),
    inLanguage: locale === "de" ? "de-DE" : "bg-BG",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${canonicalUrl("/", locale)}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }
}

/** One page, as a document with a canonical identity. */
export function webPageJsonLd(input: {
  path: string
  locale: string
  title: string
  description: string
  /**
   * Paths this page is a companion to, emitted as `relatedLink`.
   *
   * A letter page and the guide that explains it answer the same search from two
   * angles. Naming the other page here tells a crawler the two belong together
   * rather than competing, which is the difference between the pair ranking once
   * and ranking not at all.
   */
  relatedPaths?: readonly string[]
}): JsonLd {
  const url = canonicalUrl(input.path, input.locale)
  const related = (input.relatedPaths ?? []).map((path) => canonicalUrl(path, input.locale))
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: input.title,
    description: input.description,
    inLanguage: input.locale === "de" ? "de-DE" : "bg-BG",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(related.length ? { relatedLink: related } : {}),
  }
}

/** A service the platform performs, pointing at the page that starts it. */
export function serviceJsonLd(input: { path: string; locale: string; name: string; description: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: canonicalUrl(input.path, input.locale),
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Deutschland" },
  }
}

/** A question and its answer, for the expandable answers on a guide page. */
export function faqJsonLd(items: ReadonlyArray<{ question: string; answer: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
}

/** A breadcrumb trail, so a result shows its place in the site. */
export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>, locale: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path, locale),
    })),
  }
}

/** An ordered list of articles, for the guide index. */
export function itemListJsonLd(input: {
  locale: string
  items: ReadonlyArray<{ name: string; path: string }>
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: canonicalUrl(item.path, input.locale),
    })),
  }
}

/** The logo used by the publisher, resolved to an absolute URL. */
export function organizationLogoUrl(): string {
  return absoluteUrl("/logo-horizon.png")
}
