import { redirect } from "next/navigation"
import { CostReductionIntake } from "@/components/cost-reduction/cost-reduction-intake"
import { loadCostReductionRequests } from "@/lib/horizon/cost-reduction/requests"
import { createClient } from "@/lib/supabase/server"
import { isLocale, defaultLocale } from "@/lib/i18n/dictionaries"
import { localizedLoginPath } from "@/lib/supabase/auth-routing"

export const metadata = {
  title: "Намали разходите си",
  description: "Лична заявка за проверка на тарифа за ток, газ или отопление.",
}

export default async function CostReductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(localizedLoginPath(locale, `/${locale}/kosten-senken`))

  const requests = await loadCostReductionRequests()
  return <CostReductionIntake locale={locale} requests={requests} />
}
