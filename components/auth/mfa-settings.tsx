"use client"

import { FormEvent, useEffect, useState } from "react"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"

type Enrollment = { id: string; qrCode: string; secret: string }

export function MfaSettings() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = de
    ? {
        loadStateError: "Der Status der Zwei-Faktor-Authentifizierung konnte nicht geladen werden.",
        startError: "Die Einrichtung konnte nicht gestartet werden.",
        startErrorRetry: "Die Einrichtung konnte nicht gestartet werden. Bitte erneut versuchen.",
        invalidCode: "Bitte einen gültigen 6-stelligen Code eingeben.",
        verifyError: "Der Code ist falsch oder abgelaufen. Bitte den aktuellen Code aus der App eingeben.",
        enabled: "Die Zwei-Faktor-Authentifizierung wurde erfolgreich aktiviert.",
        disableConfirm: "Zwei-Faktor-Authentifizierung für dieses Konto deaktivieren?",
        disableError: "Die Schutzfunktion konnte nicht deaktiviert werden. Bitte erneut mit dem Authenticator-Code anmelden und erneut versuchen.",
        disabled: "Die Zwei-Faktor-Authentifizierung wurde deaktiviert.",
        loading: "Wird geladen…",
        enabledTitle: "Google Authenticator ist aktiviert",
        enabledBody: "Beim nächsten Login wird ein 6-stelliger Code verlangt.",
        disable: "2FA deaktivieren",
        scanHint: "Du kannst den QR-Code nicht scannen? Gib diesen Schlüssel manuell ein:",
        codeLabel: "Code aus der App",
        verifying: "Prüfung…",
        activate: "2FA aktivieren",
        cancel: "Abbrechen",
        recommendTitle: "Empfohlener zusätzlicher Schutz",
        recommendBody: "Scanne den QR-Code mit Google Authenticator, Microsoft Authenticator oder einer anderen TOTP-kompatiblen App.",
        setup: "Google Authenticator einrichten",
      }
    : {
        loadStateError: "Състоянието на двуфакторната защита не можа да бъде заредено.",
        startError: "Настройката не можа да бъде стартирана.",
        startErrorRetry: "Настройката не можа да бъде стартирана. Опитай отново.",
        invalidCode: "Въведи валиден 6-цифрен код.",
        verifyError: "Кодът е грешен или е изтекъл. Въведи текущия код от приложението.",
        enabled: "Двуфакторната защита е активирана успешно.",
        disableConfirm: "Да изключим ли двуфакторната защита за този профил?",
        disableError: "Защитата не можа да бъде изключена. Влез отново с Authenticator кода и опитай пак.",
        disabled: "Двуфакторната защита е изключена.",
        loading: "Зареждане…",
        enabledTitle: "Google Authenticator е активиран",
        enabledBody: "При следващ вход ще бъде поискан 6-цифрен код.",
        disable: "Изключи 2FA",
        scanHint: "Не можеш да сканираш? Въведи този ключ ръчно:",
        codeLabel: "Код от приложението",
        verifying: "Проверка…",
        activate: "Активирай 2FA",
        cancel: "Отказ",
        recommendTitle: "Препоръчителна допълнителна защита",
        recommendBody: "Сканирай QR код с Google Authenticator, Microsoft Authenticator или друга TOTP съвместима програма.",
        setup: "Настрой Google Authenticator",
      }
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    createClient().auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (!active) return
      const factor = data?.totp.find((item) => item.status === "verified")
      if (factorsError) setError(copy.loadStateError)
      setActiveFactorId(factor?.id ?? null)
      setLoading(false)
    })
    return () => { active = false }
  }, [copy.loadStateError])

  async function startEnrollment() {
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) {
      setError(copy.startError)
      setLoading(false)
      return
    }

    for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Google Authenticator" })
    if (enrollError) {
      setError(copy.startErrorRetry)
    } else {
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    }
    setLoading(false)
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError(copy.invalidCode)
      return
    }

    setLoading(true)
    setError(null)
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code })
    if (verifyError) {
      setError(copy.verifyError)
    } else {
      setActiveFactorId(enrollment.id)
      setEnrollment(null)
      setCode("")
      setMessage(copy.enabled)
    }
    setLoading(false)
  }

  async function disable() {
    if (!activeFactorId || !window.confirm(copy.disableConfirm)) return
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({ factorId: activeFactorId })
    if (unenrollError) setError(copy.disableError)
    else {
      setActiveFactorId(null)
      setMessage(copy.disabled)
    }
    setLoading(false)
  }

  if (loading && !enrollment && !activeFactorId) return <p className="mt-6 text-sm text-muted-foreground">{copy.loading}</p>

  return (
    <div className="mt-6">
      {activeFactorId ? (
        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-success" /><p className="font-semibold text-foreground">{copy.enabledTitle}</p></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.enabledBody}</p>
          <Button type="button" variant="outline" className="mt-4" disabled={loading} onClick={disable}>{copy.disable}</Button>
        </div>
      ) : enrollment ? (
        <form onSubmit={verify} className="space-y-5">
          <div className="rounded-xl border border-border bg-background p-5 text-center">
            {/* Supabase returns the QR code as a data URL for authenticator apps. */}
            <img src={enrollment.qrCode} alt={de ? "QR-Code für Google Authenticator" : "QR код за Google Authenticator"} className="mx-auto size-52 rounded-lg bg-white p-2" />
            <p className="mt-4 text-sm text-muted-foreground">{copy.scanHint}</p>
            <code className="mt-2 block break-all rounded-lg bg-muted p-3 text-sm text-foreground">{enrollment.secret}</code>
          </div>
          <div className="space-y-2"><Label htmlFor="enrollment-code">{copy.codeLabel}</Label><Input id="enrollment-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
          <div className="flex flex-wrap gap-3"><Button disabled={loading}>{loading ? copy.verifying : copy.activate}</Button><Button type="button" variant="ghost" disabled={loading} onClick={() => { setEnrollment(null); setCode(""); setError(null) }}>{copy.cancel}</Button></div>
        </form>
      ) : (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">{copy.recommendTitle}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.recommendBody}</p></div></div>
          <Button type="button" className="mt-4" disabled={loading} onClick={startEnrollment}>{copy.setup}</Button>
        </div>
      )}
      {message && <p role="status" className="mt-4 text-sm text-success">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  )
}
