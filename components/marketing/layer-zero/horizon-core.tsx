"use client"

/**
 * The HORIZON core: a solid, strongly glowing orange sphere labelled "Layer 0".
 *
 * Per the reference this is not a wireframe globe — it is a bright disc with a
 * soft halo and two restrained concentric rings that turn slowly around it. The
 * rings read as energy around the centre rather than as a mesh, which keeps the
 * centre instantly readable and clearly larger than the nodes on the ring.
 *
 * Sizes are percentages of the orbit box so the core scales with the ring
 * without a measured width, which keeps server and client markup identical.
 */
export function HorizonCore({ label }: { label: string }) {
  return (
    <div className="layer-zero-core">
      <span className="layer-zero-core__glow" aria-hidden="true" />
      <span className="layer-zero-core__ring layer-zero-core__ring--outer" aria-hidden="true" />
      <span className="layer-zero-core__ring layer-zero-core__ring--inner" aria-hidden="true" />

      <span className="layer-zero-core__disc">
        <span className="layer-zero-core__label">{label}</span>
      </span>
    </div>
  )
}
