"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ChevronRight, Plus, UserRound } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import type { DashboardDocument } from "@/components/dashboard/document-analyzer"
import { formatMoney } from "@/lib/dashboard/contracts-data"
import { buildAttentionItems, type AttentionKind, type AttentionTone } from "@/lib/dashboard/attention"
import { HorizonHome } from "@/components/horizon/horizon-home"
import { YourValueCard } from "./your-value-card"
import { NotificationInbox, type InboxNotification } from "./notification-inbox"
import type { YourValue } from "@/lib/value/your-value"
import type { GrundversorgungMatch } from "@/lib/value/grundversorgung"

export type VzgDashboardProps = {
  firstName?: string | null
  profile?: { completeness: number | null } | null
  contracts: Array<{ id: string; title: string; category: string; provider_name: string | null; monthly_amount: number | null; status: string | null; end_date: string | null; review_status?: string | null; cancellation_deadline?: string | null }>
  documents: DashboardDocument[]
  reviewCount: number
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
  caseCounts?: Record<string, number>
  moduleError?: string | null
  yourValue?: YourValue | null
  notifications?: InboxNotification[]
  notificationsEmailEnabled?: boolean
  grundversorgung?: GrundversorgungMatch[]
}

type Tone = "urgent" | "warn" | "good" | "neutral"

// The colours of the product preview on the home page (`.env-dash` in globals.css), so the real
// dashboard looks like the one people were shown.
const TAG: Record<Tone, string> = {
  urgent: "bg-[#fde8e8] text-[#b42318]",
  warn: "bg-[#fff1dc] text-[#b54708]",
  good: "bg-[#e3f6ea] text-[#067647]",
  neutral: "bg-[#eef2f7] text-[#475467]",
}
const FIGURE: Record<Tone, { box: string; value: string }> = {
  urgent: { box: "", value: "text-[#b42318]" },
  warn: { box: "", value: "text-[#b54708]" },
  good: { box: "paper-note paper-note-success", value: "text-[#067647]" },
  neutral: { box: "", value: "text-[#0f1722]" },
}
const TONE_OF: Record<AttentionTone, Tone> = { urgent: "urgent", soon: "warn", info: "neutral" }
const DATED: ReadonlySet<AttentionKind> = new Set(["deadline", "cancellation"])
const VISIBLE_STEPS = 4

function copyFor(de: boolean) {
  return de
    ? {
        hello: "Hallo",
        summary: (n: number) => (n === 0 ? "Heute ist nichts dringend." : n === 1 ? "1 Punkt braucht deine Aufmerksamkeit." : `${n} Punkte brauchen deine Aufmerksamkeit.`),
        status: { urgent: "Dringend", warn: "Bald fällig", neutral: "Offen", good: "Alles im Griff" },
        stepsTitle: "Nächste Schritte",
        more: (n: number) => `und ${n} weitere`,
        addDocument: "Dokument hinzufügen",
        startCase: "Vorgang starten",
        note: "Nur bestätigte Daten. Nichts wird ohne dich verschickt.",
        monthly: "Monatliche Kosten",
        contracts: "Verträge",
        review: "Zur Prüfung",
        firstContract: "Ersten Vertrag hinzufügen",
        firstContractDetail: "Wir behalten Fristen und Preis für dich im Blick",
        upload: "Brief oder Dokument hochladen",
        uploadDetail: "Wir erklären, was drinsteht und bis wann du handeln musst",
      }
    : {
        hello: "Здравей",
        summary: (n: number) => (n === 0 ? "Днес няма нищо спешно." : n === 1 ? "1 нещо иска вниманието ти." : `${n} неща искат вниманието ти.`),
        status: { urgent: "Спешно", warn: "Скоро", neutral: "За довършване", good: "Всичко е наред" },
        stepsTitle: "Следващи стъпки",
        more: (n: number) => `и още ${n}`,
        addDocument: "Добави документ",
        startCase: "Започни случай",
        note: "Само потвърдени данни. Нищо не се изпраща без теб.",
        monthly: "Месечни разходи",
        contracts: "Договори",
        review: "За проверка",
        firstContract: "Добави първия си договор",
        firstContractDetail: "Ще следим сроковете и цената вместо теб",
        upload: "Качи писмо или документ",
        uploadDetail: "Ще ти обясним какво пише и докога трябва да действаш",
      }
}

/**
 * The customer home, in the look of the product preview on the home page: one "today" card with a
 * status tag, the greeting, three figures, the next steps and one strong action, then the inbox and
 * the modules. Built for a phone first. Charts, the contract table and the document analyzer live on
 * the Contracts and Documents pages. The page tint comes from `.horizon-dashboard` in globals.css.
 */
