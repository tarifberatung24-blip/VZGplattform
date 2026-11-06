import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  BookOpen,
  Check,
  ChevronDown,
  FileSignature,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Sparkles,
} from "lucide-react"

import { BrandText } from "@/components/brand/horizon-wordmark"
import { Button } from "@/components/ui/button"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { serviceIcons } from "@/components/marketing/how-it-works-icons"
import { howItWorksCopy, type HowItWorksService } from "@/components/marketing/how-it-works-copy"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { legalProfile } from "@/lib/legal-profile"
import { breadcrumbJsonLd, itemListJsonLd, organizationJsonLd, webPageJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"
import { guideCategories, guidePath, guideTopics, guideTopicsByCategory } from "@/lib/ratgeber"
import { vorlageCategories, vorlagePath, vorlagen, vorlagenByCategory } from "@/lib/horizon/vorlagen"
import { LEARNING_CENTER_PATH, learningCenterCopy, type LearningPath, type LearningCenterCopy } from "@/lib/learning-center/copy"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return ["bg", "de"].map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : defaultLocale
  const copy = learningCenterCopy[locale]
  return pageMetadata({
    path: LEARNING_CENTER_PATH,
    locale,
    title: copy.title,
    description: copy.intro,
    keywords:
      locale === "bg"
        ? ["учебен център", "HORIZON функции", "немски институции", "готови писма", "българи в Германия"]
        : ["Lernzentrum", "HORIZON Funktionen", "Behörden Deutschland", "fertige Briefe", "Ratgeber"],
  })
}

