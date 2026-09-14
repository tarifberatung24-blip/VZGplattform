import Link from "next/link"
import { redirect } from "next/navigation"
import { MfaChallenge } from "@/components/auth/mfa-challenge"
import { createClient } from "@/lib/supabase/server"

export default async function MfaVerifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">KintexBG<span className="mt-1 block text-[10px] text-muted-foreground">BY VZG CONSULT</span></Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Допълнителна защита</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Потвърди входа</h1>
        <p className="mt-2 leading-6 text-muted-foreground">Отвори Google Authenticator и въведи текущия 6-цифрен код.</p>
        <MfaChallenge />
      </div>
    </main>
  )
}
