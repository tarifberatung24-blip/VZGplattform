"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"
import type { Locale } from "@/lib/i18n/dictionaries"
import {
  nextOnboardingStep,
  onboardingPath,
  type OnboardingStep,
} from "@/lib/onboarding/state"
import { getOnboardingCopy } from "./copy"

type StepProps = { userId: string; step: OnboardingStep; previous: OnboardingStep | null }
type PersistResult = { error: { message: string } | null }
type Persist = () => Promise<PersistResult>

function Frame({
  previous,
  children,
}: {
  previous: OnboardingStep | null
  children: ReactNode
}) {
  const { locale } = useLanguage()
  const copy = getOnboardingCopy(locale)
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          {copy.brand}
          <span className="mt-1 block text-[10px] text-muted-foreground">{copy.brandNote}</span>
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {copy.stepLabel}
        </p>
        {previous ? (
          <Link
            href={onboardingPath(previous, locale) ?? `/${locale}/dashboard`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            {copy.back}
          </Link>
        ) : null}
        {children}
      </div>
    </main>
  )
}

function useAdvance(userId: string, step: OnboardingStep) {
  const { locale } = useLanguage()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getOnboardingCopy(locale)

  // `localeOverride` exists for the language step: there the new locale is
  // chosen in the same tick as the redirect, and context state has not re-rendered
  // yet, so the path must not be built from the previous locale.
  async function advance(
    persist?: Persist,
    localeOverride?: Locale,
  ) {
    const activeLocale = localeOverride ?? locale
    setBusy(true)
    setError(null)
    const target = nextOnboardingStep(step)
    const result = persist
      ? await persist()
      : await createClient().from("profiles").upsert({ id: userId, onboarding_step: target })
    setBusy(false)
    if (result.error) {
      setError(getOnboardingCopy(activeLocale).saveError)
      return
    }
    router.replace(onboardingPath(target, activeLocale) ?? `/${activeLocale}/dashboard`)
    router.refresh()
  }

  return { busy, error, copy, advance }
}

export function LanguageStep({ userId, step, previous }: StepProps) {
  const { locale, setLocale } = useLanguage()
  const { busy, error, copy, advance } = useAdvance(userId, step)

  function choose(nextLocale: Locale) {
    setLocale(nextLocale)
    void advance(async () => {
      const client = createClient()
      const result = await client
        .from("profiles")
        .upsert({ id: userId, onboarding_step: nextOnboardingStep(step), locale: nextLocale })
      return { error: result.error }
    }, nextLocale)
  }

  return (
    <Frame previous={previous}>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{copy.language.title}</h1>
      <p className="mt-2 leading-6 text-muted-foreground">{copy.language.intro}</p>
      <p className="mt-6 text-sm font-medium text-foreground">{copy.language.label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["bg", "de"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={locale === value ? "default" : "outline"}
            disabled={busy}
            aria-pressed={locale === value}
            onClick={() => choose(value)}
          >
            {value.toUpperCase()}
          </Button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{copy.language.hint}</p>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
    </Frame>
  )
}

export function ProfileStep({ userId, step, previous }: StepProps) {
  const { locale } = useLanguage()
  const { busy, error, copy, advance } = useAdvance(userId, step)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void advance(async () => {
      const result = await createClient()
        .from("profiles")
        .upsert({
          id: userId,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          preferred_language: locale,
          locale,
          onboarding_step: nextOnboardingStep(step),
        })
      return { error: result.error }
    })
  }

  return (
    <Frame previous={previous}>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{copy.profile.title}</h1>
      <p className="mt-2 leading-6 text-muted-foreground">{copy.profile.intro}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onboarding-first-name">
            {copy.profile.firstName} <span className="text-muted-foreground">({copy.profile.required})</span>
          </Label>
          <Input
            id="onboarding-first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="onboarding-last-name">
            {copy.profile.lastName} <span className="text-muted-foreground">({copy.profile.optional})</span>
          </Label>
          <Input
            id="onboarding-last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={busy}>
          {busy ? copy.saving : copy.next}
        </Button>
      </form>
    </Frame>
  )
}

export function TourStep({ userId, step, previous }: StepProps) {
  const { busy, error, copy, advance } = useAdvance(userId, step)

  return (
    <Frame previous={previous}>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{copy.tour.title}</h1>
      <p className="mt-2 leading-6 text-muted-foreground">{copy.tour.intro}</p>
      <ul className="mt-7 space-y-4">
        {copy.tour.items.map((item) => (
          <li key={item.title} className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-7 w-full" disabled={busy} onClick={() => void advance()}>
        {busy ? copy.saving : copy.next}
      </Button>
    </Frame>
  )
}

export function FinishStep({ userId, step, previous }: StepProps) {
  const { busy, error, copy, advance } = useAdvance(userId, step)

  return (
    <Frame previous={previous}>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{copy.finish.title}</h1>
      <p className="mt-2 leading-6 text-muted-foreground">{copy.finish.intro}</p>
      <p className="mt-6 text-sm text-foreground">{copy.finish.ready}</p>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-7 w-full" disabled={busy} onClick={() => void advance()}>
        {busy ? copy.saving : copy.toDashboard}
      </Button>
    </Frame>
  )
}