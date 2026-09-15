"use client"

import { FormEvent, Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.replace(next)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Входът не беше успешен.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-cyan-300">VZGplattform</Link>
        <div className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><LockKeyhole /></div>
        <h1 className="mt-5 text-3xl font-semibold text-white">Вход в профила</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Влезте, за да запазвате проверки и да виждате личния си Workspace.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2"><span className="text-sm text-slate-300">Имейл</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/70" /></label>
          <label className="block space-y-2"><span className="text-sm text-slate-300">Парола</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/70" /></label>
          {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{loading && <Loader2 className="size-4 animate-spin" />}Вход</button>
        </form>
        <p className="mt-6 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="size-4 shrink-0 text-cyan-300" /> Данните се показват само на автентицирания потребител според Supabase RLS политиките.</p>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><LoginForm /></Suspense>
}
