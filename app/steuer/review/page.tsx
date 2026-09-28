import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { redirect } from "next/navigation"
import { ElsterReviewPackage } from "@/components/finance/elster-review-package"
import { SteuerTabs } from "@/components/finance/steuer-tabs"
import { createClient } from "@/lib/supabase/server"
import { requestLocale } from "@/lib/i18n/server-locale"

export default async function Page() {
  const locale = await requestLocale()
  const de = locale === "de"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: taxCase } = await supabase.from("tax_cases").select("data").eq("user_id", user.id).eq("tax_year", 2025).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  const answers = taxCase?.data && typeof taxCase.data === "object" && "questionnaire_answers" in taxCase.data ? (taxCase.data as { questionnaire_answers?: Record<string, unknown> }).questionnaire_answers ?? {} : {}
  return (
    <WorkspacePage>
      <div className="mt-6"><SteuerTabs /></div>
      <header className="mb-6 mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">HORIZON · Steuer 2025</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{de ? "Prüfung vor der Übermittlung" : "Преглед преди подаване"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{de ? "Kontrolliere die erfassten Angaben, bevor du sie für die zertifizierte Übermittlung vorbereitest." : "Провери въведените данни, преди да ги подготвиш за удостоверено подаване."}</p>
      </header>
      <ElsterReviewPackage unresolvedFields={Object.values(answers).filter((value) => !String(value ?? "").trim()).length} />
    </WorkspacePage>
  )
}
