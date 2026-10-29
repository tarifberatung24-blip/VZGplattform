import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, CircleAlert, ExternalLink, HelpCircle, Info } from "lucide-react"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { legalProfile } from "@/lib/legal-profile"
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, serviceJsonLd, webPageJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"
import { canonicalUrl } from "@/lib/seo/site"
import { findGuideTopic, guidePath } from "@/lib/ratgeber"
import { VORLAGE_INDEX_PATH, findVorlage, guideForVorlage, vorlagePath, vorlagen } from "@/lib/horizon/vorlagen"
import { VorlageForm } from "./vorlage-form"

type Props = { params: Promise<{ locale: string; slug: string }> }

// The templates are finite and fully enumerated by `generateStaticParams`, so a slug
// outside the set is not a page at all. Without this the router would render an
// unknown slug on demand and `notFound()` would only swap the body, leaving the
// status at 200 — a soft 404 a crawler records as a real page and keeps requesting.
export const dynamicParams = false

export function generateStaticParams() {
  return ["bg", "de"].flatMap((locale) => vorlagen.map((template) => ({ locale, slug: template.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const template = findVorlage(slug)
  if (!template) return {}
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const content = template.content[locale]
  return pageMetadata({
    path: vorlagePath(slug),
    locale,
    title: content.title,
    description: content.summary,
    keywords: [...template.keywords[locale], template.germanName],
    type: "article",
  })
}

export default async function VorlagePage({ params }: Props) {
  const { locale: raw, slug } = await params
  const template = findVorlage(slug)
  if (!template) notFound()
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const content = template.content[locale]
  const isBg = locale === "bg"

  const indexLabel = isBg ? "Готови писма" : "Fertige Briefe"
  const otherTemplates = vorlagen.filter((item) => item.slug !== slug).slice(0, 3)

  // The guide that explains the rule behind the letter. The guide pages already
  // offer this letter, so without the reverse link a reader arriving from a search
  // engine lands on a page with no route to the explanation of why it exists.
  const guideSlug = guideForVorlage(slug)
  const guide = guideSlug ? findGuideTopic(guideSlug) : undefined

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLdScript
        data={[
          webPageJsonLd({
            path: vorlagePath(slug),
            locale,
            title: content.title,
            description: content.summary,
            // The guide that explains this letter, so the pair is not read as two
            // competing documents for the same search.
            relatedPaths: guide ? [guidePath(guide.slug)] : undefined,
          }),
          serviceJsonLd({ path: vorlagePath(slug), locale, name: content.title, description: content.summary }),
          organizationJsonLd(legalProfile),
          faqJsonLd(content.faq),
          breadcrumbJsonLd(
            [
              { name: isBg ? "Начало" : "Startseite", path: "/" },
              { name: indexLabel, path: VORLAGE_INDEX_PATH },
              { name: content.title, path: vorlagePath(slug) },
            ],
            locale,
          ),
        ]}
      />

      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <nav aria-label={isBg ? "Навигация" : "Navigation"} className="text-sm">
          <Link
            href={`/${locale}${VORLAGE_INDEX_PATH}`}
            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {indexLabel}
          </Link>
        </nav>

        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{template.germanName}</p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] md:text-5xl">{content.title}</h1>
          <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">{content.intro}</p>
        </header>

        <section className="mt-12" aria-labelledby="when-heading">
          <h2 id="when-heading" className="text-xl font-bold">
            {isBg ? "Кога се използва" : "Wann es passt"}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {content.useWhen.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <Info className="mt-1.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="form-heading">
          <h2 id="form-heading" className="text-2xl font-bold tracking-tight">
            {isBg ? "Попълни и прегледай" : "Ausfüllen und prüfen"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            {isBg
              ? "Всичко се случва в браузъра ти. Нищо не се изпраща, докато не решиш."
              : "Alles geschieht in deinem Browser. Nichts wird gesendet, bis du es entscheidest."}
          </p>
          <div className="mt-6">
            <VorlageForm slug={slug} locale={locale} />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="caveats-heading">
          <h2 id="caveats-heading" className="flex items-center gap-2 text-xl font-bold">
            <CircleAlert className="size-5 text-amber-500" aria-hidden="true" />
            {isBg ? "Какво да провериш" : "Was zu prüfen ist"}
          </h2>
          <ul className="mt-4 space-y-3">
            {content.caveats.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="flex items-center gap-2 text-xl font-bold">
            <HelpCircle className="size-5 text-primary" aria-hidden="true" />
            {isBg ? "Чести въпроси" : "Häufige Fragen"}
          </h2>
          <div className="mt-4 divide-y divide-border">
            {content.faq.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.question}
                    <span className="mt-1 text-primary transition-transform group-open:rotate-90" aria-hidden="true">
                      <ArrowRight className="size-4" />
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="text-xl font-bold">
            {isBg ? "Официални източници" : "Offizielle Quellen"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isBg
              ? "Провери срока и правилата на официалната страница — те са меродавни."
              : "Frist und Regeln auf der offiziellen Seite prüfen – sie sind maßgeblich."}
          </p>
          <ul className="mt-4 space-y-2.5">
            {template.sources.map((source) => (
              <li key={source.url}>
                <a
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  href={source.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {guide && (
          <section className="paper mt-14 border-primary/30 p-6 md:p-8" aria-labelledby="guide-heading">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {isBg ? "Наръчник" : "Ratgeber"}
            </p>
            <h2 id="guide-heading" className="mt-3 text-xl font-bold">
              {isBg ? "Прочети правилото зад писмото" : "Die Regel hinter dem Brief nachlesen"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {isBg
                ? `Преди да изпратиш, виж как работи процедурата и какво се обърква най-често: ${guide.content[locale].title}.`
                : `Vor dem Versand nachlesen, wie das Verfahren läuft und was typischerweise schiefgeht: ${guide.content[locale].title}.`}
            </p>
            <div className="mt-5">
              <Link
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                href={`/${locale}${guidePath(guide.slug)}`}
              >
                {isBg ? "Отвори темата" : "Thema öffnen"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        {otherTemplates.length > 0 && (
          <section className="mt-16" aria-labelledby="more-heading">
            <h2 id="more-heading" className="text-xl font-bold">
              {isBg ? "Други писма" : "Weitere Briefe"}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {otherTemplates.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/${locale}${vorlagePath(item.slug)}`}
                    className="paper flex h-full flex-col p-5 transition-colors hover:border-primary/40"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.germanName}
                    </span>
                    <span className="mt-2 text-sm font-semibold">{item.content[locale].title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-16 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
          {isBg
            ? "Това е шаблон, а не правна консултация. Провери съдържанието и срока, преди да изпратиш. Оригиналните документи и официалните страници са меродавни."
            : "Dies ist eine Vorlage, keine Rechtsberatung. Inhalt und Frist vor dem Versand prüfen. Maßgeblich sind die Originaldokumente und die offiziellen Seiten."}{" "}
          <Link className="underline" href={canonicalUrl("/impressum", locale)}>
            {isBg ? "Импресум" : "Impressum"}
          </Link>
        </p>
      </div>
    </main>
  )
}
