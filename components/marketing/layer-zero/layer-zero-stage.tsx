"use client"

import { HorizonOrbit } from "./horizon-orbit"
import { LayerZeroDetailPanel } from "./layer-zero-detail-panel"
import type { LayerZeroModuleId } from "./layer-zero-data"

type PanelCopy = {
  title: string
  description: string
  features: { title: string; detail: string }[]
  cta: string
}

/**
 * The right-hand visual stage.
 *
 * One bounded container owns the whole object — the orbit, the highlighted node
 * and the detail panel — so its geometry is resolved against a single known
 * width instead of scattering viewport-dependent positions across components.
 * The panel is a child of the stage, not a sibling of the hero, which is what
 * keeps "orbit + node + panel" reading as one instrument.
 */
export function LayerZeroStage({
  active,
  onSelect,
  labels,
  coreLabel,
  panels,
}: {
  active: LayerZeroModuleId
  onSelect: (id: LayerZeroModuleId) => void
  labels: Record<LayerZeroModuleId, string>
  coreLabel: string
  panels: Record<LayerZeroModuleId, PanelCopy>
}) {
  return (
    <section className="layer-zero-stage">
      <div className="layer-zero-stage__orbit">
        <HorizonOrbit
          active={active}
          onSelect={onSelect}
          labels={labels}
          coreLabel={coreLabel}
        />
      </div>

      {/* Short visual connection from the selected node down into the panel. */}
      <span className="layer-zero-stage__link" aria-hidden="true" />

      <LayerZeroDetailPanel active={active} copy={panels} />
    </section>
  )
}
