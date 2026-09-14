"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { SmartDashboardPreview } from "@/components/dashboard/smart-dashboard-preview"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="kintex-template-hero kintex-grid-background border-b bg-background">
      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24 lg:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-medium text-foreground">
            <CheckCircle2 className="size-3.5 text-primary" />
            {t.common.startFree}
          </span>
          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {t.home.heroTitle}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle} {t.home.heroDescription}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-7 text-base text-background hover:bg-foreground/90">
              <Link href="/check">
                {t.home.ctaPrimary}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/20 bg-background px-7 text-base">
              <Link href="/tarife">{t.home.ctaSecondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t.common.noCardNoCommitment}</p>
        </div>

        <div className="mx-auto mt-14 max-w-6xl sm:mt-20">
          <SmartDashboardPreview mode="preview" />
          <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
            {t.common.realWorkspacePreview}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl border-t border-border/70 pt-6">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t.common.financialDecisionsOverview}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-5 text-center text-xs font-semibold text-muted-foreground sm:grid-cols-4">
            <span>{t.common.taxes}</span>
            <span>{t.common.benefits}</span>
            <span>{t.common.contracts}</span>
            <span>{t.common.documents}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
