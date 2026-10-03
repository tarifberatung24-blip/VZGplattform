"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { LayerZeroStage } from "./layer-zero-stage"
import {
  LAYER_ZERO_DEFAULT,
  type LayerZeroModuleId,
} from "./layer-zero-data"

/**
 * Layer 0 hero.
 *
 * One intentional two-column composition: the argument on the left, the orbital
 * system on the right. The right side is a single bounded stage (orbit + active
 * node + detail panel) rather than a full-width block with a panel stacked below
 * the whole hero.
 *
 * Selection lives here: nodes are selectors and only the panel CTA navigates, so
 * picking a capability never jumps the user away and never re-lays-out the orbit.
 */
export function LayerZeroHero() {
  const { t, locale } = useLanguage()
  const [active, setActive] = useState<LayerZeroModuleId>(LAYER_ZERO_DEFAULT)
  const copy = t.layerZero
  const hero = t.home.hero

  return (
    <div className="layer0-hero layer-zero-scope relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="layer0-hero__glow" aria-hidden="true" />

      <main className="layer-zero-main relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-5 pt-24 pb-10 sm:px-8 sm:pt-28">
        <div className="layer-zero-split">
          <section className="layer-zero-copy">
            <h1 className="layer-zero-title">{hero.headline1}</h1>
            <p className="layer-zero-statement">{hero.headline2}</p>
            <p className="layer-zero-tagline">{hero.subtitle}</p>

            <ul className="layer-zero-benefits">
              {hero.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>

            <div className="layer-zero-actions">
              <Link
                href={localizedPath("/auth/sign-up", locale)}
                className="layer-zero-cta"
              >
                {hero.primaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <LayerZeroStage
            active={active}
            onSelect={setActive}
            labels={copy.modules}
            coreLabel={copy.core}
            panels={copy.panels}
          />
        </div>
      </main>
    </div>
  )
}
