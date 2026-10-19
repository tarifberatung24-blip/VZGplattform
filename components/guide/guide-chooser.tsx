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
import { GuideIntentInfoDialog } from "@/components/guide/guide-intent-info-dialog"
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
}: {
  openCases: readonly GuideOpenCase[]
  errorCode: string | null
  readiness: GuideReadiness
}) {
  const { locale } = useLanguage()
  const copy = getGuideCopy(locale)

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-5">
          <h1 className="text-3xl font-semibold tracking-tight"><BrandText text={copy.chooseLabel} /></h1>
        </header>

        {errorCode ? (
          <p
            role="alert"
            className="paper paper-note paper-note-danger mt-6 px-4 py-3 text-sm text-destructive"
          >
            <BrandText text={copy.startError} />
          </p>
        ) : null}

        <section className="mt-6" aria-label={copy.chooseLabel}>
          <div className="grid gap-3 sm:grid-cols-2">
            {guideIntents.map((entry) => {
              const Icon = icons[guideIntentIcon[entry.intent]] ?? HelpCircle
              const text = copy.intents[entry.intent]
              return (
                <form key={entry.intent} action={startGuideCase} className="paper paper-link relative min-w-0 overflow-hidden">
                  <input type="hidden" name="intent" value={entry.intent} />
                  <input type="hidden" name="locale" value={locale} />
                  <IntentButton
                    Icon={Icon}
                    title={text.title}
                    pendingLabel={copy.starting}
                  />
                  <GuideIntentInfoDialog locale={locale} title={text.title} description={text.text} />
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

function IntentButton({
  Icon,
  title,
  pendingLabel,
}: {
  Icon: LucideIcon
  title: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      disabled={pending}
      className="h-auto min-h-[7.75rem] w-full justify-start gap-4 whitespace-normal bg-transparent px-4 py-4 pb-11 text-left hover:bg-transparent"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/5 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="block text-sm font-medium">{pending ? pendingLabel : title}</span>
    </Button>
  )
}
