"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="border-b border-border bg-background py-28 sm:py-40">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-8">
        <div className="max-w-5xl">
          <p className="mb-8 text-xs font-bold uppercase tracking-[0.22em] text-primary">KintexBG · Institutional Private Finance</p>
          <h1 className="text-balance text-5xl font-black leading-[0.88] tracking-[-0.06em] text-foreground sm:text-7xl md:text-8xl lg:text-[6.5rem]">
            {t.home.heroTitle}
          </h1>
          <p className="mt-10 max-w-3xl text-pretty text-xl leading-9 text-muted-foreground sm:text-2xl">
            {t.home.heroSubtitle} {t.home.heroDescription}
          </p>
          <div className="mt-14">
            <Button
              asChild
              size="lg"
              className="rounded-sm bg-primary px-10 py-4 text-base font-black text-primary-foreground shadow-none hover:bg-primary/90"
            >
              <Link href="/check">
                {t.home.ctaPrimary}
              </Link>
            </Button>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t.common.noCardNoCommitment}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
