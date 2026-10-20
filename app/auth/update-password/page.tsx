"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { HorizonWordmark } from "@/components/brand/horizon-wordmark"
import { useLanguage } from "@/lib/i18n/language-context"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { locale } = useLanguage()
  const isBg = locale === "bg"
  const copy = isBg
    ? {
        title: "Нова парола",
        intro: "Избери нова парола с поне 8 знака.",
        invalidLink: "Линкът е невалиден или е изтекъл. Заяви нов линк.",
        checkFailed: "Линкът не можа да бъде проверен. Опитай отново.",
        tooShort: "Паролата трябва да съдържа поне 8 знака.",
        mismatch: "Двете пароли не съвпадат.",
        updateFailed: "Паролата не беше променена. Заяви нов линк и опитай отново.",
        checking: "Проверка на защитения линк…",
        success: "Паролата е променена. Пренасочваме те към таблото.",
        password: "Нова парола",
        confirmation: "Повтори паролата",
        saving: "Запазване…",
        save: "Запази новата парола",
        newLink: "Заяви нов линк",
      }
    : {
        title: "Neues Passwort",
        intro: "Wähle ein neues Passwort mit mindestens 8 Zeichen.",
        invalidLink: "Der Link ist ungültig oder abgelaufen. Fordere einen neuen Link an.",
        checkFailed: "Der Link konnte nicht geprüft werden. Versuche es erneut.",
        tooShort: "Das Passwort muss mindestens 8 Zeichen haben.",
        mismatch: "Die Passwörter stimmen nicht überein.",
        updateFailed: "Das Passwort wurde nicht geändert. Fordere einen neuen Link an und versuche es erneut.",
        checking: "Sicherer Link wird geprüft…",
        success: "Das Passwort wurde geändert. Du wirst zur Übersicht weitergeleitet.",
        password: "Neues Passwort",
        confirmation: "Passwort wiederholen",
        saving: "Wird gespeichert…",
        save: "Neues Passwort speichern",
        newLink: "Neuen Link anfordern",
      }
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionValid, setSessionValid] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    createClient().auth.getUser()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        const valid = Boolean(data.user) && !sessionError
        setSessionValid(valid)
        if (!valid) setError(copy.invalidLink)
      })
      .catch(() => {
        if (active) setError(copy.checkFailed)
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [copy.checkFailed, copy.invalidLink])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => {
      router.replace(`/${locale}/dashboard`)
      router.refresh()
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [locale, router, success])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!sessionValid) {
      setError(copy.invalidLink)
      return
    }
    if (password.length < 8) {
      setError(copy.tooShort)
      return
    }
    if (password !== confirmation) {
      setError(copy.mismatch)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(copy.updateFailed)
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="paper w-full max-w-md p-8">
        <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-primary"><HorizonWordmark className="h-[1.1em]" /><span className="mt-1 block text-[10px] text-muted-foreground">VZG CONSULT</span></Link>
        <h1 className="mt-8 text-3xl font-bold text-foreground">{copy.title}</h1>
        <p className="mt-2 leading-6 text-muted-foreground">{copy.intro}</p>
        {checkingSession ? (
          <p className="mt-7 text-sm text-muted-foreground" role="status">{copy.checking}</p>
        ) : success ? (
          <p className="paper paper-note paper-note-success mt-7 p-4 text-sm leading-6 text-foreground" role="status">
            {copy.success}
          </p>
        ) : sessionValid ? (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2"><Label htmlFor="new-password">{copy.password}</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">{copy.confirmation}</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? copy.saving : copy.save}</Button>
          </form>
        ) : (
          <div className="mt-7 space-y-4">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button asChild className="w-full"><Link href={`/${locale}/auth/forgot-password`}>{copy.newLink}</Link></Button>
          </div>
        )}
      </div>
    </main>
  )
}
