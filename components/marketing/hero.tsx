"use client"

import Link from "next/link"
import { ArrowRight, Bell, Bot, CheckCircle2, FileText, LayoutDashboard, ShieldCheck, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] md:px-8 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <CheckCircle2 className="size-3.5 text-success" />
            KintexBG work management
          </span>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t.home.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">Твоят дигитален финансов и административен помощник в Германия. {t.home.heroDescription}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base shadow-sm">
              <Link href="/check">
                {t.home.ctaPrimary}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl bg-card px-6 text-base shadow-sm">
              <Link href="/tarife">{t.home.ctaSecondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t.home.trust}</p>
        </div>
        <DashboardPreview />
      </div>
    </section>
  )
}

function DashboardPreview() {
  const { t } = useLanguage()
  const rows = [
    { label: t.home.what1, icon: WalletCards },
    { label: t.home.what2, icon: ShieldCheck },
    { label: t.home.what3, icon: Bell },
    { label: t.home.what4, icon: FileText },
  ]
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-slate-200/70">
      <div className="grid min-h-[430px] grid-cols-[86px_1fr]">
        <aside className="border-r border-border bg-slate-50 p-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">K</div>
          <div className="mt-8 space-y-3">
            {[LayoutDashboard, WalletCards, FileText, Bot].map((Icon, index) => (
              <span key={index} className={`grid size-10 place-items-center rounded-xl ${index === 0 ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}>
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </aside>
        <div className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Dashboard Overview</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">Smart Home Office</h2>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Live</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {rows.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-border bg-background p-4">
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                  <Icon className="size-4" />
                </span>
                <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">ready for workflow</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-500"><Bot className="size-5" /></span>
              <div>
                <p className="font-semibold">AI Home Office Assistant</p>
                <p className="text-xs text-slate-300">{t.home.promiseSub}</p>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-slate-800">
              <div className="h-2 w-2/3 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
