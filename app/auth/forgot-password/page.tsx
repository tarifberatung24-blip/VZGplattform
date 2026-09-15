"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })

    if (resetError) {
      setError(resetError.message.toLowerCase().includes("rate")
        ? "Твърде много опити. Изчакай малко и опитай отново."
        : "Имейлът не можа да бъде изпратен. Опитай отново.")
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">VZGplattform<span className="mt-1 block text-[10px] text-muted-foreground">BY VZG CONSULT</span></Link>
        <h1 className="mt-8 text-3xl font-bold text-foreground">{t.auth.forgotTitle}</h1>
        <p className="mt-2 leading-6 text-muted-foreground">{t.auth.forgotDescription}</p>

        {sent ? (
          <div className="mt-7 space-y-5">
            <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm leading-6 text-foreground" role="status">
              {t.auth.emailSent}
            </p>
            <Button asChild className="w-full"><Link href="/auth/login">{t.auth.backToLogin}</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t.auth.emailLabel}</Label>
              <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? t.auth.sending : t.auth.sendLink}</Button>
            <Button asChild variant="ghost" className="w-full"><Link href="/auth/login">{t.auth.backToLogin}</Link></Button>
          </form>
        )}
      </div>
    </main>
  )
}
