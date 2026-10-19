"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileSearch,
  FileWarning,
  FileX2,
  Info,
  Receipt,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModuleInfoDialog } from "@/components/horizon/module-info-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
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
      className="h-full min-h-[124px] w-full flex-col items-start justify-between gap-3 whitespace-normal rounded-none bg-transparent p-4 pb-11 text-left hover:bg-transparent"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="block">
        <span className="block text-sm font-semibold leading-snug">{pending ? pendingLabel : label}</span>
        <span className="mt-0.5 block max-w-[calc(100%-2rem)] text-[11px] font-normal text-muted-foreground">{status}</span>
      </span>
    </Button>
  )
}

function InkassoCard({ locale }: { locale: "bg" | "de" }) {
  const [open, setOpen] = useState(false)
  const de = locale === "de"
  const copy = de
    ? {
        title: "Inkasso-Check",
        status: "Inkasso- oder Mahnschreiben prüfen",
        info: "Lade das Schreiben hoch oder füge seinen Text ein. Danach prüfst du die erkannten Angaben und wählst selbst den nächsten Schritt. Ohne deine Freigabe wird nichts versendet.",
        more: "Mehr lesen…",
        aria: "Mehr über Inkasso-Check",
      }
    : {
        title: "Inkasso Check",
        status: "Провери писмо за Inkasso или Mahnbescheid",
        info: "Качи писмото или постави текста му. После прегледай извлечените данни и избери следващата стъпка. Нищо не се изпраща без твоето одобрение.",
        more: "Прочети още…",
        aria: "Повече информация за Inkasso Check",
      }

  return (
    <article className="paper paper-link relative min-w-0 overflow-hidden">
      <Link
        href={localizedPath("/pruefung", locale)}
        className="flex min-h-[124px] w-full flex-col items-start justify-between gap-3 p-4 pb-11"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <FileWarning className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="block">
          <span className="block text-sm font-semibold leading-snug">{copy.title}</span>
          <span className="mt-0.5 block max-w-[calc(100%-2rem)] text-[11px] text-muted-foreground">{copy.status}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full border border-primary/30 bg-background text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={copy.aria}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg leading-snug">{copy.title}</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6">{copy.info}</DialogDescription>
          </DialogHeader>
          <Link
            href={`/${locale}/how-it-works`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {copy.more}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </article>
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
    <section className="mt-2" aria-labelledby="horizon-modules">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 id="horizon-modules" className="text-lg font-semibold tracking-tight">
          {de ? "Dienst wählen" : "Избери услуга"}
        </h2>
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
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {homeModules.map((definition) => {
          const Icon = icons[homeModuleIcon[definition.module]] ?? FileSearch
          const count = caseCounts[definition.module] ?? 0
          return (
            <form key={definition.module} action={startModuleCase} className="paper paper-link relative min-w-0 overflow-hidden">
              <input type="hidden" name="module" value={definition.module} />
              <input type="hidden" name="locale" value={locale} />
              <ModuleButton
                Icon={Icon}
                label={guideModuleLabel(locale, definition.module)}
                pendingLabel={copy.starting}
                status={count > 0 ? `${count} ${caseCountNoun(locale, count)}` : notStartedLabel(locale)}
              />
              <ModuleInfoDialog module={definition.module} locale={locale} />
            </form>
          )
        })}
        <InkassoCard locale={locale} />
      </div>
    </section>
  )
}
