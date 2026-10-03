"use client"

import { useState } from "react"

import { useLanguage } from "@/lib/i18n/language-context"
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
  const { t } = useLanguage()
  const [active, setActive] = useState<LayerZeroModuleId>(LAYER_ZERO_DEFAULT)
  const copy = t.layerZero

  return (
    <div className="layer0-hero layer-zero-scope relative flex min-h-[100dvh] flex-col overflow-hidden">
      <main className="layer-zero-main relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center gap-8 px-5 pt-24 pb-16 sm:px-8 sm:pt-28 lg:gap-10 lg:pt-32">
        <header className="layer-zero-head">
          <h1 className="layer-zero-title">
            {copy.titleWord}
            <span className="layer-zero-title__number">{copy.titleNumber}</span>
          </h1>
          <p className="layer-zero-tagline">{copy.tagline}</p>
        </header>

        <HorizonOrbit
          active={active}
          onSelect={setActive}
          labels={copy.modules}
          coreLabel={copy.core}
        />

        <LayerZeroDetailPanel active={active} copy={copy.panels} />
      </main>
    </div>
  )
}
