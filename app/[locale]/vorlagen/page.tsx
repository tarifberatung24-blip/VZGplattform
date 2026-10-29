import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, FileSignature } from "lucide-react"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { legalProfile } from "@/lib/legal-profile"
import { breadcrumbJsonLd, itemListJsonLd, organizationJsonLd, webPageJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"
import { findGuideTopic, guidePath } from "@/lib/ratgeber"
import {
  VORLAGE_INDEX_PATH,
  guideForVorlage,
  vorlageCategories,
  vorlagePath,
  vorlagen,
  vorlagenByCategory,
} from "@/lib/horizon/vorlagen"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return ["bg", "de"].map((locale) => ({ locale }))
}

const indexCopy = {
  bg: {
    title: "Готови писма за Германия — попълнени с твоите данни",
    summary:
      "Mängelanzeige, Arbeitszeugnis, Urlaubsantrag и Widerspruch: отговаряш на няколко въпроса и получаваш готово немско писмо с твоите данни.",
    eyebrow: "Готови писма",
    intro:
      "Тук не сваляш празен формуляр. Избираш писмо, попълваш няколко полета и виждаш готовия немски текст веднага — с твоето име, адрес и дати. Проверяваш го и го изтегляш като PDF.",
    templates: "писма",
    why: "Защо не празен формуляр",
    whyBody:
      "Празният формуляр оставя най-трудното на теб: да измислиш немските формулировки. Тук писмото е вече написано. Нищо не се изпраща — преглеждаш го и решаваш.",
    explain: "Разбери процедурата",
    explainBody:
      "Всяко писмо има смисъл само в контекста на една процедура. Наръчникът обяснява стъпките, документите и най-честите грешки.",
  },
  de: {
    title: "Fertige Briefe für Deutschland – mit deinen Daten",
    summary:
      "Mängelanzeige, Arbeitszeugnis, Urlaubsantrag und Widerspruch: wenige Angaben ausfüllen und einen fertigen deutschen Brief mit deinen Daten erhalten.",
    eyebrow: "Fertige Briefe",
    intro:
      "Hier lädst du kein leeres Formular herunter. Du wählst einen Brief, füllst wenige Felder aus und siehst den fertigen deutschen Text sofort – mit deinem Namen, deiner Adresse und deinen Daten. Prüfen und als PDF herunterladen.",
    templates: "Briefe",
    why: "Warum kein leeres Formular",
    whyBody:
      "Ein leeres Formular überlässt dir das Schwerste: die deutschen Formulierungen. Hier ist der Brief schon geschrieben. Nichts wird versendet – du prüfst und entscheidest.",
    explain: "Das Verfahren verstehen",
    explainBody:
      "Ein Brief wirkt nur im Zusammenhang eines Verfahrens. Der Ratgeber erklärt die Schritte, die Unterlagen und die häufigsten Fehler.",
  },
} as const

/**
 * The guide links shown above the letter list.
 *
 * They come from the same map that puts a letter on a guide page, so the two
 * directions cannot drift: a guide that offers a letter also appears here, with its
 * own title in each locale.
 */
const explainLinks = vorlagen.flatMap((template) => {
  const guideSlug = guideForVorlage(template.slug)
  const guide = guideSlug ? findGuideTopic(guideSlug) : undefined
  return guide ? [{ path: guidePath(guide.slug), title: guide.content }] : []
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const copy = indexCopy[locale]
  return pageMetadata({
    path: VORLAGE_INDEX_PATH,
    locale,
    title: copy.title,
    description: copy.summary,
    keywords:
      locale === "bg"
        ? ["готови писма Германия", "Mängelanzeige", "Widerspruch", "Urlaubsantrag", "българи в Германия"]
        : ["Briefvorlagen Deutschland", "Mängelanzeige", "Widerspruch", "Urlaubsantrag", "Briefe schreiben"],
  })
}

export default async function VorlageIndexPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : "bg"
  const copy = indexCopy[locale]
  const isBg = locale === "bg"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLdScript
        data={[
          webPageJsonLd({ path: VORLAGE_INDEX_PATH, locale, title: copy.title, description: copy.summary }),
          organizationJsonLd(legalProfile),
          itemListJsonLd({
            locale,
            items: vorlagen.map((template) => ({ name: template.content[locale].title, path: vorlagePath(template.slug) })),
          }),
          breadcrumbJsonLd(
            [
              { name: isBg ? "Начало" : "Startseite", path: "/" },
              { name: copy.eyebrow, path: VORLAGE_INDEX_PATH },
            ],
            locale,
          ),
        ]}
      />

      <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <header className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <FileSignature className="size-4" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-[-0.04em] md:text-6xl">{copy.title}</h1>
          <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">{copy.intro}</p>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            {vorlagen.length} {copy.templates}
          </p>
        </header>

        <section className="mt-12 rounded-lg border border-border bg-muted/40 p-6" aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-lg font-bold">
            {copy.why}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{copy.whyBody}</p>
        </section>

        <section className="mt-10" aria-labelledby="explain-heading">
          <h2 id="explain-heading" className="text-lg font-bold">
            {copy.explain}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{copy.explainBody}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {explainLinks.map((item) => (
              <li key={item.path}>
                <Link
                  href={`/${locale}${item.path}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/40"
                >
                  {item.title[locale].title}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {vorlageCategories.map((category) => {
          const templates = vorlagenByCategory(category.id)
          if (templates.length === 0) return null
          return (
            <section key={category.id} className="mt-16" aria-labelledby={`category-${category.id}`}>
              <h2 id={`category-${category.id}`} className="text-2xl font-bold tracking-tight">
                {category.title[locale]}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{category.intro[locale]}</p>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <li key={template.slug}>
                    <Link
                      href={`/${locale}${vorlagePath(template.slug)}`}
                      className="paper flex h-full flex-col p-6 transition-colors hover:border-primary/40"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {template.germanName}
                      </span>
                      <span className="mt-3 text-lg font-bold leading-snug">{template.content[locale].title}</span>
                      <span className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
                        {template.content[locale].summary}
                      </span>
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
            ? "Писмата са шаблони, а не правна консултация. Провери съдържанието и срока, преди да изпратиш. Оригиналните документи и официалните страници са меродавни."
            : "Die Briefe sind Vorlagen, keine Rechtsberatung. Inhalt und Frist vor dem Versand prüfen. Maßgeblich sind die Originaldokumente und die offiziellen Seiten."}
        </p>
      </div>
    </main>
  )
}
