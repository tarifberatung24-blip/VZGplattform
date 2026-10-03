"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { HorizonOrbit } from "./horizon-orbit"
import { LayerZeroDetailPanel } from "./layer-zero-detail-panel"
import {
  LAYER_ZERO_DEFAULT,
  type LayerZeroModuleId,
} from "./layer-zero-data"

/**
 * Layer 0 hero.
 *
 * One system with capabilities orbiting a core, rather than a grid of cards.
 * Selection lives here: the nodes are capability selectors and the panel CTA is
 * the only thing that navigates, so tapping a node never jumps the user away.
 */
export function LayerZeroHero() {
  const { t, locale } = useLanguage()
  const [active, setActive] = useState<LayerZeroModuleId>(LAYER_ZERO_DEFAULT)
  const copy = t.layerZero

  const hero = t.home.hero

  return (
    <div className="layer0-hero layer-zero-scope relative flex min-h-[100dvh] flex-col overflow-hidden">
      <main className="layer-zero-main relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-5 pt-24 pb-16 sm:px-8 sm:pt-28 lg:gap-12 lg:pt-32">
        {/* Left column: the argument. Right column: the system, with its detail
            panel tucked beneath it — the same two-up composition the site's
            home hero already uses, so the two surfaces read as one. */}
        <div className="layer-zero-split">
          <section className="layer-zero-copy">
            <h1 className="layer-zero-title">
              {hero.headline1}
              <span className="layer-zero-title__number">{hero.headline2}</span>
            </h1>
            <p className="layer-zero-tagline">{hero.subtitle}</p>

            <div className="layer-zero-actions">
              <Link
                href={localizedPath("/auth/sign-up", locale)}
                className="layer-zero-cta"
              >
                {hero.primaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={localizedPath("/how-it-works", locale)}
                className="layer-zero-cta layer-zero-cta--ghost"
              >
                {hero.navAbout}
              </Link>
            </div>

            <p className="layer-zero-trust">{t.home.trust}</p>
          </section>

          <section className="layer-zero-system">
            <HorizonOrbit
              active={active}
              onSelect={setActive}
              labels={copy.modules}
              coreLabel={copy.core}
            />

            <LayerZeroDetailPanel active={active} copy={copy.panels} />
          </section>
        </div>
      </main>
    </div>
  )
}
