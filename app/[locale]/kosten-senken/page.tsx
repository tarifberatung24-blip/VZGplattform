import { redirect } from "next/navigation"
import { CostReductionIntake } from "@/components/cost-reduction/cost-reduction-intake"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Намали разходите си",
  description: "Лична заявка за проверка на тарифа за ток, газ или отопление.",
}

export default async function CostReductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/${locale}/kosten-senken`)

  return <CostReductionIntake locale={locale} />
}
