"use client"

/**
 * HORIZON 3D hero scene — prototype.
 *
 * Design language from the reference image: a 3D extruded ring of six separate
 * segments in alternating colours, tilted into an isometric view. The ring is
 * SVG; its thickness is a second copy of every segment offset downwards in a
 * dark tone — the classic extrusion trick, so the whole thing stays flat vector
 * art with no WebGL.
 *
 * The tilt lives on the SVG element, so the offset copy is foreshortened by the
 * same perspective as the faces and the wall stays consistent with the ring
 * instead of being faked per segment.
 */
export function Horizon3DScene() {
  return (
    <div className="horizon-scene" aria-hidden="true">
      <div className="horizon-scene__stage">
        <div className="horizon-ring">
          <svg viewBox="0 0 220 220" className="horizon-ring__svg">
            <defs>
              {RING_SEGMENTS.map((i) => (
                <linearGradient
                  key={i}
                  id={`horizon-ring-face-${i}`}
                  x1="0"
                  y1="0"
                  x2="0.7"
                  y2="1"
                >
                  <stop offset="0%" stopColor={`var(--ring-${i % 3})`} />
                  <stop offset="100%" stopColor={`var(--ring-${i % 3})`} stopOpacity="0.78" />
                </linearGradient>
              ))}
            </defs>

            {/* Wall: every segment duplicated and pushed down in the SVG plane.
                The tilt turns that offset into real depth. */}
            <g className="horizon-ring__wall">
              {RING_SEGMENTS.map((i) => (
                <path key={i} d={segmentPath(i)} fill="var(--ring-wall)" />
              ))}
            </g>

            {/* Bevel: the same segments lifted a hair and drawn in a light tone,
                so each face catches a lit edge instead of ending in a flat cut. */}
            <g className="horizon-ring__bevel">
              {RING_SEGMENTS.map((i) => (
                <path key={i} d={segmentPath(i)} fill="var(--ring-bevel)" />
              ))}
            </g>

            <g className="horizon-ring__faces">
              {RING_SEGMENTS.map((i) => (
                <path
                  key={i}
                  d={segmentPath(i)}
                  fill={`url(#horizon-ring-face-${i})`}
                  data-tone={i % 3}
                  className="horizon-ring__face"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Contact shadow, drawn as its own element rather than an SVG filter:
            it has to sit in screen space under the tilted ring, where a filter
            on the SVG would be foreshortened along with the ring itself. */}
        <div className="horizon-scene__ground" />
      </div>
    </div>
  )
}

const SEGMENT_COUNT = 6
const GAP = 4
const SWEEP = 360 / SEGMENT_COUNT
const RING_SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, i) => i)

/** One wedge of the ring, from its start angle to just short of the next. */
function segmentPath(index: number): string {
  const start = index * SWEEP + GAP / 2
  const end = (index + 1) * SWEEP - GAP / 2
  return arcPath(110, 110, 58, 96, start, end)
}

/** Donut wedge from `start` to `end` degrees, clockwise from 12 o'clock. */
function arcPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
): string {
  const toXY = (radius: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]
  }

  const [x1, y1] = toXY(outer, start)
  const [x2, y2] = toXY(outer, end)
  const [x3, y3] = toXY(inner, end)
  const [x4, y4] = toXY(inner, start)
  const large = end - start > 180 ? 1 : 0

  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ")
}
