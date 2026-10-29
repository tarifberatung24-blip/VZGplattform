import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { legalProfile } from "@/lib/legal-profile"
import { breadcrumbJsonLd, itemListJsonLd, organizationJsonLd, webPageJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"
import { GUIDE_INDEX_PATH, guideCategories, guidePath, guideTopics, guideTopicsByCategory } from "@/lib/ratgeber"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return ["bg", "de"].map((locale) => ({ locale }))
}

const indexCopy = {
  bg: {
    title: "Наръчник за Германия — институции, пари и ежедневие",
    summary:
      "Обяснения за немските институции и процедури на български: какво да носиш, как минава един час при службите и къде се сбърква най-често.",
    eyebrow: "Наръчник",
    intro:
      "Всяка страница отговаря на четири въпроса: коя е службата, какво решава, какво да носиш и какво се обърква най-често. Накрая има връзка към официалната страница, защото сумите и формулярите се променят.",
    topics: "теми",
  },
  de: {
    title: "Deutschland-Ratgeber – Behörden, Geld und Alltag",
    summary:
      "Erklärungen zu deutschen Behörden und Verfahren: was mitzubringen ist, wie ein Termin abläuft und wo typische Fehler passieren.",
    eyebrow: "Ratgeber",
    intro:
      "Jede Seite beantwortet vier Fragen: welche Stelle zuständig ist, was sie entscheidet, was mitzubringen ist und was am häufigsten schiefgeht. Am Ende steht der Link zur offiziellen Seite, denn Beträge und Formulare ändern sich.",
    topics: "Themen",
  },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const copy = indexCopy[locale]
  return pageMetadata({
    path: GUIDE_INDEX_PATH,
    locale,
    title: copy.title,
    description: copy.summary,
    keywords:
      locale === "bg"
        ? ["немски институции", "Jobcenter", "Finanzamt", "Anmeldung", "българи в Германия", "помощ Германия"]
        : ["Behörden Deutschland", "Jobcenter", "Finanzamt", "Anmeldung", "Ratgeber", "Ämter erklärt"],
  })
}

export default async function GuideIndexPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const copy = indexCopy[locale]
  const isBg = locale === "bg"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLdScript
        data={[
          webPageJsonLd({ path: GUIDE_INDEX_PATH, locale, title: copy.title, description: copy.summary }),
          organizationJsonLd(legalProfile),
          itemListJsonLd({
            locale,
            items: guideTopics.map((topic) => ({ name: topic.content[locale].title, path: guidePath(topic.slug) })),
          }),
          breadcrumbJsonLd(
            [
              { name: isBg ? "Начало" : "Startseite", path: "/" },
              { name: copy.eyebrow, path: GUIDE_INDEX_PATH },
            ],
            locale,
          ),
        ]}
      />

      <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <header className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <BookOpen className="size-4" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] md:text-6xl">{copy.title}</h1>
          <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">{copy.intro}</p>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            {guideTopics.length} {copy.topics}
          </p>
        </header>

        {guideCategories.map((category) => {
          const topics = guideTopicsByCategory(category.id)
          if (topics.length === 0) return null
          return (
            <section key={category.id} className="mt-16" aria-labelledby={`category-${category.id}`}>
              <h2 id={`category-${category.id}`} className="text-2xl font-bold tracking-tight">
                {category.title[locale]}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{category.intro[locale]}</p>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/${locale}${guidePath(topic.slug)}`}
                      className="paper flex h-full flex-col p-6 transition-colors hover:border-primary/40"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {topic.germanName}
                      </span>
                      <span className="mt-3 text-lg font-bold leading-snug">{topic.content[locale].title}</span>
                      <span className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{topic.content[locale].summary}</span>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        {isBg ? "Отвори" : "Öffnen"}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <p className="mt-16 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
          {isBg
            ? "Наръчникът обяснява процедури и не е правна или данъчна консултация. Оригиналните документи и официалните страници са меродавни."
            : "Der Ratgeber erklärt Verfahren und ist keine rechtliche oder steuerliche Beratung. Maßgeblich sind die Originaldokumente und die offiziellen Seiten."}
        </p>
      </div>
    </main>
  )
}
