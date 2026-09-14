"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { sanitizeNextPath } from "@/lib/supabase/auth-routing"

export function MfaChallenge() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    createClient().auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (!active) return
      const factor = data?.totp.find((item) => item.status === "verified")
      if (factorsError || !factor) setError("Няма активен Authenticator фактор за този профил.")
      else setFactorId(factor.id)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Въведи валиден 6-цифрен код.")
      return
    }

    setLoading(true)
    setError(null)
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code })
    if (verifyError) {
      setError("Кодът е грешен или е изтекъл. Въведи новия код от приложението.")
      setLoading(false)
      return
    }

    const next = sanitizeNextPath(new URLSearchParams(window.location.search).get("next"))
    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mfa-code">Код от Google Authenticator</Label>
        <Input id="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={loading || !factorId}>{loading ? "Проверка…" : "Потвърди и продължи"}</Button>
    </form>
  )
}
