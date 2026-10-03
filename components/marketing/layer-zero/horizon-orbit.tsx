"use client"

import { useEffect, useRef, useState } from "react"

import { HorizonCore } from "./horizon-core"
import { LayerZeroNode } from "./layer-zero-node"
import {
  LAYER_ZERO_MODULES,
  ORBIT_SQUASH,
  nodePosition,
  orbitGeometry,
  type LayerZeroModuleId,
} from "./layer-zero-data"

/**
 * The orbital navigation. Geometry is recomputed from the measured width so the
 * ring scales by rebuilding the layout, never by transforming a fixed graphic.
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
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  const { size, radius, coreSize, nodeSize } = orbitGeometry(width || 0)
  const rx = size / 2 - nodeSize / 2
  const ry = rx * ORBIT_SQUASH

  const activeMod = LAYER_ZERO_MODULES.find((m) => m.id === active)!
  const activePos = nodePosition(activeMod.angle, radius)

  return (
    <div
      ref={ref}
      className="layer-zero-orbit"
      style={{ width: "100%", maxWidth: 760, height: size }}
    >
      <svg
        className="layer-zero-orbit__svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
      >
        <ellipse
          cx={size / 2}
          cy={size / 2}
          rx={rx}
          ry={ry}
          className="layer-zero-orbit__ring"
        />
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + activePos.x}
          y2={size / 2 + activePos.y}
          className="layer-zero-orbit__connector"
        />
      </svg>

      <div className="layer-zero-orbit__core">
        <HorizonCore size={coreSize} label={coreLabel} />
      </div>

      {LAYER_ZERO_MODULES.map((mod) => {
        const pos = nodePosition(mod.angle, radius)
        return (
          <LayerZeroNode
            key={mod.id}
            mod={mod}
            label={labels[mod.id]}
            size={nodeSize}
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
