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
import { useLanguage } from "@/lib/i18n/language-context"
import { guideIntentIcon, guideIntents } from "@/lib/horizon/guide/intents"
import { getGuideCopy, guideModuleLabel } from "@/lib/horizon/guide/copy"
import { startGuideCase } from "@/lib/horizon/guide/actions"

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
}) {
  const { locale } = useLanguage()
  const copy = getGuideCopy(locale)

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.brand}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{copy.brandNote}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>
        </header>

        {errorCode ? (
          <p
            role="alert"
            className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {copy.startError}
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="guide-choose">
          <h2
            id="guide-choose"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            {copy.chooseLabel}
          </h2>
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
        </section>

        <section className="mt-10" aria-labelledby="guide-cases">
          <h2
            id="guide-cases"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            {copy.openCasesTitle}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{copy.openCasesHint}</p>
          <div className="mt-4 space-y-2">
            {openCases.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {copy.openCasesEmpty}
              </p>
            ) : (
              openCases.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/guide/${item.id}`}
                  className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {copy.moduleLabel}: {guideModuleLabel(locale, item.module)}
                    </span>
                  </span>
                  <span className="text-xs text-primary">{copy.continueLabel}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
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