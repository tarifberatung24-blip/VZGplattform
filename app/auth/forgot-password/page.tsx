"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"
import { HorizonWordmark } from "@/components/brand/horizon-wordmark"
import { classifyAuthError } from "@/lib/supabase/auth-errors"

export default function ForgotPasswordPage() {
  const { locale, t } = useLanguage()
  const isBg = locale === "bg"
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/update-password`)}`,
    })

    if (resetError) {
      setError(classifyAuthError(resetError) === "rate_limited"
        ? isBg
          ? "Направени са твърде много опити. Изчакай малко и опитай отново."
          : "Zu viele Versuche. Warte kurz und versuche es erneut."
        : isBg
          ? "Линкът не беше изпратен. Опитай отново след малко."
          : "Der Link wurde nicht gesendet. Versuche es gleich noch einmal.")
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="paper w-full max-w-md p-8">
        <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-primary"><HorizonWordmark className="h-[1.1em]" /><span className="mt-1 block text-[10px] text-muted-foreground">VZG CONSULT</span></Link>
        <h1 className="mt-8 text-3xl font-bold text-foreground">{t.auth.forgotTitle}</h1>
        <p className="mt-2 leading-6 text-muted-foreground">{t.auth.forgotDescription}</p>

        {sent ? (
          <div className="mt-7 space-y-5">
            <p className="paper paper-note paper-note-success p-4 text-sm leading-6 text-foreground" role="status">
              {t.auth.emailSent}
            </p>
            <Button asChild className="w-full"><Link href={`/${locale}/auth/login`}>{t.auth.backToLogin}</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t.auth.emailLabel}</Label>
              <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? t.auth.sending : t.auth.sendLink}</Button>
            <Button asChild variant="ghost" className="w-full"><Link href={`/${locale}/auth/login`}>{t.auth.backToLogin}</Link></Button>
          </form>
        )}
      </div>
    </main>
  )
}
