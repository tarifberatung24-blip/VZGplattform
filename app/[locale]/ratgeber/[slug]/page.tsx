import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, ExternalLink, FileText, HelpCircle } from "lucide-react"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { Button } from "@/components/ui/button"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { legalProfile } from "@/lib/legal-profile"
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, webPageJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"
import { canonicalUrl } from "@/lib/seo/site"
import { findGuideTopic, guidePath, guideTopics } from "@/lib/ratgeber"

type Props = { params: Promise<{ locale: string; slug: string }> }

// The corpus is finite and fully enumerated by `generateStaticParams`, so a slug
// outside it is not a page at all. Without this the router renders the unknown slug
// on demand and `notFound()` only swaps the body, leaving the status at 200 — a soft
// 404, which a crawler records as a real page and keeps requesting.
export const dynamicParams = false

export function generateStaticParams() {
  return ["bg", "de"].flatMap((locale) => guideTopics.map((topic) => ({ locale, slug: topic.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const topic = findGuideTopic(slug)
  if (!topic) return {}
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const content = topic.content[locale]
  return pageMetadata({
    path: guidePath(slug),
    locale,
    title: content.title,
    description: content.summary,
    keywords: [...topic.keywords[locale], topic.germanName],
    type: "article",
  })
}

export default async function GuideTopicPage({ params }: Props) {
  const { locale: raw, slug } = await params
  const topic = findGuideTopic(slug)
  if (!topic) notFound()
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const content = topic.content[locale]
  const isBg = locale === "bg"

  const indexLabel = isBg ? "Наръчник" : "Ratgeber"
  const otherTopics = guideTopics.filter((item) => item.slug !== slug).slice(0, 4)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLdScript
        data={[
          webPageJsonLd({ path: guidePath(slug), locale, title: content.title, description: content.summary }),
          organizationJsonLd(legalProfile),
          faqJsonLd(content.faq),
          breadcrumbJsonLd(
            [
              { name: isBg ? "Начало" : "Startseite", path: "/" },
              { name: indexLabel, path: "/ratgeber" },
              { name: content.title, path: guidePath(slug) },
            ],
            locale,
          ),
        ]}
      />

      <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <nav aria-label={isBg ? "Навигация" : "Navigation"} className="text-sm">
          <Link href={`/${locale}/ratgeber`} className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {indexLabel}
          </Link>
        </nav>

        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{topic.germanName}</p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] md:text-5xl">{content.title}</h1>
          <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">{content.intro}</p>
        </header>

        <section className="mt-12" aria-labelledby="scope-heading">
          <h2 id="scope-heading" className="text-xl font-bold">
            {isBg ? "Какво прави тази служба" : "Wofür diese Stelle zuständig ist"}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {content.scope.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="text-xl font-bold">
            {isBg ? "Стъпка по стъпка" : "Schritt für Schritt"}
          </h2>
          <ol className="mt-5 space-y-6">
            {content.steps.map((step, index) => (
              <li key={step.title} className="paper flex gap-5 p-5 md:p-6">
                <span className="text-xs font-bold tabular-nums text-primary" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12" aria-labelledby="documents-heading">
          <h2 id="documents-heading" className="text-xl font-bold">
            {isBg ? "Какво да носиш" : "Was mitzubringen ist"}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {content.documents.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <FileText className="mt-1.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="pitfalls-heading">
          <h2 id="pitfalls-heading" className="text-xl font-bold">
            {isBg ? "Къде се сбърква най-често" : "Typische Fehler"}
          </h2>
          <ul className="mt-4 space-y-3">
            {content.pitfalls.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <CircleAlert className="mt-1.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="faq-heading">
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

        <section className="mt-12" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="text-xl font-bold">
            {isBg ? "Официални източници" : "Offizielle Quellen"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isBg
              ? "Провери актуалните стойности и формуляри на официалната страница — те се променят."
              : "Aktuelle Beträge und Formulare auf der offiziellen Seite prüfen – sie ändern sich."}
          </p>
          <ul className="mt-4 space-y-2.5">
            {topic.sources.map((source) => (
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

        <section className="paper mt-14 p-6 md:p-8">
          <h2 className="text-xl font-bold">{isBg ? "Не искаш да го правиш сам" : "Nicht selbst erledigen wollen"}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {isBg
              ? "Подготви писмото или заявлението в HORIZON. Нищо не се изпраща без твоето изрично одобрение."
              : "Bereite den Brief oder Antrag in HORIZON vor. Nichts wird ohne deine ausdrückliche Bestätigung versendet."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${locale}/guide`}>{isBg ? "Отвори HORIZON Guide" : "HORIZON Guide öffnen"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/email-generator`}>{isBg ? "Подготви писмо" : "Brief vorbereiten"}</Link>
            </Button>
          </div>
        </section>

        {otherTopics.length > 0 && (
          <section className="mt-14" aria-labelledby="more-heading">
            <h2 id="more-heading" className="text-xl font-bold">
              {isBg ? "Още по темата" : "Weitere Themen"}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {otherTopics.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/${locale}${guidePath(item.slug)}`}
                    className="paper flex h-full flex-col p-5 transition-colors hover:border-primary/40"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.germanName}</span>
                    <span className="mt-2 text-sm font-semibold">{item.content[locale].title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-14 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
          {isBg
            ? "Тази страница обяснява процедурата и не е правна или данъчна консултация. Оригиналните документи и официалните страници са меродавни."
            : "Diese Seite erklärt das Verfahren und ist keine rechtliche oder steuerliche Beratung. Maßgeblich sind die Originaldokumente und die offiziellen Seiten."}{" "}
          <Link className="underline" href={canonicalUrl("/impressum", locale)}>
            {isBg ? "Импресум" : "Impressum"}
          </Link>
        </p>
      </article>
    </main>
  )
}
