"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/i18n/language-context"
import { getNegotiationCopy } from "@/lib/horizon/negotiation/copy"
import { PREFERENCE_ITEMS, type PreferenceItem } from "@/lib/horizon/negotiation/preferences"
import type { DecisionAction, NegotiationState } from "@/lib/horizon/negotiation/contract"

/**
 * HORIZON OPTIMIZE — the negotiation surface for one contract.
 *
 * It is functionality-first and reuses the existing primitives and copy module
 * rather than introducing a new design language. Two product rules are enforced
 * in the UI as well as on the server: a missing comparison reads as "comparison
 * data required" instead of a number, and an offer is never accepted without an
 * explicit click on a review screen that shows the binding term.
 */

type Decision = {
  action: DecisionAction
  reason_codes: string[]
  missing_information: string[]
  opportunity_confidence: number | null
  next_review_date: string | null
  current_monthly_cost: number | null
  target_monthly_cost: number | null
  potential_monthly_saving: number | null
  potential_annual_saving: number | null
  comparison_data_required: boolean
}

type Offer = {
  id: string
  status: string
  content_hash: string
}

type Comparison = {
  current: { monthlyCost: number | null; remainingMonths: number | null }
  providerOffer: {
    monthlyCost: number | null
    newContractDurationMonths: number | null
    activationFee: number | null
    hardwareFee: number | null
    oneTimeCredit: number | null
    promotionDurationMonths: number | null
  }
  approvedAlternative: { monthlyCost: number | null }
  savings: {
    monthlyRecurringSaving: number | null
    annualizedRecurringSaving: number | null
    additionalBindingMonths: number | null
    netFirstYearEffect: number | null
    warnings: string[]
  }
  blockedByPreferences: boolean
  contentHash: string
}

type VerificationOutcome = {
  result: string
  discrepancies: Array<{ field: string; expected: number | null; actual: number | null }>
  verified_saving: { verifiedMonthlySaving: number | null; verifiedAnnualSaving: number | null }
}

type StartResponse = {
  session?: { id: string; state: NegotiationState }
  decision?: Decision
  code?: string
}

type OfferResponse = { offer?: Offer; comparison?: Comparison; code?: string }
type DecisionResponse = {
  decision?: string
  offer_status?: string | null
  savings?: Comparison
  switch_fallback?: boolean
  code?: string
}

const eur = (value: number | null | undefined) =>
  value == null ? null : `${value.toFixed(2).replace(".", ",")} €`

