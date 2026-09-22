import type { Metadata } from "next"
import { CircleAlert } from "lucide-react"
import { InsuranceProductCard } from "@/components/affiliate/insurance-product-card"
import { insuranceHubCopy, insuranceProductContent } from "@/components/affiliate/insurance-content"
import { getAffiliateOffer } from "@/lib/affiliate-offers"
import { affiliateDisclosureFor } from "@/lib/affiliate-disclosure"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Versicherungen",
  description: "Versicherungsprodukte von HORIZON by VZG — Firmenversicherung und Kfz-Versicherung.",
}

const insuranceProductOrder = ["business-insurance", "kfz"] as const

export default async function VersicherungenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "bg"
  const copy = insuranceHubCopy[locale]

  const products = insuranceProductOrder.map((id) => {
    const offer = getAffiliateOffer(id)
    const content = insuranceProductContent[id]
    return {
      id,
      content,
      // Only an approved, configured partner is offered; otherwise the tile is
      // presented as a product without an approved partner.
      status: offer.isConfigured ? ("active" as const) : ("planned" as const),
    }
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8 md:py-24">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
          <h1 className="mt-6 text-balance text-4xl font-black tracking-[-0.05em] text-foreground md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{copy.intro}</p>
        </header>

        <section className="mt-16" aria-labelledby="insurance-products">
          <h2 id="insurance-products" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {copy.productsTitle}
          </h2>
          <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-2">
            {products.map((product) => (
              <InsuranceProductCard
                key={product.id}
                title={product.content[locale].name}
                description={product.content[locale].summary}
                icon={<product.content.icon className="size-6" />}
                href={`/${locale}${product.content.href}`}
                status={product.status}
                statusLabel={product.status === "active" ? copy.activeLabel : copy.plannedLabel}
                ctaLabel={product.content[locale].cta}
                details={product.content[locale].details}
                footnote={product.status === "active" ? copy.partnerNote : copy.plannedNote}
              />
            ))}
          </div>
        </section>

        <section className="mt-12 flex items-start gap-3 border border-border bg-card p-5 text-sm leading-7 text-muted-foreground">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <span>{copy.notice}</span>
        </section>

        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-7 text-foreground">
          {affiliateDisclosureFor(locale)}
        </p>
      </div>
    </main>
  )
}
