"use client"

import type { LayerZeroModule } from "./layer-zero-data"

/**
 * One capability on the ring. A real button, so it is reachable by keyboard and
 * reports its selected state; activation selects the capability, it does not
 * navigate — the CTA in the detail panel is the only entry action.
 */
export function LayerZeroNode({
  mod,
  label,
  size,
  x,
  y,
  active,
  onSelect,
}: {
  mod: LayerZeroModule
  label: string
  size: number
  x: number
  y: number
  active: boolean
  onSelect: (id: LayerZeroModule["id"]) => void
}) {
  const Icon = mod.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(mod.id)}
      aria-pressed={active}
      aria-label={label}
      data-module={mod.id}
      className="layer-zero-node"
      style={{
        width: size,
        height: size,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <span className="layer-zero-node__ring" aria-hidden="true" />
      <Icon className="layer-zero-node__icon" aria-hidden="true" />
      <span className="layer-zero-node__label">{label}</span>
    </button>
  )
}
