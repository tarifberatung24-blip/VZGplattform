import { redirect } from "next/navigation"
import { ProviderAuditTimeline } from "@/components/finance/provider-audit-timeline"
import { FinanceModulePage } from "@/components/finance/module-page"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: integrations } = await supabase
    .from("provider_integrations")
    .select("id,provider_key,display_name,capability_status,availability")
    .order("created_at", { ascending: true })

  const { data: attempts } = await supabase
    .from("provider_submission_attempts")
    .select("id,user_id,provider_id,lifecycle_status,correlation_id,created_at,provider_submission_events(id,event_type,redacted_metadata,created_at)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(10)

  const elsterIntegration = integrations?.find((i) => i.provider_key === "elster")
  const elsterAttempts = attempts?.filter((a) => a.provider_id === elsterIntegration?.id) ?? []
  const latestAttempt = elsterAttempts[0]

  return (
    <main className="min-h-screen bg-background">
      <FinanceModulePage
        title="Доставчици и статус"
        description="Преглед на наличните доставчици, техния статус и история на подаванията."
        items={[
          `${elsterIntegration?.display_name} е ${elsterIntegration?.availability === 'PRODUCTION' ? 'наличен' : 'планиран'}.`,
          "Всяко подаване се регистрира в неизменяем одит лог.",
          "Никога не се съхраняват пароли или сертификати.",
          "Подаванията изискват явно потвърждение от Вас.",
        ]}
      />
      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-10 space-y-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Наличност</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">ELSTER / ERiC</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {elsterIntegration?.availability === "PRODUCTION"
              ? "ELSTER подаванията са налични в production."
              : "ELSTER подаванията се планират. Текущо статус е: Чернови и прегледи се подготвят без изпращане."}
          </p>
          {elsterIntegration && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Статус на наличност</p>
                <p className="mt-1 font-medium text-foreground">
                  {elsterIntegration.availability === "PRODUCTION" ? "Production" : "Планиран"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Възможност</p>
                <p className="mt-1 font-medium text-foreground">
                  {elsterIntegration.capability_status === "AVAILABLE" ? "Активна" : "Недостъпна"}
                </p>
              </div>
            </div>
          )}
        </div>

        <ProviderAuditTimeline
          events={latestAttempt?.provider_submission_events ?? []}
          currentStatus={latestAttempt?.lifecycle_status as any}
          providerName="ELSTER"
        />

        {elsterAttempts.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">История</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Последни подаванията</h3>
            <div className="mt-4 space-y-2">
              {elsterAttempts.slice(0, 5).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{attempt.correlation_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleString("bg-BG")}
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {attempt.lifecycle_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
