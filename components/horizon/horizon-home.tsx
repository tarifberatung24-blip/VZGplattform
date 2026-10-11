"use client"

import { useFormStatus } from "react-dom"
import Link from "next/link"
import {
  Briefcase,
  Building2,
  FileSearch,
  FileX2,
  Receipt,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { homeModuleIcon, homeModules } from "@/lib/horizon/modules/registry"
import { startModuleCase } from "@/lib/horizon/modules/actions"
import {
  caseCountNoun,
  getGuideCopy,
  guideModuleLabel,
  notStartedLabel,
} from "@/lib/horizon/guide/copy"

const icons: Record<string, LucideIcon> = { Building2, Briefcase, FileX2, Receipt, FileSearch }

function ModuleButton({
  Icon,
  label,
  pendingLabel,
  status,
}: {
  Icon: LucideIcon
  label: string
  pendingLabel: string
  status: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      disabled={pending}
      className="paper paper-link h-full min-h-[112px] w-full flex-col items-start justify-between gap-3 whitespace-normal p-4 text-left"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="block">
        <span className="block text-sm font-semibold leading-snug">{pending ? pendingLabel : label}</span>
        <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{status}</span>
      </span>
    </Button>
  )
}

/**
 * HORIZON home: the five entry modules and the secondary destinations.
 *
 * Every module opens a case through the shared engine, so the home screen is an
 * entry point into real work rather than a launcher of placeholder screens.
 * Module labels come from the guide's module vocabulary, so the two surfaces
 * cannot disagree about what a module is called.
 */
export function HorizonHome({
  errorCode,
  caseCounts,
}: {
  errorCode: string | null
  caseCounts: Record<string, number>
}) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = getGuideCopy(locale)

  return (
    <section className="mt-8" aria-labelledby="horizon-modules">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="horizon-modules" className="text-lg font-semibold tracking-tight">
          {de ? "Womit kann ich helfen?" : "С какво да помогна?"}
        </h2>
        <Link href={`/${locale}/guide`} className="inline-flex min-h-10 items-center text-xs font-medium text-primary hover:underline">
          {de ? "Alle Wege ansehen" : "Виж всички пътища"}
        </Link>
      </div>

      {errorCode ? (
        <p
          role="alert"
          className="paper paper-note paper-note-danger mt-4 px-4 py-3 text-sm text-destructive"
        >
          {de
            ? "Der Vorgang konnte nicht geöffnet werden. Bitte erneut versuchen."
            : "Случаят не можа да бъде отворен. Опитай отново."}
        </p>
      ) : null}

      {/* Two columns on a phone, so the five modules fit on about one screen instead of a long list. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {homeModules.map((definition) => {
          const Icon = icons[homeModuleIcon[definition.module]] ?? FileSearch
          const count = caseCounts[definition.module] ?? 0
          return (
            <form key={definition.module} action={startModuleCase} className="min-w-0">
              <input type="hidden" name="module" value={definition.module} />
              <input type="hidden" name="locale" value={locale} />
              <ModuleButton
                Icon={Icon}
                label={guideModuleLabel(locale, definition.module)}
                pendingLabel={copy.starting}
                status={count > 0 ? `${count} ${caseCountNoun(locale, count)}` : notStartedLabel(locale)}
              />
            </form>
          )
        })}
      </div>
    </section>
  )
}
