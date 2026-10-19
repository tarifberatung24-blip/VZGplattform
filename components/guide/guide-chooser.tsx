"use client"

import { useFormStatus } from "react-dom"
import Link from "next/link"
import {
  ClipboardList,
  FileSearch,
  FileX2,
  HelpCircle,
  Mail,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { useLanguage } from "@/lib/i18n/language-context"
import { guideIntentIcon, guideIntents } from "@/lib/horizon/guide/intents"
import { caseStatusLabel, getGuideCopy, guideModuleLabel } from "@/lib/horizon/guide/copy"
import { startGuideCase } from "@/lib/horizon/guide/actions"
import { SituationRouter } from "@/components/guide/situation-router"
import { BrandText } from "@/components/brand/horizon-wordmark"

const icons: Record<string, LucideIcon> = {
  FileSearch,
  Mail,
  ClipboardList,
  FileX2,
  HelpCircle,
}

export type GuideOpenCase = {
  id: string
  title: string
  module: string
  status: string
  createdAt: string
}

export type GuideReadiness = {
  available: boolean
  hasProfileBasics: boolean
  documentCount: number
}

/**
 * The guide's five entry points plus any cases the user has already opened.
 *
 * Each entry is a real form submit, so a selection creates a canonical case
 * through the P5 engine. No entry is a decorative link.
 */
export function GuideChooser({
  openCases,
  errorCode,
  readiness,
}: {
  openCases: readonly GuideOpenCase[]
  errorCode: string | null
  readiness: GuideReadiness
}) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = getGuideCopy(locale)

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight"><BrandText text={copy.title} /></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"><BrandText text={copy.intro} /></p>
        </header>

        {errorCode ? (
          <p
            role="alert"
            className="paper paper-note paper-note-danger mt-6 px-4 py-3 text-sm text-destructive"
          >
            <BrandText text={copy.startError} />
          </p>
        ) : null}

        {readiness.available ? (
          <section className="paper paper-note mt-6 p-4 sm:p-5" aria-labelledby="guide-readiness">
            <h2 id="guide-readiness" className="text-sm font-semibold"><BrandText text={copy.readinessTitle} /></h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground"><BrandText text={copy.readinessHint} /></p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReadinessItem
                label={de ? "Profil" : "Профил"}
                detail={readiness.hasProfileBasics ? copy.profileReady : copy.profileNeedsData}
                action={copy.profileCta}
                href={`/${locale}/profil`}
                complete={readiness.hasProfileBasics}
              />
              <ReadinessItem
                label={de ? "Dokumente" : "Документи"}
                detail={readiness.documentCount > 0 ? `${readiness.documentCount} · ${copy.documentsReady}` : copy.documentsEmpty}
                action={copy.documentsCta}
                href={`/${locale}/documents`}
                complete={readiness.documentCount > 0}
              />
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="guide-choose">
          <h2
            id="guide-choose"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            <BrandText text={copy.chooseLabel} />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground"><BrandText text={copy.chooseHint} /></p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {guideIntents.map((entry) => {
              const Icon = icons[guideIntentIcon[entry.intent]] ?? HelpCircle
              const text = copy.intents[entry.intent]
              return (
                <form key={entry.intent} action={startGuideCase}>
                  <input type="hidden" name="intent" value={entry.intent} />
                  <input type="hidden" name="locale" value={locale} />
                  <IntentButton
                    Icon={Icon}
                    title={text.title}
                    text={text.text}
                    pendingLabel={copy.starting}
                  />
                </form>
              )
            })}
          </div>

          <SituationRouter locale={locale} />

        </section>

        <section className="mt-10" aria-labelledby="guide-cases">
          <h2
            id="guide-cases"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            <BrandText text={copy.openCasesTitle} />
          </h2>
          <p className="mt-1 text-xs text-muted-foreground"><BrandText text={copy.openCasesHint} /></p>
          <div className="mt-4 space-y-2">
            {openCases.length === 0 ? (
              <p className="paper paper-empty px-4 py-6 text-center text-sm text-muted-foreground">
                <BrandText text={copy.openCasesEmpty} />
              </p>
            ) : (
              openCases.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/guide/${item.id}`}
                  className="paper paper-inset paper-link flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium"><BrandText text={item.title} /></span>
                    <span className="block text-xs text-muted-foreground">
                      {copy.moduleLabel}: {guideModuleLabel(locale, item.module)} ·{" "}
                      {caseStatusLabel(locale, item.status)}
                    </span>
                  </span>
                  <span className="text-xs text-primary"><BrandText text={copy.continueLabel} /></span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </WorkspacePage>
  )
}

function ReadinessItem({
  label,
  detail,
  action,
  href,
  complete,
}: {
  label: string
  detail: string
  action: string
  href: string
  complete: boolean
}) {
  return (
    <div className="paper paper-inset flex min-h-28 flex-col justify-between gap-3 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className={`mt-2 text-sm leading-5 ${complete ? "text-foreground" : "text-muted-foreground"}`}>{detail}</p>
      </div>
      <Link href={href} className="text-xs font-medium text-primary hover:underline">{action}</Link>
    </div>
  )
}

function IntentButton({
  Icon,
  title,
  text,
  pendingLabel,
}: {
  Icon: LucideIcon
  title: string
  text: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="h-auto min-h-24 w-full justify-start gap-4 whitespace-normal px-4 py-4 text-left"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/5 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{pending ? pendingLabel : title}</span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{text}</span>
      </span>
    </Button>
  )
}
