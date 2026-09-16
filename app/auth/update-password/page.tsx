"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Паролата трябва да съдържа поне 8 знака.")
      return
    }
    if (password !== confirmation) {
      setError("Двете пароли не съвпадат.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError("Паролата не можа да бъде променена. Заяви нов линк и опитай отново.")
      setLoading(false)
      return
    }

    router.replace("/protected")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">KintexBG<span className="mt-1 block text-[10px] text-muted-foreground">BY VZG CONSULT</span></Link>
        <h1 className="mt-8 text-3xl font-bold text-foreground">Нова парола</h1>
        <p className="mt-2 leading-6 text-muted-foreground">Избери нова парола с поне 8 знака.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div className="space-y-2"><Label htmlFor="new-password">Нова парола</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Повтори паролата</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Запазване…" : "Запази новата парола"}</Button>
        </form>
      </div>
    </main>
  )
}
