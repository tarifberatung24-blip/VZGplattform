"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

type Contract = { id: string; category: string; monthly_cost: number | null; end_date?: string | null; cancellation_deadline?: string | null }
type Session = { id: string; status: string; filled_data: Record<string, { value: string | number | null; source: string }>; comparison: { old_monthly: number | null; new_monthly: number | null; saving: number | null }; partner_id: string | null; ai_explanation: string | null }
type StartResponse = { session?: Session; missing_critical?: string[]; partner_configured?: boolean; code?: string }
type ConfirmResponse = { redirect_url?: string | null; partner_configured?: boolean; disclosure?: string; code?: string }

export function OptimizeFlow({ contract }: { contract: Contract }) {
  const { t } = useLanguage()
  const copy = t.optimizeFlow
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [partnerConfigured, setPartnerConfigured] = useState(false)
  const [message, setMessage] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  async function start() {
    setLoading(true); setMessage(""); setSession(null); setMissing([]); setConfirmed(false)
    try {
      const category = contract.category === "insurance" ? "kfz" : "energy"
      const response = await fetch("/api/optimize/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: contract.id, category }) })
      const payload = await response.json() as StartResponse
      if (!response.ok || !payload.session) { setMessage(copy.startFailed); return }
      setSession(payload.session); setMissing(payload.missing_critical ?? []); setPartnerConfigured(Boolean(payload.partner_configured))
    } catch { setMessage(copy.startFailed) } finally { setLoading(false) }
  }

  async function confirm() {
    if (!session || missing.length > 0) return
    setLoading(true); setMessage("")
    try {
      const response = await fetch(`/api/optimize/${session.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) })
      const payload = await response.json() as ConfirmResponse
      if (!response.ok) { setMessage(copy.confirmFailed); return }
      setConfirmed(true); setMessage(payload.disclosure ?? copy.confirmed)
      if (payload.redirect_url) window.setTimeout(() => window.location.assign(payload.redirect_url!), 700)
    } catch { setMessage(copy.confirmFailed) } finally { setLoading(false) }
  }

  function sourceLabel(source: string) { return source === "document" ? copy.sourceDocument : source === "user_profile" ? copy.sourceProfile : copy.sourceAi }
  function value(key: string) { const item = session?.filled_data[key]; return item?.value == null || item.value === "" ? "NEEDS_DATA" : String(item.value) }

  if (!session) return <div className="mt-3"><Button variant="outline" size="sm" onClick={() => void start()} disabled={loading}>{loading ? <><Loader2 className="mr-2 size-4 animate-spin" />{copy.loading}</> : copy.optimize}</Button>{message && <p className="mt-2 text-xs text-destructive">{message}</p>}</div>

  return <div className="mt-4 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
    {loading && <div className="space-y-2"><div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin" />{copy.loading}</div><p className="text-xs text-muted-foreground">{copy.loadingSubtext}</p><div className="h-2 overflow-hidden rounded-full bg-primary/15"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div></div>}
    {!loading && <>
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.reviewTitle}</p><h4 className="mt-1 font-semibold">{copy.oldSituation}</h4></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">{copy.currentMonthly}</p><p className="font-medium">{session.comparison.old_monthly == null ? "NEEDS_DATA" : `${session.comparison.old_monthly.toFixed(2)} €`}</p></div><div><p className="text-xs text-muted-foreground">{copy.contractEnd}</p><p className="font-medium">{value("contract_end")}</p></div><div><p className="text-xs text-muted-foreground">{copy.clauses}</p><p className="font-medium">{value("cancellation_deadline")}</p></div></div>
      <div className="border-t border-primary/20 pt-4"><h4 className="font-semibold">{copy.newOffer}</h4><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">{copy.newMonthly}</p><p className="font-medium">{session.comparison.new_monthly == null ? "NEEDS_DATA" : `${session.comparison.new_monthly.toFixed(2)} €`}</p></div><div><p className="text-xs text-muted-foreground">{copy.saving}</p><p className="font-medium">{session.comparison.saving == null ? "NEEDS_DATA" : `${session.comparison.saving.toFixed(2)} €`}</p></div><div><p className="text-xs text-muted-foreground">{copy.partner}</p><p className="font-medium">{session.partner_id ?? "NEEDS_DATA"}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{partnerConfigured ? copy.noSaving : copy.partnerNotConfigured}</p></div>
      {missing.length > 0 && <div className="rounded-lg border border-border bg-secondary p-3"><p className="font-medium">{copy.missing}</p><p className="mt-1 text-sm text-muted-foreground">{copy.missingSubtext}</p><ul className="mt-2 list-inside list-disc text-sm">{missing.map((field) => <li key={field}>{copy.missingFields[field as keyof typeof copy.missingFields] ?? field}</li>)}</ul></div>}
      <button type="button" className="flex items-center gap-2 text-sm font-medium text-primary" onClick={() => setDetailsOpen((open) => !open)}><ChevronDown className={`size-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />{copy.filledData}</button>
      {detailsOpen && <div className="grid gap-2 rounded-lg border border-border bg-background/60 p-3 text-sm sm:grid-cols-2">{Object.entries(session.filled_data).map(([key, item]) => <div key={key}><span className="text-muted-foreground">{key}: </span>{item.value == null ? "NEEDS_DATA" : String(item.value)} <span className="text-xs text-muted-foreground">({sourceLabel(item.source)})</span></div>)}</div>}
      <div className="flex flex-wrap gap-2"><Button onClick={() => void confirm()} disabled={loading || missing.length > 0 || confirmed}>{confirmed ? <><CheckCircle2 className="mr-2 size-4" />{copy.confirmed}</> : copy.confirm}</Button><Button variant="outline" onClick={() => setSession(null)} disabled={loading}>{copy.edit}</Button><Button variant="ghost" onClick={() => { setSession(null); setMessage("") }} disabled={loading}>{copy.cancel}</Button></div>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">{copy.partnerDisclosure}</p>
    </>}
  </div>
}
