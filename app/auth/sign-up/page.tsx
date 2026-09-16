"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n/language-context"

export default function SignUpPage() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = de
    ? {
        title: "Konto erstellen",
        intro: "Starte deinen KintexBG Kundenbereich.",
        firstName: "Vorname",
        email: "E-Mail",
        password: "Passwort",
        create: "Konto mit E-Mail erstellen",
        creating: "Wird erstellt...",
        passwordError: "Das Passwort muss mindestens 6 Zeichen haben.",
        genericError: "Registrierung konnte nicht abgeschlossen werden.",
        existing: "Schon registriert?",
        login: "Anmelden",
      }
    : {
        title: "Създай акаунт",
        intro: "Стартирай клиентската си зона в KintexBG.",
        firstName: "Име",
        email: "Имейл",
        password: "Парола",
        create: "Създай акаунт с имейл",
        creating: "Създаване...",
        passwordError: "Паролата трябва да е поне 6 символа.",
        genericError: "Регистрацията не можа да бъде завършена.",
        existing: "Вече си регистриран?",
        login: "Вход",
      }
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setEmailError(null)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? redirectTo,
        data: { first_name: name },
      },
    })
    if (error) setEmailError(error.message.toLowerCase().includes("password") ? copy.passwordError : copy.genericError)
    else router.push(data.session ? `/${locale}/protected` : `/${locale}/auth/sign-up-success`)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <Link href={`/${locale}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          KintexBG
          <span className="mt-1 block text-[10px] text-muted-foreground">BY VZG CONSULT</span>
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.intro}</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{copy.firstName}</Label>
            <Input id="name" autoComplete="given-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{copy.email}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{copy.password}</Label>
            <Input id="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {emailError && <p role="alert" className="text-sm text-destructive">{emailError}</p>}
          <Button className="w-full" disabled={loading}>{loading ? copy.creating : copy.create}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {copy.existing} <Link href={`/${locale}/auth/login`} className="font-medium text-primary">{copy.login}</Link>
        </p>
      </div>
    </main>
  )
}
