import { describe, expect, it } from "vitest"
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, webPageJsonLd, webSiteJsonLd } from "./json-ld"
import { pageMetadata } from "./metadata"
import { SITE_URL, absoluteUrl, canonicalUrl } from "./site"

const legal = {
  businessName: "Tarifberater24",
  representative: "Svetlozar Gitsov",
  street: "Hospitalstraße 30",
  postalCode: "66798",
  city: "Wallerfangen",
  country: "Deutschland",
  email: "tarifberatung24@gmail.com",
  phone: "+49 157 50171967",
}

describe("site urls", () => {
  it("builds an absolute url from a relative path", () => {
    expect(absoluteUrl("/bg")).toBe(`${SITE_URL}/bg`)
    expect(absoluteUrl("bg")).toBe(`${SITE_URL}/bg`)
  })

  it("keeps the canonical url inside the locale it was rendered for", () => {
    // Both locales are distinct documents. A canonical that pointed across locales
    // would tell a crawler the German page is a duplicate of the Bulgarian one.
    expect(canonicalUrl("/kindergeld", "bg")).toBe(`${SITE_URL}/bg/kindergeld`)
    expect(canonicalUrl("/kindergeld", "de")).toBe(`${SITE_URL}/de/kindergeld`)
    expect(canonicalUrl("/", "de")).toBe(`${SITE_URL}/de`)
  })
})

describe("page metadata", () => {
  const meta = pageMetadata({ path: "/kindergeld", locale: "de", title: "Kindergeld", description: "Antrag vorbereiten." })

  it("declares a canonical url and both language alternates", () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/de/kindergeld`)
    const languages = meta.alternates?.languages as Record<string, string>
    expect(languages.bg).toBe(`${SITE_URL}/bg/kindergeld`)
    expect(languages.de).toBe(`${SITE_URL}/de/kindergeld`)
    expect(languages["x-default"]).toBe(`${SITE_URL}/bg/kindergeld`)
  })

  it("carries a social preview, so a shared link is not bare", () => {
    expect(meta.openGraph?.title).toBe("Kindergeld")
    expect(meta.openGraph?.siteName).toBeTruthy()
    expect((meta.openGraph as { images?: unknown[] }).images?.length).toBe(1)
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image")
  })

  it("marks the other locale as the alternate social locale", () => {
    expect(meta.openGraph?.locale).toBe("de_DE")
    expect(meta.openGraph?.alternateLocale).toEqual(["bg_BG"])
  })

  it("defaults to the brand logo when no page image is given", () => {
    const images = (meta.openGraph as { images: { url: string }[] }).images
    expect(images[0].url).toBe(`${SITE_URL}/logo-horizon.png`)
  })
})

describe("json-ld", () => {
  it("identifies the publisher from the public impressum data", () => {
    const data = organizationJsonLd(legal)
    expect(data["@type"]).toBe("Organization")
    expect(data.name).toBe("Tarifberater24")
    expect((data.address as Record<string, string>).addressLocality).toBe("Wallerfangen")
  })

  it("never emits an empty property for a value the profile does not have", () => {
    const data = organizationJsonLd({ ...legal, email: "", phone: "" })
    expect("email" in data).toBe(false)
    expect("telephone" in data).toBe(false)
  })

  it("states the locale of the page and its place in the site", () => {
    const data = webPageJsonLd({ path: "/ratgeber/jobcenter", locale: "bg", title: "Jobcenter", description: "Bürgergeld." })
    expect(data.inLanguage).toBe("bg-BG")
    expect(data.url).toBe(`${SITE_URL}/bg/ratgeber/jobcenter`)
    expect(data.isPartOf).toEqual({ "@id": `${SITE_URL}/#website` })
  })

  it("maps the locale to the right language tag", () => {
    expect(webSiteJsonLd("de").inLanguage).toBe("de-DE")
    expect(webSiteJsonLd("bg").inLanguage).toBe("bg-BG")
  })

  it("numbers the faq answers and the breadcrumb positions from one", () => {
    const faq = faqJsonLd([{ question: "Frage?", answer: "Antwort." }])
    expect((faq.mainEntity as unknown[]).length).toBe(1)

    const crumbs = breadcrumbJsonLd([{ name: "Startseite", path: "/" }, { name: "Ratgeber", path: "/ratgeber" }], "de")
    const items = crumbs.itemListElement as { position: number; item: string }[]
    expect(items.map((item) => item.position)).toEqual([1, 2])
    expect(items[0].item).toBe(`${SITE_URL}/de`)
  })
})
