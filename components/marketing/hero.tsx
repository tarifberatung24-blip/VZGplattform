"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="border-b border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-5xl font-black leading-[0.9] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {t.home.heroTitle}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground sm:text-2xl">
            {t.home.heroSubtitle} {t.home.heroDescription}
          </p>
          <div className="mt-12">
            <Button
              asChild
              size="lg"
              className="rounded-md bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-none hover:bg-primary/90"
            >
              <Link href="/check">
                {t.home.ctaPrimary}
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              {t.common.noCardNoCommitment}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
