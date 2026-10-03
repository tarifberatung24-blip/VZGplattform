"use client"

import { HorizonCore } from "./horizon-core"
import { LayerZeroNode } from "./layer-zero-node"
import {
  LAYER_ZERO_MODULES,
  NODE_ORBIT_RADIUS,
  ORBIT_SQUASH,
  nodePositionPercent,
  type LayerZeroModuleId,
} from "./layer-zero-data"

/**
 * The orbital navigation.
 *
 * Geometry is expressed in percentages of the orbit box and resolved by CSS, so
 * the server and the client always agree on the markup. A measured-pixel layout
 * could not do that: the server has no width to measure, so it would render one
 * geometry and the client another, which trips hydration.
 */
export function HorizonOrbit({
  active,
  onSelect,
  labels,
  coreLabel,
}: {
  active: LayerZeroModuleId
  onSelect: (id: LayerZeroModuleId) => void
  labels: Record<LayerZeroModuleId, string>
  coreLabel: string
}) {
  const activeMod = LAYER_ZERO_MODULES.find((m) => m.id === active)!
  const activePos = nodePositionPercent(activeMod.angle)

  return (
    <div className="layer-zero-orbit">
      <svg
        className="layer-zero-orbit__svg"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <ellipse
          cx={50}
          cy={50}
          rx={NODE_ORBIT_RADIUS}
          ry={NODE_ORBIT_RADIUS * ORBIT_SQUASH}
          className="layer-zero-orbit__ring"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={50}
          y1={50}
          x2={activePos.x}
          y2={activePos.y}
          className="layer-zero-orbit__connector"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="layer-zero-orbit__core">
        <HorizonCore label={coreLabel} />
      </div>

      {LAYER_ZERO_MODULES.map((mod) => {
        const pos = nodePositionPercent(mod.angle)
        return (
          <LayerZeroNode
            key={mod.id}
            mod={mod}
            label={labels[mod.id]}
            x={pos.x}
            y={pos.y}
            active={mod.id === active}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
