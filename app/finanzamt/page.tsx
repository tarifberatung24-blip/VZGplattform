import { redirect } from "next/navigation"
import { FinanzamtRequestForm } from "@/components/finance/finanzamt-request-form"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <main className="min-h-screen bg-background px-4 pb-12 pt-8"><div className="mx-auto max-w-3xl"><FinanzamtRequestForm /></div></main>
}
