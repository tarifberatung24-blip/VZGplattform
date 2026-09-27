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
}: {
  Icon: LucideIcon
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="horizon-card h-auto min-h-24 w-full justify-start gap-4 whitespace-normal border-border bg-card px-5 py-5 text-left hover:bg-card"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium">{pending ? pendingLabel : label}</span>
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
    <section data-reveal className="mt-10" aria-labelledby="horizon-modules">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="horizon-technical-label">{de ? "02 / Aufgaben" : "02 / Задачи"}</p>
          <h2 id="horizon-modules" className="mt-2 text-2xl font-semibold sm:text-3xl">
          {de ? "Womit kann ich helfen?" : "С какво да помогна?"}
          </h2>
        </div>
        <Link href={`/${locale}/guide`} className="text-xs font-medium text-primary hover:underline">
          {de ? "Alle Wege ansehen" : "Виж всички пътища"}
        </Link>
      </div>

      {errorCode ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {de
            ? "Der Vorgang konnte nicht geöffnet werden. Bitte erneut versuchen."
            : "Случаят не можа да бъде отворен. Опитай отново."}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              />
              <p className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                {count > 0 ? (
                  <>
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
                      {count}
                    </span>
                    <span>{caseCountNoun(locale, count)}</span>
                  </>
                ) : (
                  <span>{notStartedLabel(locale)}</span>
                )}
              </p>
            </form>
          )
        })}
      </div>
    </section>
  )
}
