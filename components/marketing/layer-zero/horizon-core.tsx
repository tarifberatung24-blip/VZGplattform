"use client"

/**
 * The HORIZON core: a real 3D object, not a flat circle.
 *
 * It is a globe built from CSS 3D: six meridian rings rotated around the Y axis
 * at even steps, plus an equatorial band tilted into place. Because the whole
 * assembly spins on a perspective stage, the meridians foreshorten and cross as
 * they turn — the depth is genuine geometry, not a painted gradient. The same
 * technique the site already uses for the 3D ring, so the two read as one family.
 *
 * Sizes are percentages of the orbit box so the core scales with the ring
 * without a measured width, which keeps server and client markup identical.
 */
const MERIDIANS = [0, 30, 60, 90, 120, 150]

export function HorizonCore({ label }: { label: string }) {
  return (
    <div className="layer-zero-core">
      <span className="layer-zero-core__glow" aria-hidden="true" />

      <div className="layer-zero-core__stage" aria-hidden="true">
        <div className="layer-zero-core__globe">
          {MERIDIANS.map((deg) => (
            <span
              key={deg}
              className="layer-zero-core__meridian"
              style={{ transform: `rotateY(${deg}deg)` }}
            />
          ))}
          <span className="layer-zero-core__equator" />
          <span className="layer-zero-core__axis" />
        </div>
      </div>

      <span className="layer-zero-core__disc">
        <span className="layer-zero-core__label">{label}</span>
      </span>
    </div>
  )
}
