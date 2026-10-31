"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  FileText,
  FolderOpen,
  Landmark,
  Lock,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BrandText } from "@/components/brand/horizon-wordmark"
import { cn } from "@/lib/utils"
import { localizedPath } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"
import {
  filterServiceCenter,
  serviceAudiences,
  serviceCategories,
  serviceCenterCopy,
  type ServiceAudience,
  type ServiceCategory,
  type ServiceStatus,
} from "@/lib/service-center/catalog"

const categoryIcons: Record<ServiceCategory, typeof FileText> = {
  guide: FileText,
  documents: FolderOpen,
  authorities: Building2,
  tax: ReceiptText,
  contracts: WalletCards,
  learning: BookOpen,
  insurance: ShieldCheck,
  roadmap: Sparkles,
}

/**
 * The status pill. Colour carries the meaning — available is settled, roadmap is
 * muted — but the label is always present, so the state is readable without colour
 * and to a screen reader.
 */
const statusVariant: Record<ServiceStatus, "default" | "secondary" | "outline"> = {
  available: "default",
  login: "secondary",
  partner: "secondary",
  roadmap: "outline",
}

export function HorizonServiceCatalog({ locale }: { locale: Locale }) {
  const copy = serviceCenterCopy[locale]
  const [query, setQuery] = useState("")
  const [audience, setAudience] = useState<ServiceAudience | "all">("all")
  const [category, setCategory] = useState<ServiceCategory | "all">("all")
  const [openId, setOpenId] = useState<string | null>(null)

  const results = useMemo(
    () => filterServiceCenter({ locale, query, audience, category }),
    [locale, query, audience, category],
  )

  const openEntry = results.find((entry) => entry.id === openId) ?? null
  const isFiltered = query.trim().length > 0 || audience !== "all" || category !== "all"

  const reset = () => {
    setQuery("")
    setAudience("all")
    setCategory("all")
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
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

      <section className="mt-8" aria-label={copy.searchLabel}>
        <label className="relative block">
          <span className="sr-only">{copy.searchLabel}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-11 w-full rounded-md border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.audienceLabel}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={copy.audienceLabel}>
              {(["all", ...serviceAudiences] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAudience(value)}
                  aria-pressed={audience === value}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors",
                    audience === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copy.audience[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.categoryLabel}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={copy.categoryLabel}>
              {(["all", ...serviceCategories] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors",
                    category === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copy.category[value]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          {copy.resultsLabel(results.length)}
        </p>
      </section>

      {results.length === 0 ? (
        <section className="paper mt-6 flex flex-col items-start gap-3 p-6 sm:p-8" aria-label={copy.emptyTitle}>
          <h2 className="text-lg font-semibold">{copy.emptyTitle}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{copy.emptyBody}</p>
          {isFiltered ? (
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              {copy.resetLabel}
            </Button>
          ) : null}
        </section>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((entry) => {
            const Icon = categoryIcons[entry.category]
            const canOpen = Boolean(entry.href)
            return (
              <li key={entry.id} className="min-w-0">
                <article className="paper flex h-full min-w-0 flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold leading-snug">
                        <BrandText text={entry.name[locale]} />
                      </h2>
                      <Badge variant={statusVariant[entry.status]} className="mt-2">
                        {entry.status === "login" ? <Lock className="size-3" aria-hidden="true" /> : null}
                        {copy.status[entry.status]}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                    <BrandText text={entry.summary[locale]} />
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpenId(entry.id)}>
                      {copy.detailsLabel}
                    </Button>
                    {canOpen ? (
                      <Button asChild size="sm">
                        <Link href={localizedPath(entry.href as string, locale)}>
                          {copy.openLabel}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">{copy.statusHint[entry.status]}</span>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-12 grid gap-4 lg:grid-cols-2">
        <div className="paper p-6 sm:p-7">
          <h2 className="text-xl font-semibold">{copy.processTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.processIntro}</p>
          <ol className="mt-5 space-y-3">
            {copy.process.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="paper paper-note p-6 sm:p-7">
          <h2 className="text-xl font-semibold">{copy.limitsTitle}</h2>
          <ul className="mt-4 space-y-3">
            {copy.limits.map((limit) => (
              <li key={limit} className="flex gap-3 text-sm leading-6">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{limit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="paper mt-4 flex items-start gap-3 p-5 sm:p-6" aria-label={copy.noticeTitle}>
        <Landmark className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold">{copy.noticeTitle}</h2>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">
            <BrandText text={copy.notice} official />
          </p>
        </div>
      </section>

      <Dialog open={openId !== null} onOpenChange={(next) => { if (!next) setOpenId(null) }}>
        <DialogContent className="max-h-[min(44rem,calc(100svh-2rem))] overflow-y-auto p-5 sm:max-w-lg">
          {openEntry ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="text-lg">
                  <BrandText text={openEntry.name[locale]} />
                </DialogTitle>
                <DialogDescription>
                  <BrandText text={openEntry.summary[locale]} />
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[openEntry.status]}>{copy.status[openEntry.status]}</Badge>
                <span className="text-xs text-muted-foreground">{copy.category[openEntry.category]}</span>
              </div>

              <div>
                <p className="text-sm font-semibold">{copy.includesLabel}</p>
                <ul className="mt-3 space-y-2">
                  {openEntry.includes[locale].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>
                        <BrandText text={item} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs leading-6 text-muted-foreground">{copy.statusHint[openEntry.status]}</p>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {openEntry.href ? (
                  <Button asChild size="sm">
                    <Link href={localizedPath(openEntry.href, locale)}>
                      {copy.openLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                  {copy.closeLabel}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
