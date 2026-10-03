"use client"

/**
 * The HORIZON core: a stack of rings rather than a flat circle, built from CSS
 * layers so it stays cheap on mobile. The word Horizon sits inside the core, not
 * in a box on top of it.
 */
export function HorizonCore({ size, label }: { size: number; label: string }) {
  return (
    <div
      className="layer-zero-core"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="layer-zero-core__orbit layer-zero-core__orbit--outer" />
      <span className="layer-zero-core__orbit layer-zero-core__orbit--inner" />
      <span className="layer-zero-core__glow" />
      <span className="layer-zero-core__energy" />
      <span className="layer-zero-core__disc">
        <span className="layer-zero-core__label">{label}</span>
      </span>
    </div>
  )
}
