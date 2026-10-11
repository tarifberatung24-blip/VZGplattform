"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { BrandText, HorizonWordmark } from "@/components/brand/horizon-wordmark"
import { cookieNoticeCopy } from "@/components/horizon/cookie-notice-copy"
import {
  LIVE_OPTIONAL_COOKIES,
  buildChoice,
  needsNotice,
  readStoredChoice,
  storeChoice,
  type OptionalCookieId,
} from "@/lib/cookies/consent"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

type Picks = Partial<Record<OptionalCookieId, boolean>>

/**
 * The cookie notice, shown on the first workspace page after sign-in until it has been
 * answered on this device. It is a sheet of paper like every other card.
 *
 * With no optional category in use it is information only and has one button. As soon as
 * LIVE_OPTIONAL_COOKIES lists a category, the same dialog offers the choice: only the
 * necessary ones, accept all, or settings. Closing it any other way counts as "only necessary".
 */
export function CookieNotice() {
  const { locale } = useLanguage()
  const copy = cookieNoticeCopy[locale]
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [picks, setPicks] = useState<Picks>({})
  const primaryRef = useRef<HTMLButtonElement>(null)
  const optional = LIVE_OPTIONAL_COOKIES
  const hasOptional = optional.length > 0

  useEffect(() => {
    if (needsNotice(readStoredChoice())) setOpen(true)
  }, [])

  function decide(answer: Picks) {
    storeChoice(buildChoice(answer))
    setOpen(false)
  }

  const everything = Object.fromEntries(optional.map((id) => [id, true])) as Picks

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) decide({}) }}>
      <DialogContent
        showCloseButton={false}
        initialFocus={primaryRef}
        className="paper flex max-h-[88svh] flex-col gap-0 overflow-hidden p-0 [--paper-cut:#e6e6e6] sm:max-w-xl dark:[--paper-cut:#000]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-5 sm:px-9 sm:pt-9">
          <HorizonWordmark className="text-[1.9rem] text-foreground" />
          <DialogTitle className="mt-7 text-2xl leading-tight font-black tracking-tight text-foreground">{copy.title}</DialogTitle>
          <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            {([["/datenschutz", copy.privacy], ["/impressum", copy.imprint]] as const).map(([path, label]) => (
              <Link
                key={path}
                href={localizedPath(path, locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
          <DialogDescription className="mt-4 text-[15px] leading-7 text-muted-foreground">
            <BrandText text={copy.intro} />
          </DialogDescription>

          <button
            type="button"
            aria-expanded={details}
            onClick={() => setDetails((value) => !value)}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {details ? copy.detailsClose : copy.detailsOpen}
            <ChevronDown className={`size-4 transition-transform ${details ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {details ? (
            <div className="mt-2 grid gap-3">
              <div className="paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">{copy.necessaryTitle}</p>
                  <span className="text-xs font-semibold text-muted-foreground">{copy.alwaysOn}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.necessaryBody}</p>
              </div>
              {hasOptional ? (
                optional.map((id) => (
                  <label key={id} className="paper flex cursor-pointer items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={picks[id] === true}
                      onChange={(event) => setPicks((current) => ({ ...current, [id]: event.target.checked }))}
                    />
                    <span>
                      <span className="block text-sm font-bold text-foreground">{copy.partnerTitle}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy.partnerBody}</span>
                    </span>
                  </label>
                ))
              ) : (
                <div className="paper p-4">
                  <p className="text-sm font-bold text-foreground">{copy.optionalTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.optionalBody}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4 sm:px-9">
          {hasOptional ? (
            <>
              <Button type="button" variant="outline" onClick={() => decide({})}>
                {copy.onlyNecessary}
              </Button>
              {details ? (
                <Button ref={primaryRef} type="button" onClick={() => decide(picks)}>
                  {copy.save}
                </Button>
              ) : (
                <Button ref={primaryRef} type="button" onClick={() => decide(everything)}>
                  {copy.acceptAll}
                </Button>
              )}
            </>
          ) : (
            <Button ref={primaryRef} type="button" onClick={() => decide({})}>
              {copy.understood}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
