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

export function GuideIntentInfoDialog({
  locale,
  title,
  description,
}: {
  locale: "bg" | "de"
  title: string
  description: string
}) {
  const [open, setOpen] = useState(false)
  const de = locale === "de"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full border border-primary/30 bg-background text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${de ? "Mehr erfahren über" : "Повече информация за"} ${title}`}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg leading-snug">{title}</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6">{description}</DialogDescription>
          </DialogHeader>
          <Link
            href={`/${locale}/learning-center`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {de ? "Mehr lesen…" : "Прочети още…"}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  )
}
