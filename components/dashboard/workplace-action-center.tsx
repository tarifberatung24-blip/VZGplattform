"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, FilePlus2, MessageSquareText, SearchCheck, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  firstName?: string | null
  nextAction: { href: string; label: string }
  reviewCount: number
  documentCount: number
  contractCount: number
  reminderCount: number
}

const intakeOptions = [
  { href: "/documents", label: "Получих писмо и не го разбирам", icon: MessageSquareText },
  { href: "/anspruch", label: "Искам да проверя помощ или право", icon: SearchCheck },
  { href: "/documents", label: "Трябва да подготвя документ", icon: FilePlus2 },
  { href: "/finanzbildung", label: "Искам да разбера финансите си", icon: BookOpen },
]

export function WorkplaceActionCenter({ firstName, nextAction, reviewCount, documentCount, contractCount, reminderCount }: Props) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]" aria-labelledby="action-center-title">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Workplace</p>
            <h2 id="action-center-title" className="mt-2 text-2xl font-semibold tracking-tight">{firstName ? `${firstName}, какво трябва да свършим?` : "Какво трябва да свършим?"}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Един ясен път от писмо или проблем до проверен документ и следваща стъпка.</p>
          </div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">Без автоматично изпращане</span>
        </div>
        <div className="mt-5 rounded-xl border border-primary/15 bg-background p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Следваща стъпка</p><p className="mt-1 font-semibold text-foreground">{nextAction.label}</p><Button asChild size="sm" className="mt-3"><Link href={nextAction.href}>Продължи <ArrowRight className="size-4" /></Link></Button></div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {intakeOptions.map(({ href, label, icon: Icon }) => <Link key={label} href={href} className="group rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"><Icon className="size-4 text-primary" aria-hidden="true" /><span className="mt-2 block text-sm font-medium leading-5">{label}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Започни <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" /></span></Link>)}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Моят статус</h2><Link href="/documents" className="text-xs font-semibold text-primary">Отвори workplace</Link></div>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Чакащи преглед</dt><dd className="mt-1 text-xl font-semibold">{reviewCount}</dd></div>
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Документи</dt><dd className="mt-1 text-xl font-semibold">{documentCount}</dd></div>
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Договори</dt><dd className="mt-1 text-xl font-semibold">{contractCount}</dd></div>
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Срокове</dt><dd className="mt-1 text-xl font-semibold">{reminderCount}</dd></div>
        </dl>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Критичните факти се потвърждават от теб преди чернова, export или изпращане.</p>
      </div>
    </section>
  )
}
