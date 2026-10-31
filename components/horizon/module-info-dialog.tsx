"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Locale } from "@/lib/i18n/dictionaries"
import type { HorizonHomeModule } from "@/lib/horizon/modules/registry"

const moduleInfo: Record<Locale, Record<HorizonHomeModule, { title: string; description: string }>> = {
  bg: {
    agentur_fuer_arbeit: {
      title: "Агенция по заетостта",
      description: "Подреди въпрос, срок или документ към Agentur für Arbeit. HORIZON събира нужната информация и подготвя следващата стъпка, а ти преглеждаш всичко преди изпращане.",
    },
    jobcenter: {
      title: "Джобцентър",
      description: "Подготви запитване или документи за Jobcenter според твоя случай. HORIZON помага с подреждането, но не решава дали имаш право на помощ.",
    },
    kuendigung: {
      title: "Прекратяване на договор",
      description: "Провери данните и срока на договора и подготви предизвестие. Нищо не се изпраща, преди да го прегледаш и одобриш.",
    },
    steuererklaerung: {
      title: "Данъчна декларация",
      description: "Събери данните и документите за данъчната декларация на едно място. HORIZON помага с подготовката, но не подава декларацията автоматично.",
    },
    unterlagen_erklaeren: {
      title: "Обяснение на документи",
      description: "Качи немско писмо или документ, за да видиш какво означава и дали има срок. Провери извлечените данни, преди да използваш подготвен отговор.",
    },
  },
  de: {
    agentur_fuer_arbeit: {
      title: "Agentur für Arbeit",
      description: "Ordne eine Frage, Frist oder Unterlage für die Agentur für Arbeit. HORIZON sammelt die nötigen Angaben und bereitet den nächsten Schritt vor. Du prüfst alles vor dem Versand.",
    },
    jobcenter: {
      title: "Jobcenter",
      description: "Bereite eine Anfrage oder Unterlagen für das Jobcenter passend zu deinem Fall vor. HORIZON hilft beim Ordnen, entscheidet aber nicht über einen Leistungsanspruch.",
    },
    kuendigung: {
      title: "Vertrag kündigen",
      description: "Prüfe Vertragsdaten und Frist und bereite eine Kündigung vor. Ohne deine Prüfung und Freigabe wird nichts versendet.",
    },
    steuererklaerung: {
      title: "Steuererklärung",
      description: "Sammle Angaben und Unterlagen für die Steuererklärung an einem Ort. HORIZON hilft bei der Vorbereitung, gibt die Erklärung aber nicht automatisch ab.",
    },
    unterlagen_erklaeren: {
      title: "Dokumente erklären",
      description: "Lade einen deutschen Brief oder ein Dokument hoch und sieh, was es bedeutet und ob eine Frist gilt. Prüfe die erkannten Angaben, bevor du einen Entwurf verwendest.",
    },
  },
}

export function ModuleInfoDialog({ module, locale }: { module: HorizonHomeModule; locale: Locale }) {
  const [open, setOpen] = useState(false)
  const copy = moduleInfo[locale][module]
  const de = locale === "de"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full border border-primary/30 bg-background text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${de ? "Mehr erfahren über" : "Повече информация за"} ${copy.title}`}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg leading-snug">{copy.title}</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6">{copy.description}</DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Link
              href={`/${locale}/learning-center`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {de ? "Mehr lesen…" : "Прочети още…"}<ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