export function VzgDashboard({ firstName, profile, contracts, reviewCount, reminders, caseCounts, moduleError, yourValue, grundversorgung, notifications, notificationsEmailEnabled }: VzgDashboardProps) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const lang: "bg" | "de" = de ? "de" : "bg"
  const copy = copyFor(de)

  const documentsHref = localizedPath("/documents", locale)
  const contractsHref = localizedPath("/vertraege", locale)
  const profileHref = localizedPath("/profil", locale)
  const completeness = profile?.completeness ?? 0
  const items = useMemo(
    () => buildAttentionItems({ locale: lang, now: new Date(), reminders, contracts, reviewCount, profileCompleteness: completeness, paths: { documents: documentsHref, contracts: contractsHref, profile: profileHref } }),
    [lang, reminders, contracts, reviewCount, completeness, documentsHref, contractsHref, profileHref],
  )

  const name = firstName?.trim() || null
  const initials = name ? name.slice(0, 2).toUpperCase() : null
  const status: Tone = items.some((item) => item.tone === "urgent") ? "urgent" : items.some((item) => item.tone === "soon") ? "warn" : items.length ? "neutral" : "good"
  const monthlyTotal = contracts.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)
  const toReview = reviewCount + contracts.filter((item) => item.monthly_amount == null).length
  const figures: Array<{ label: string; value: string; tone: Tone; href: string }> = [
    { label: copy.monthly, value: monthlyTotal ? formatMoney(monthlyTotal, lang) : "–", tone: "neutral", href: contractsHref },
    { label: copy.contracts, value: String(contracts.length), tone: "neutral", href: contractsHref },
    { label: copy.review, value: String(toReview), tone: toReview > 0 ? "warn" : "good", href: documentsHref },
  ]

  // With nothing to do, the steps suggest the two ways to get value out of Horizon.
  const steps = items.length
    ? items.slice(0, VISIBLE_STEPS).map((item) => ({ id: item.id, title: item.title, detail: DATED.has(item.kind) ? null : item.detail, pill: DATED.has(item.kind) ? item.detail : null, tone: TONE_OF[item.tone], href: item.href }))
    : [
        ...(contracts.length === 0 ? [{ id: "first-contract", title: copy.firstContract, detail: copy.firstContractDetail, pill: null, tone: "neutral" as Tone, href: contractsHref }] : []),
        { id: "upload", title: copy.upload, detail: copy.uploadDetail, pill: null, tone: "neutral" as Tone, href: documentsHref },
      ]

  return <div className="horizon-dashboard relative min-h-[calc(100svh-3.5rem)] min-w-0 overflow-x-hidden bg-background px-4 pb-24 pt-4 text-foreground sm:px-6 sm:pt-6 md:pb-8 lg:px-8">
    <div className="relative z-10 mx-auto min-w-0 max-w-[1100px]">
      <section aria-labelledby="today-title" className="paper p-5 text-[#0f1722] sm:p-7">
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] ${TAG[status]}`}>{copy.status[status]}</span>
            <span aria-hidden="true" className="ml-auto grid size-10 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">{initials ?? <UserRound className="size-5" />}</span>
          </div>
          <h1 id="today-title" className="mt-3 text-[26px] font-extrabold leading-tight tracking-[-0.01em] text-[#0f1722] sm:text-[32px]">{name ? `${copy.hello}, ${name}` : copy.hello}</h1>
          <p className="mt-1 text-[15px] text-[#3d4652]">{copy.summary(items.length)}</p>

          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {figures.map((figure, index) => <li key={figure.label} className={index === 0 ? "col-span-2 sm:col-span-1" : undefined}>
              <Link href={figure.href} className={`paper paper-inset paper-link block h-full px-3 py-2.5 ${FIGURE[figure.tone].box}`}>
                <span className="block text-[11px] font-semibold leading-tight text-[#6b7480] sm:text-xs">{figure.label}</span>
                <span className={`mt-1 block whitespace-nowrap text-lg font-extrabold leading-tight tabular-nums sm:text-2xl ${FIGURE[figure.tone].value}`}>{figure.value}</span>
              </Link>
            </li>)}
          </ul>

          <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6b7480]">{copy.stepsTitle}</p>
          <ol className="mt-2 grid gap-1">
            {steps.map((step) => <li key={step.id}>
              <Link href={step.href} className="flex min-h-11 items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[#eef2f7]">
                <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-[#0f1722]">
                  {step.title}
                  {step.detail ? <span className="mt-0.5 block text-xs text-[#6b7480]">{step.detail}</span> : null}
                </span>
                {step.pill ? <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG[step.tone]}`}>{step.pill}</span> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#98a2b3]" aria-hidden="true" />}
              </Link>
            </li>)}
          </ol>
          {items.length > VISIBLE_STEPS ? <p className="px-2 pt-1 text-xs text-[#6b7480]">{copy.more(items.length - VISIBLE_STEPS)}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={documentsHref} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 font-bold text-primary-foreground shadow-[0_10px_20px_-10px_var(--primary)] transition-colors hover:bg-[var(--primary-hover)] sm:flex-none">{copy.addDocument}<ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href={`/${locale}/guide`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#e6eaf0] bg-white px-5 font-semibold text-[#0f1722] transition-colors hover:bg-[#eef2f7] sm:flex-none"><Plus className="size-4" aria-hidden="true" />{copy.startCase}</Link>
            <p className="w-full text-xs text-[#6b7480] sm:w-auto sm:flex-1">{copy.note}</p>
          </div>
        </div>
      </section>

      <NotificationInbox initial={notifications ?? []} emailEnabled={notificationsEmailEnabled !== false} />

      <HorizonHome errorCode={moduleError ?? null} caseCounts={caseCounts ?? {}} />

      {yourValue ? <YourValueCard value={yourValue} grundversorgung={grundversorgung ?? []} /> : null}
    </div>
  </div>
}
