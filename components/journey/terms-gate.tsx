"use client"

import { FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { acceptTermsAction } from "@/lib/journey/terms-actions"
import { TermsLabel } from "./terms-label"

const COPY = {
  bg: {
    title: "Още една стъпка",
    intro: "Преди да продължиш, приеми общите условия и се запознай с политиките.",
    button: "Продължи",
    error: "Потвърждението не се записа. Опитай отново.",
  },
  de: {
    title: "Noch ein Schritt",
    intro: "Bevor du weitermachst, akzeptiere bitte die Bedingungen und lies die Richtlinien.",
    button: "Weiter",
    error: "Die Bestätigung wurde nicht gespeichert. Bitte versuche es erneut.",
  },
} as const

/** Shown on the first onboarding step to an account that has not accepted the current terms, whichever way it signed up. */
export function TermsGate({ locale }: { locale: "bg" | "de" }) {
  const copy = COPY[locale]
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!checked) return
    setFailed(false)
    startTransition(async () => {
      const result = await acceptTermsAction()
      if (!result.ok) {
        setFailed(true)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-md items-center px-4 py-10">
      <form onSubmit={submit} className="paper w-full space-y-5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{copy.intro}</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
          <input type="checkbox" required className="mt-1 size-5 shrink-0 accent-primary" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span><TermsLabel locale={locale} /></span>
        </label>
        {failed ? <p role="alert" className="text-sm text-destructive">{copy.error}</p> : null}
        <Button className="w-full" disabled={!checked || pending}>{copy.button}</Button>
      </form>
    </div>
  )
}
