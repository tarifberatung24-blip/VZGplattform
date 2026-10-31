"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, ExternalLink, Loader2, Search, Sparkles } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { localizedPath } from "@/lib/i18n/routing"
import { filterServiceCatalog, type ServiceCatalogEntry } from "@/lib/navigation/service-catalog"
import { cn } from "@/lib/utils"

type AiSearchProps = {
  className?: string
  /** Icon-only trigger, for the narrow workspace header. */
  compact?: boolean
}

type Source = { title: string; url: string; snippet: string | null }
type PlatformMatch = { id: string; href: string; title: string; detail: string }
type Answer = { answer: string; sources: Source[]; platform: PlatformMatch | null }

type Copy = {
  trigger: string
  title: string
  placeholder: string
  services: string
  askAi: string
  asking: string
  empty: string
  failed: string
  notConfigured: string
  rateLimited: string
  authRequired: string
  sources: string
  openInPlatform: string
}

const copies: Record<"bg" | "de", Copy> = {
  bg: {
    trigger: "Търси",
    title: "Търсене",
    placeholder: "Напиши услуга или въпрос…",
    services: "Подходящи услуги",
    askAi: "Питай AI",
    asking: "Търся…",
    empty: "Няма съвпадения.",
    failed: "Временно недостъпно.",
    notConfigured: "Временно недостъпно.",
    rateLimited: "Опитай след малко.",
    authRequired: "Влез, за да продължиш.",
    sources: "Източници",
    openInPlatform: "Отвори в HORIZON",
  },
  de: {
    trigger: "Suchen",
    title: "Suche",
    placeholder: "Dienst oder Frage eingeben…",
    services: "Passende Dienste",
    askAi: "KI fragen",
    asking: "Suche…",
    empty: "Keine Treffer.",
    failed: "Vorübergehend nicht verfügbar.",
    notConfigured: "Vorübergehend nicht verfügbar.",
    rateLimited: "Bitte später erneut versuchen.",
    authRequired: "Bitte anmelden, um fortzufahren.",
    sources: "Quellen",
    openInPlatform: "In HORIZON öffnen",
  },
}

function errorCopy(code: string, copy: Copy): string {
  if (code === "AI_SEARCH_NOT_CONFIGURED") return copy.notConfigured
  if (code === "RATE_LIMITED") return copy.rateLimited
  if (code === "AUTHENTICATION_REQUIRED") return copy.authRequired
  return copy.failed
}

/**
 * The HORIZON search dialog.
 *
 * Typing filters the real service catalog instantly, so the common case — "where
 * is X" — needs no model call. Pressing Enter, or the explicit button, asks the AI
 * and shows a web-grounded answer with its sources plus the platform service that
 * fits, so the user can act inside HORIZON instead of leaving with only prose.
 */
export function AiSearch({ className, compact = false }: AiSearchProps) {
  const pathname = usePathname() ?? "/"
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  const copy = copies[locale]

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const services: ServiceCatalogEntry[] = filterServiceCatalog(query, locale)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const reset = useCallback(() => {
    setQuery("")
    setAnswer(null)
    setError(null)
  }, [])

  const ask = useCallback(async () => {
    const question = query.trim()
    if (question.length < 2 || pending) return
    setPending(true)
    setError(null)
    setAnswer(null)
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, locale }),
      })
      const payload = (await response.json().catch(() => ({}))) as Partial<Answer> & { code?: string }
      if (!response.ok) {
        setError(errorCopy(payload.code ?? "", copy))
        return
      }
      setAnswer({
        answer: typeof payload.answer === "string" ? payload.answer : "",
        sources: Array.isArray(payload.sources) ? payload.sources : [],
        platform: payload.platform ?? null,
      })
    } catch {
      setError(copy.failed)
    } finally {
      setPending(false)
    }
  }, [copy, locale, pending, query])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "inline-flex size-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            : "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          className,
        )}
        aria-label={copy.trigger}
      >
        <Search className={compact ? "size-6" : "size-4"} aria-hidden="true" />
        {compact ? null : <span>{copy.trigger}</span>}
      </button>

      <DialogContent className="max-h-[min(46rem,calc(100svh-2rem))] overflow-y-auto p-5 sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{copy.title}</DialogTitle>
        </DialogHeader>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void ask()
              }
            }}
            placeholder={copy.placeholder}
            className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <button
          type="button"
          onClick={() => void ask()}
          disabled={pending || query.trim().length < 2}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          {pending ? copy.asking : copy.askAi}
        </button>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {answer ? (
          <section aria-label={copy.askAi} className="space-y-3 rounded-md border border-border bg-card p-4">
            <p className="whitespace-pre-wrap text-sm leading-6">{answer.answer}</p>
            {answer.platform ? (
              <Link
                href={localizedPath(answer.platform.href, locale)}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-primary">{copy.openInPlatform}</span>
                  <span className="block text-sm font-semibold">{answer.platform.title}</span>
                  <span className="block text-xs text-muted-foreground">{answer.platform.detail}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
              </Link>
            ) : null}
            {answer.sources.length ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.sources}</h3>
                <ul className="mt-2 space-y-2">
                  {answer.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="flex items-start gap-2 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">{source.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {!error ? <section aria-label={copy.services}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.services}</h3>
          <div className="mt-2 space-y-2">
            {services.length ? (
              services.map((service) => (
                <Link
                  key={service.id}
                  href={localizedPath(service.href, locale)}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{service.title[locale]}</span>
                    <span className="block text-xs text-muted-foreground">{service.detail[locale]}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                </Link>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">{copy.empty}</p>
            )}
          </div>
        </section> : null}
      </DialogContent>
    </Dialog>
  )
}
