"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import {
  LAYER_ZERO_MODULES,
  type LayerZeroModuleId,
} from "@/components/marketing/layer-zero/layer-zero-data"

/**
 * Public explainer for one Layer 0 capability.
 *
 * Every node on the home orbit leads here, so a visitor can read what a
 * capability does before any account exists. The workspace behind it stays
 * protected — this page only ever links out to sign-up, never into the
 * authenticated routes. Copy is the same `layerZero.panels` entry the orbit
 * shows, so the two surfaces can never drift apart.
 */
export function ModulePage({ moduleId }: { moduleId: LayerZeroModuleId }) {
  const { locale, t } = useLanguage()
  const mod = LAYER_ZERO_MODULES.find((m) => m.id === moduleId)!
  const panel = t.layerZero.panels[moduleId]
  const labels = t.layerZero.modulePage
  const Icon = mod.icon

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        <Link
          href={localizedPath("/", locale)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {labels.back}
        </Link>

        <div className="mt-12 overflow-hidden rounded-sm border border-border bg-card shadow-none">
          <div className="border-b border-border bg-background p-8 md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              HORIZON · Layer 0
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-primary"
                aria-hidden="true"
              >
                <Icon className="size-6" />
              </span>
              <h1 className="text-balance text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
                {panel.title}
              </h1>
            </div>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              {panel.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={localizedPath("/auth/sign-up", locale)}>
                  {labels.start} <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {labels.note}
            </p>
          </div>

          <div className="p-8 md:p-12">
            <h2 className="text-xl font-black text-foreground">{labels.steps}</h2>
            <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-3">
              {panel.features.map((feature, index) => (
                <div key={feature.title} className="flex flex-col gap-3 bg-background p-6">
                  <span className="flex size-8 items-center justify-center border border-border text-xs font-black text-primary">
                    {index + 1}
                  </span>
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold leading-6 text-foreground">
                    {feature.title}
                  </span>
                  <span className="text-sm leading-6 text-muted-foreground">
                    {feature.detail}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-sm border border-border bg-background p-5 text-sm leading-7 text-muted-foreground">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>{t.home.trust}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