export function NegotiationCenter({ contractId }: { contractId: string }) {
  const { locale } = useLanguage()
  const copy = getNegotiationCopy(locale)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<NegotiationState | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [mustKeep, setMustKeep] = useState<PreferenceItem[]>([])
  const [mustNever, setMustNever] = useState<PreferenceItem[]>([])
  const [minSaving, setMinSaving] = useState("")
  const [preferencesSaved, setPreferencesSaved] = useState(false)

  const [offerText, setOfferText] = useState("")
  const [offer, setOffer] = useState<Offer | null>(null)
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [decisionDone, setDecisionDone] = useState<string | null>(null)

  const [billMonthly, setBillMonthly] = useState("")
  const [verification, setVerification] = useState<VerificationOutcome | null>(null)

  const [authorizationScope, setAuthorizationScope] = useState("")
  const [authorizationStatus, setAuthorizationStatus] = useState<string | null>(null)
  const [modeBStatus, setModeBStatus] = useState<string | null>(null)

  const value = (key: string) => copy.missing[key] ?? key

  /** Reads back the server's own authorization and queue state, never a guess. */
  async function refreshSession() {
    if (!sessionId) return
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}`)
      if (!response.ok) return
      const payload = (await response.json()) as {
        session?: { authorization_status?: string; mode_b_status?: string | null }
      }
      setAuthorizationStatus(payload.session?.authorization_status ?? null)
      setModeBStatus(payload.session?.mode_b_status ?? null)
    } catch {
      // A read-back failure leaves the last known state; it never fabricates one.
    }
  }

  async function grantAuthorization() {
    if (!sessionId || !authorizationScope.trim()) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: authorizationScope.trim(), granted: true }),
      })
      if (!response.ok) { setError(copy.assistedQueueFailed); return }
      setAuthorizationStatus("granted")
      setMessage(copy.assistedQueued)
    } catch { setError(copy.assistedQueueFailed) } finally { setBusy(false) }
  }

  async function handOffToOperator() {
    if (!sessionId) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/assisted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
      const payload = (await response.json()) as { status?: string; code?: string }
      if (!response.ok) {
        setError(
          payload.code === "NEGOTIATION_ASSISTED_AUTHORIZATION_REQUIRED"
            ? copy.assistedAuthorizationRequired
            : payload.code === "NEGOTIATION_ASSISTED_QUEUE_NOT_CONFIGURED"
              ? copy.assistedNotConfigured
              : copy.assistedQueueFailed,
        )
        return
      }
      setModeBStatus(payload.status ?? "QUEUED")
      setMessage(copy.assistedQueued)
    } catch { setError(copy.assistedQueueFailed) } finally { setBusy(false) }
  }

  async function cancelHandoff() {
    if (!sessionId) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/assisted`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      if (!response.ok) { setError(copy.assistedCancelFailed); return }
      setModeBStatus("CANCELLED")
      setMessage(copy.assistedCancelled)
    } catch { setError(copy.assistedCancelFailed) } finally { setBusy(false) }
  }

  async function analyze() {
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch("/api/negotiation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      })
      const payload = (await response.json()) as StartResponse
      if (!response.ok || !payload.session) {
        setError(payload.code === "NEGOTIATION_CONTRACT_NOT_ELIGIBLE" ? copy.notEligible : copy.analysisFailed)
        return
      }
      setSessionId(payload.session.id)
      setState(payload.session.state)
      setDecision(payload.decision ?? null)
      void refreshSession()
    } catch { setError(copy.analysisFailed) } finally { setBusy(false) }
  }

  function toggle(list: PreferenceItem[], setList: (next: PreferenceItem[]) => void, item: PreferenceItem) {
    setList(list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item])
  }

  async function savePreferences() {
    if (!sessionId) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mustKeep,
          mayAccept: [],
          mustNeverAccept: mustNever,
          minMonthlySaving: minSaving ? Number(minSaving) : null,
        }),
      })
      if (!response.ok) { setError(copy.preferencesSaveFailed); return }
      setPreferencesSaved(true); setMessage(copy.preferencesSaved)
    } catch { setError(copy.preferencesSaveFailed) } finally { setBusy(false) }
  }

  async function submitOffer() {
    if (!sessionId || !offerText.trim()) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: "provider", source: "user_paste", text: offerText.trim() }),
      })
      const payload = (await response.json()) as OfferResponse
      if (!response.ok || !payload.offer) { setError(copy.offerSaveFailed); return }
      setOffer(payload.offer); setComparison(payload.comparison ?? null)
      setMessage(copy.offerSaved)
    } catch { setError(copy.offerSaveFailed) } finally { setBusy(false) }
  }

  async function decide(choice: "ACCEPT" | "COUNTER" | "REJECT" | "COMPARE_SWITCH") {
    if (!sessionId || !offer) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/offers/${offer.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: choice,
          approvedHash: choice === "ACCEPT" ? offer.content_hash : null,
        }),
      })
      const payload = (await response.json()) as DecisionResponse
      if (!response.ok) {
        setError(
          payload.code === "NEGOTIATION_OFFER_VIOLATES_PREFERENCES"
            ? copy.acceptBlockedPreferences
            : payload.code === "NEGOTIATION_APPROVAL_HASH_MISMATCH"
              ? copy.acceptBlockedHash
              : copy.decisionFailed,
        )
        return
      }
      setDecisionDone(payload.decision ?? choice)
      if (payload.savings) setComparison(payload.savings)
      setMessage(copy.decisionRecorded)
    } catch { setError(copy.decisionFailed) } finally { setBusy(false) }
  }

  async function verifyBill() {
    if (!sessionId || !billMonthly) return
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/negotiation/session/${sessionId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyCost: Number(billMonthly) }),
      })
      const payload = (await response.json()) as VerificationOutcome & { code?: string }
      if (!response.ok) { setError(copy.billFailed); return }
      setVerification(payload); setMessage(copy.billSaved)
    } catch { setError(copy.billFailed) } finally { setBusy(false) }
  }

  if (!sessionId) {
    return (
      <div className="mt-3 space-y-2">
        <Button variant="outline" size="sm" onClick={() => void analyze()} disabled={busy}>
          {busy ? <><Loader2 className="mr-2 size-4 animate-spin" />{copy.analyzing}</> : copy.optimizeAction}
        </Button>
        <p className="text-xs text-muted-foreground">{copy.entryIntro}</p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.centerTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.centerIntro}</p>
      </div>

      {state && <p className="text-xs text-muted-foreground">{copy.stateLabel}: <span className="font-medium text-foreground">{copy.states[state]}</span></p>}

      {decision && (
        <div className="space-y-3 border border-border bg-background/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{copy.decisionLabel}:</span>
            <span className="font-semibold">{copy.actions[decision.action]}</span>
            {decision.next_review_date && (
              <span className="text-xs text-muted-foreground">{copy.nextReview}: {decision.next_review_date}</span>
            )}
          </div>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {decision.reason_codes.map((reason) => <li key={reason}>{copy.reasons[reason] ?? reason}</li>)}
          </ul>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">{copy.currentMonthly}: </span>{eur(decision.current_monthly_cost) ?? copy.comparisonRequired}</div>
            <div><span className="text-muted-foreground">{copy.targetMonthly}: </span>{decision.comparison_data_required ? copy.comparisonRequired : eur(decision.target_monthly_cost)}</div>
            <div><span className="text-muted-foreground">{copy.potentialMonthlySaving}: </span>{decision.comparison_data_required ? copy.comparisonRequired : eur(decision.potential_monthly_saving)}</div>
            <div><span className="text-muted-foreground">{copy.potentialAnnualSaving}: </span>{decision.comparison_data_required ? copy.comparisonRequired : eur(decision.potential_annual_saving)}</div>
          </div>
          {decision.comparison_data_required && <p className="text-xs text-muted-foreground">{copy.noSavingManufactured}</p>}
          {decision.missing_information.length > 0 && (
            <p className="text-xs text-muted-foreground">{decision.missing_information.map(value).join(" · ")}</p>
          )}
        </div>
      )}

      {/* Preferences — set before negotiating so a hard constraint can block an offer. */}
      <div className="space-y-3 border border-border bg-background/60 p-3">
        <div>
          <p className="font-medium">{copy.preferencesTitle}</p>
          <p className="text-xs text-muted-foreground">{copy.preferencesIntro}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium">{copy.mustKeep}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {PREFERENCE_ITEMS.map((item) => (
                <button
                  key={`keep-${item}`}
                  type="button"
                  aria-pressed={mustKeep.includes(item)}
                  onClick={() => toggle(mustKeep, setMustKeep, item)}
                  className={`border px-2 py-1 text-xs ${mustKeep.includes(item) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {copy.preferenceItems[item] ?? item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium">{copy.mustNeverAccept}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {PREFERENCE_ITEMS.map((item) => (
                <button
                  key={`never-${item}`}
                  type="button"
                  aria-pressed={mustNever.includes(item)}
                  onClick={() => toggle(mustNever, setMustNever, item)}
                  className={`border px-2 py-1 text-xs ${mustNever.includes(item) ? "border-destructive bg-destructive/10" : "border-border"}`}
                >
                  {copy.preferenceItems[item] ?? item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Input
          aria-label={copy.minSaving}
          type="number"
          min="0"
          step="0.01"
          value={minSaving}
          onChange={(event) => setMinSaving(event.target.value)}
          placeholder={copy.minSaving}
        />
        <Button size="sm" onClick={() => void savePreferences()} disabled={busy || preferencesSaved}>
          {preferencesSaved ? <><CheckCircle2 className="mr-2 size-4" />{copy.preferencesSaved}</> : copy.save}
        </Button>
      </div>

      {/* MODE B — assisted handoff to a VZG operator. The handoff is refused
          without a granted authorization, so the control mirrors that rule. */}
      <div className="space-y-3 border border-border bg-background/60 p-3">
        <div>
          <p className="font-medium">{copy.assistedHandoffTitle}</p>
          <p className="text-xs text-muted-foreground">{copy.assistedHandoffIntro}</p>
        </div>

        {authorizationStatus !== "granted" ? (
          <>
            <Input
              aria-label={copy.assistedHandoffTitle}
              value={authorizationScope}
              onChange={(event) => setAuthorizationScope(event.target.value)}
              placeholder={copy.assistedIntro}
            />
            <Button size="sm" onClick={() => void grantAuthorization()} disabled={busy || !authorizationScope.trim()}>
              {copy.assistedStart}
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{copy.assistedQueueStatus}:</span>
              <span className="font-medium">
                {modeBStatus ? copy.assistedStatuses[modeBStatus] ?? modeBStatus : copy.assistedStatuses.QUEUED}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {modeBStatus == null || modeBStatus === "CANCELLED" ? (
                <Button size="sm" onClick={() => void handOffToOperator()} disabled={busy}>
                  {busy ? <><Loader2 className="mr-2 size-4 animate-spin" />{copy.assistedStarting}</> : copy.assistedStart}
                </Button>
              ) : null}
              {modeBStatus != null && modeBStatus !== "COMPLETED" && modeBStatus !== "CANCELLED" ? (
                <Button size="sm" variant="outline" onClick={() => void cancelHandoff()} disabled={busy}>
                  {copy.assistedCancel}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Provider response inbox. */}
      <div className="space-y-3 border border-border bg-background/60 p-3">
        <div>
          <p className="font-medium">{copy.offerTitle}</p>
          <p className="text-xs text-muted-foreground">{copy.offerIntro}</p>
        </div>
        <Textarea
          aria-label={copy.pasteOffer}
          value={offerText}
          onChange={(event) => setOfferText(event.target.value)}
          placeholder={copy.pasteOffer}
          rows={4}
        />
        <Button size="sm" onClick={() => void submitOffer()} disabled={busy || !offerText.trim()}>
          {copy.submitOffer}
        </Button>
      </div>

      {/* Review screen — the old / offer / effect comparison before any decision. */}
      {comparison && (
        <div className="space-y-3 border border-primary/40 bg-background/60 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{copy.old}</p>
              <p className="font-semibold">{eur(comparison.current.monthlyCost) ?? copy.comparisonRequired}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{copy.providerOffer}</p>
              <p className="font-semibold">{eur(comparison.providerOffer.monthlyCost) ?? copy.comparisonRequired}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{copy.approvedAlternative}</p>
              <p className="font-semibold">{eur(comparison.approvedAlternative.monthlyCost) ?? copy.comparisonRequired}</p>
            </div>
          </div>
          <div>
            <p className="font-medium">{copy.effectTitle}</p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">{copy.monthlySaving}: </span>{eur(comparison.savings.monthlyRecurringSaving) ?? copy.comparisonRequired}</div>
              <div><span className="text-muted-foreground">{copy.twelveMonthSaving}: </span>{eur(comparison.savings.annualizedRecurringSaving) ?? copy.comparisonRequired}</div>
              <div><span className="text-muted-foreground">{copy.additionalBinding}: </span>{comparison.savings.additionalBindingMonths == null ? copy.comparisonRequired : `${comparison.savings.additionalBindingMonths}`}</div>
              <div><span className="text-muted-foreground">{copy.activationFee}: </span>{eur(comparison.providerOffer.activationFee) ?? "—"}</div>
              <div><span className="text-muted-foreground">{copy.hardwareFee}: </span>{eur(comparison.providerOffer.hardwareFee) ?? "—"}</div>
              <div><span className="text-muted-foreground">{copy.oneTimeCredit}: </span>{eur(comparison.providerOffer.oneTimeCredit) ?? "—"}</div>
            </div>
            {comparison.savings.warnings.includes("TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN") && (
              <p className="mt-2 text-xs text-muted-foreground">{copy.temporaryDiscount}: {copy.postPromotionUnknown}</p>
            )}
            {comparison.blockedByPreferences && <p className="mt-2 text-xs text-destructive">{copy.acceptBlockedPreferences}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void decide("ACCEPT")} disabled={busy || decisionDone != null}>{copy.acceptOffer}</Button>
            <Button size="sm" variant="outline" onClick={() => void decide("COUNTER")} disabled={busy || decisionDone != null}>{copy.counterOffer}</Button>
            <Button size="sm" variant="outline" onClick={() => void decide("REJECT")} disabled={busy || decisionDone != null}>{copy.rejectOffer}</Button>
            <Button size="sm" variant="ghost" onClick={() => void decide("COMPARE_SWITCH")} disabled={busy || decisionDone != null}>{copy.compareSwitch}</Button>
          </div>
          {decisionDone === "COMPARE_SWITCH" && <p className="text-xs text-muted-foreground">{copy.affiliateNote}</p>}
        </div>
      )}

      {/* Bill verification. */}
      {decisionDone === "ACCEPT" && (
        <div className="space-y-3 border border-border bg-background/60 p-3">
          <div>
            <p className="font-medium">{copy.verificationTitle}</p>
            <p className="text-xs text-muted-foreground">{copy.verificationIntro}</p>
          </div>
          <Input
            aria-label={copy.submitBill}
            type="number"
            min="0"
            step="0.01"
            value={billMonthly}
            onChange={(event) => setBillMonthly(event.target.value)}
            placeholder={copy.currentMonthly}
          />
          <Button size="sm" onClick={() => void verifyBill()} disabled={busy || !billMonthly}>{copy.submitBill}</Button>
          {verification && (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium">
                {verification.result === "VERIFIED"
                  ? <><ShieldCheck className="size-4 text-primary" />{copy.verificationResults.VERIFIED}</>
                  : <><AlertTriangle className="size-4 text-destructive" />{copy.verificationResults[verification.result as "MISMATCH" | "NOT_YET_EFFECTIVE"] ?? verification.result}</>}
              </p>
              {verification.result === "VERIFIED" ? (
                <p>{copy.verifiedMonthly}: {eur(verification.verified_saving.verifiedMonthlySaving) ?? "—"} · {copy.verifiedAnnual}: {eur(verification.verified_saving.verifiedAnnualSaving) ?? "—"}</p>
              ) : (
                <ul className="list-inside list-disc text-muted-foreground">
                  {verification.discrepancies.map((item) => (
                    <li key={item.field}>{item.field}: {eur(item.expected) ?? "—"} → {eur(item.actual) ?? "—"}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">{copy.noCredentials}</p>
      <p className="text-xs text-muted-foreground">{copy.legalNote}</p>
    </div>
  )
}
