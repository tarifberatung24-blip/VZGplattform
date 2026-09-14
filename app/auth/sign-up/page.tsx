"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isSupportedMobile, normalizeGermanMobile, phoneAuthMessage } from "@/lib/supabase/phone-auth"
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
        google: "Mit Google registrieren",
        phone: "Mit Telefonnummer registrieren",
        phoneTitle: "Registrierung per SMS",
        phoneLabel: "Mobilnummer",
        phoneHint: "Zum Beispiel +49 151 12345678",
        sendCode: "SMS-Code senden",
        codeLabel: "SMS-Code",
        verifyCode: "Konto erstellen",
        useEmail: "Mit E-Mail registrieren",
        or: "oder",
        codeSent: "Wir haben dir einen SMS-Code geschickt.",
        invalidPhone: "Bitte gib eine gültige Mobilnummer mit Ländervorwahl ein.",
        authError: "Diese Registrierungsmethode ist derzeit nicht verfügbar.",
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
        google: "Регистрация с Google",
        phone: "Регистрация с телефонен номер",
        phoneTitle: "Регистрация със SMS",
        phoneLabel: "Мобилен номер",
        phoneHint: "Например +49 151 12345678",
        sendCode: "Изпрати SMS код",
        codeLabel: "SMS код",
        verifyCode: "Създай акаунт",
        useEmail: "Регистрация с имейл",
        or: "или",
        codeSent: "Изпратихме SMS код на посочения номер.",
        invalidPhone: "Въведи валиден мобилен номер с код на държава.",
        authError: "Този начин за регистрация временно не е достъпен.",
        existing: "Вече си регистриран?",
        login: "Вход",
      }
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [phoneStep, setPhoneStep] = useState<"start" | "verify">("start")
  const [phoneMode, setPhoneMode] = useState(false)
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

  async function signUpWithGoogle() {
    setLoading(true)
    setEmailError(null)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}/protected`)}`
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    if (error) {
      setEmailError(copy.authError)
      setLoading(false)
    }
  }

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setEmailError(null)
    const normalizedPhone = normalizeGermanMobile(phone)
    if (!isSupportedMobile(normalizedPhone)) {
      setEmailError(copy.invalidPhone)
      setLoading(false)
      return
    }

    if (phoneStep === "start") {
      const { error } = await createClient().auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true, data: { first_name: name } },
      })
      if (error) setEmailError(de ? phoneAuthMessage(error.message) : copy.authError)
      else setPhoneStep("verify")
    } else {
      const { error } = await createClient().auth.verifyOtp({ phone: normalizedPhone, token: otp, type: "sms" })
      if (error) setEmailError(de ? phoneAuthMessage(error.message) : copy.authError)
      else {
        router.replace(`/${locale}/protected`)
        router.refresh()
      }
    }
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

        {phoneMode ? <form onSubmit={submitPhone} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone-name">{copy.firstName}</Label>
            <Input id="phone-name" autoComplete="given-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{copy.phoneLabel}</Label>
            <Input id="phone" type="tel" autoComplete="tel" placeholder={copy.phoneHint} required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          {phoneStep === "verify" && <div className="space-y-2">
            <Label htmlFor="otp">{copy.codeLabel}</Label>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value)} />
          </div>}
          {phoneStep === "verify" && <p className="text-sm text-muted-foreground">{copy.codeSent}</p>}
          {emailError && <p role="alert" className="text-sm text-destructive">{emailError}</p>}
          <Button className="w-full" disabled={loading}>{loading ? copy.creating : phoneStep === "start" ? copy.sendCode : copy.verifyCode}</Button>
        </form> : <form onSubmit={submit} className="mt-8 space-y-5">
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
        </form>}

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{copy.or}<span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={signUpWithGoogle}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.69 2.92-4.18 2.92-7.75Z" /><path fill="#34A853" d="M12 21.76c2.62 0 4.82-.87 6.43-2.35l-3.14-2.79c-.87.59-1.98.94-3.29.94-2.53 0-4.67-1.71-5.44-4.01H3.31v2.88A9.72 9.72 0 0 0 12 21.76Z" /><path fill="#FBBC05" d="M6.56 13.55A5.85 5.85 0 0 1 6.25 12c0-.54.1-1.06.31-1.55V7.57H3.31A9.75 9.75 0 0 0 2.28 12c0 1.57.38 3.06 1.03 4.43l3.25-2.88Z" /><path fill="#EA4335" d="M12 6.44c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3.54 14.62 2.24 12 2.24a9.72 9.72 0 0 0-8.69 5.33l3.25 2.88c.77-2.3 2.91-4.01 5.44-4.01Z" /></svg>
            {copy.google}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => { setPhoneMode((value) => !value); setEmailError(null); setPhoneStep("start") }}>
            {phoneMode ? copy.useEmail : copy.phone}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {copy.existing} <Link href={`/${locale}/auth/login`} className="font-medium text-primary">{copy.login}</Link>
        </p>
      </div>
    </main>
  )
}