/** The numbered marker that opens every learning path. */
function PathHeader({ path }: { path: LearningPath }) {
  return (
    <header className="max-w-3xl">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">
          {path.number}
        </span>
        {path.tagline}
      </p>
      <h2 id={`${path.anchor}-title`} className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        {path.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{path.start}</p>
    </header>
  )
}

function ServiceCard({
  service,
  locale,
  copy,
}: {
  service: HowItWorksService
  locale: Locale
  copy: LearningCenterCopy
}) {
  const Icon = serviceIcons[service.id]

  return (
    <article className="paper flex h-full min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden={true} />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">
            <BrandText text={service.title} />
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            <BrandText text={service.problem} />
          </p>
        </div>
      </div>

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          {copy.detailsLabel}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden={true} />
        </summary>
        <ol className="mt-2 space-y-3">
          {service.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground"
                aria-label={`${copy.stepsLabel} ${index + 1}`}
              >
                {index + 1}
              </span>
              <span>
                <BrandText text={step} />
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm leading-6">
          <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden={true} />
          <span>
            <strong>{service.resultLabel}:</strong> <BrandText text={service.result} />
          </span>
        </p>
      </details>

      <Link
        href={`/${locale}${service.href}`}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        {service.cta}
        <ArrowRight className="size-4" aria-hidden={true} />
      </Link>
    </article>
  )
}

function TopicCard({ slug, locale }: { slug: string; locale: Locale }) {
  const topic = guideTopics.find((item) => item.slug === slug)
  if (!topic) return null
  const copy = learningCenterCopy[locale]
  return (
    <li>
      <Link href={`/${locale}${guidePath(topic.slug)}`} className="paper paper-link flex h-full flex-col p-5 sm:p-6">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{topic.germanName}</span>
        <span className="mt-3 text-lg font-bold leading-snug">{topic.content[locale].title}</span>
        <span className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{topic.content[locale].summary}</span>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {copy.openLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

function LetterCard({ slug, locale }: { slug: string; locale: Locale }) {
  const template = vorlagen.find((item) => item.slug === slug)
  if (!template) return null
  const copy = learningCenterCopy[locale]
  return (
    <li>
      <Link href={`/${locale}${vorlagePath(template.slug)}`} className="paper paper-link flex h-full flex-col p-5 sm:p-6">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {template.germanName}
        </span>
        <span className="mt-3 text-lg font-bold leading-snug">{template.content[locale].title}</span>
        <span className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{template.content[locale].summary}</span>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {copy.openLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

const lessonIcons = [LayoutDashboard, GraduationCap, BadgeEuro, BookOpen, FileSignature, Lock]

export default async function LearningCenterPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : defaultLocale
  const copy = learningCenterCopy[locale]
  const functions = howItWorksCopy[locale]
  const isBg = locale === "bg"

  const pathsById = Object.fromEntries(copy.paths.map((path) => [path.id, path])) as Record<LearningPath["id"], LearningPath>

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLdScript
        data={[
          webPageJsonLd({
            path: LEARNING_CENTER_PATH,
            locale,
            title: copy.title,
            description: copy.intro,
          }),
          organizationJsonLd(legalProfile),
          itemListJsonLd({
            locale,
            items: [
              ...guideTopics.map((topic) => ({ name: topic.content[locale].title, path: guidePath(topic.slug) })),
              ...vorlagen.map((template) => ({ name: template.content[locale].title, path: vorlagePath(template.slug) })),
            ],
          }),
          breadcrumbJsonLd(
            [
              { name: isBg ? "Начало" : "Startseite", path: "/" },
              { name: copy.eyebrow, path: LEARNING_CENTER_PATH },
            ],
            locale,
          ),
        ]}
      />

      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-24 sm:px-6 md:pt-28 lg:px-8">
        <Link
          href={`/${locale}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          {copy.back}
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            <BrandText text={copy.title} />
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            <BrandText text={copy.intro} />
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={copy.pathsTitle}>
          <p className="text-sm font-semibold">{copy.pathsTitle}</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {copy.howToUse.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {copy.paths.map((path) => (
              <a
                key={path.anchor}
                href={`#${path.anchor}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                <span className="font-bold tabular-nums text-primary">{path.number}</span>
                {path.title}
              </a>
            ))}
          </div>
        </section>

        <div className="mt-12 space-y-16">
          {/* 01 — FUNCTIONS */}
          <section
            id={pathsById.functions.anchor}
            className="scroll-mt-28"
            aria-labelledby={`${pathsById.functions.anchor}-title`}
          >
            <PathHeader path={pathsById.functions} />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.functionsIntro}</p>
            <div className="mt-8 space-y-12">
              {functions.groups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-xl font-semibold tracking-tight">{group.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{group.intro}</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {group.services.map((service) => (
                      <ServiceCard key={service.id} service={service} locale={locale} copy={copy} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 02 — GUIDES */}
          <section id={pathsById.guides.anchor} className="scroll-mt-28" aria-labelledby={`${pathsById.guides.anchor}-title`}>
            <PathHeader path={pathsById.guides} />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.guidesIntro}</p>
            <div className="mt-8 space-y-12">
              {guideCategories.map((category) => {
                const topics = guideTopicsByCategory(category.id)
                if (topics.length === 0) return null
                return (
                  <div key={category.id}>
                    <h3 className="text-xl font-semibold tracking-tight">{category.title[locale]}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{category.intro[locale]}</p>
                    <ul className="mt-5 grid gap-4 md:grid-cols-2">
                      {topics.map((topic) => (
                        <TopicCard key={topic.slug} slug={topic.slug} locale={locale} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 03 — LETTERS */}
          <section id={pathsById.letters.anchor} className="scroll-mt-28" aria-labelledby={`${pathsById.letters.anchor}-title`}>
            <PathHeader path={pathsById.letters} />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.lettersIntro}</p>
            <div className="mt-8 space-y-12">
              {vorlageCategories.map((category) => {
                const templates = vorlagenByCategory(category.id)
                if (templates.length === 0) return null
                return (
                  <div key={category.id}>
                    <h3 className="text-xl font-semibold tracking-tight">{category.title[locale]}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{category.intro[locale]}</p>
                    <ul className="mt-5 grid gap-4 md:grid-cols-2">
                      {templates.map((template) => (
                        <LetterCard key={template.slug} slug={template.slug} locale={locale} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 04 — DASHBOARD TRAINING (COMING SOON) */}
          <section
            id={pathsById.dashboard.anchor}
            className="scroll-mt-28"
            aria-labelledby={`${pathsById.dashboard.anchor}-title`}
          >
            <PathHeader path={pathsById.dashboard} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                {copy.comingSoonLabel}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.dashboardIntro}</p>

            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {copy.dashboardLessons.map((lesson, index) => {
                const Icon = lessonIcons[index] ?? Lock
                return (
                  <li key={lesson.title} className="paper flex h-full items-start gap-4 p-5 opacity-80 sm:p-6">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold leading-snug">{lesson.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{lesson.body}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <section className="paper paper-note mt-16 p-5 sm:p-6" aria-labelledby="learning-center-notice">
          <h2 id="learning-center-notice" className="text-base font-semibold">
            {copy.noticeTitle}
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            <BrandText text={copy.notice} official />
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/${locale}/auth/sign-up`}>
              {copy.primaryCta}
              <ArrowRight className="size-4" aria-hidden={true} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/auth/login`}>{copy.secondaryCta}</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
