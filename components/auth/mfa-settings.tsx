"use client"

import { FormEvent, useEffect, useState } from "react"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type Enrollment = { id: string; qrCode: string; secret: string }

export function MfaSettings() {
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
      if (factorsError) setError("Състоянието на двуфакторната защита не можа да бъде заредено.")
      setActiveFactorId(factor?.id ?? null)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function startEnrollment() {
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) {
      setError("Настройката не можа да бъде стартирана.")
      setLoading(false)
      return
    }

    for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Google Authenticator" })
    if (enrollError) {
      setError("Настройката не можа да бъде стартирана. Опитай отново.")
    } else {
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    }
    setLoading(false)
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError("Въведи валиден 6-цифрен код.")
      return
    }

    setLoading(true)
    setError(null)
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code })
    if (verifyError) {
      setError("Кодът е грешен или е изтекъл. Въведи текущия код от приложението.")
    } else {
      setActiveFactorId(enrollment.id)
      setEnrollment(null)
      setCode("")
      setMessage("Двуфакторната защита е активирана успешно.")
    }
    setLoading(false)
  }

  async function disable() {
    if (!activeFactorId || !window.confirm("Да изключим ли двуфакторната защита за този профил?")) return
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({ factorId: activeFactorId })
    if (unenrollError) setError("Защитата не можа да бъде изключена. Влез отново с Authenticator кода и опитай пак.")
    else {
      setActiveFactorId(null)
      setMessage("Двуфакторната защита е изключена.")
    }
    setLoading(false)
  }

  if (loading && !enrollment && !activeFactorId) return <p className="mt-6 text-sm text-muted-foreground">Зареждане…</p>

  return (
    <div className="mt-6">
      {activeFactorId ? (
        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-success" /><p className="font-semibold text-foreground">Google Authenticator е активиран</p></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">При следващ вход ще бъде поискан 6-цифрен код.</p>
          <Button type="button" variant="outline" className="mt-4" disabled={loading} onClick={disable}>Изключи 2FA</Button>
        </div>
      ) : enrollment ? (
        <form onSubmit={verify} className="space-y-5">
          <div className="rounded-xl border border-border bg-background p-5 text-center">
            {/* Supabase returns the QR code as a data URL for authenticator apps. */}
            <img src={enrollment.qrCode} alt="QR код за Google Authenticator" className="mx-auto size-52 rounded-lg bg-white p-2" />
            <p className="mt-4 text-sm text-muted-foreground">Не можеш да сканираш? Въведи този ключ ръчно:</p>
            <code className="mt-2 block break-all rounded-lg bg-muted p-3 text-sm text-foreground">{enrollment.secret}</code>
          </div>
          <div className="space-y-2"><Label htmlFor="enrollment-code">Код от приложението</Label><Input id="enrollment-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
          <div className="flex flex-wrap gap-3"><Button disabled={loading}>{loading ? "Проверка…" : "Активирай 2FA"}</Button><Button type="button" variant="ghost" disabled={loading} onClick={() => { setEnrollment(null); setCode(""); setError(null) }}>Отказ</Button></div>
        </form>
      ) : (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">Препоръчителна допълнителна защита</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Сканирай QR код с Google Authenticator, Microsoft Authenticator или друга TOTP съвместима програма.</p></div></div>
          <Button type="button" className="mt-4" disabled={loading} onClick={startEnrollment}>Настрой Google Authenticator</Button>
        </div>
      )}
      {message && <p role="status" className="mt-4 text-sm text-success">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  )
}
