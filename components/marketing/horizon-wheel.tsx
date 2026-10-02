"use client"

import { useLanguage } from "@/lib/i18n/language-context"

/**
 * HORIZON lifecycle wheel — prototype.
 *
 * The reference mockup is an "Agile vs Waterfall" comparison: two rings side by
 * side, each split into labelled segments, with a bulleted legend underneath.
 * The design language is what we borrow here, not the content.
 *
 * Each ring shows one of the two halves of the HORIZON lifecycle, so the pair
 * reads as "problem comes in → value goes out". The segments are data-driven
 * from `home.wheel.rings` so both locales stay in one place.
 */
export function HorizonWheel() {
  const { t } = useLanguage()
  const rings = t.home.wheel.rings

  return (
    <div className="horizon-wheel">
      <div className="horizon-wheel__rings">
        {rings.map((ring, index) => (
          <WheelRing key={ring.title} ring={ring} ringIndex={index} />
        ))}
      </div>
    </div>
  )
}

type Ring = {
  title: string
  caption: string
  steps: string[]
  bullets: string[]
}

function WheelRing({ ring, ringIndex }: { ring: Ring; ringIndex: number }) {
  const steps = ring.steps
  const count = steps.length

  // Segment geometry. Each segment is separated from its neighbour by a small
  // gap so the ring reads as discrete steps rather than one continuous band.
  const gap = 2
  const sweep = 360 / count

  return (
    <figure className="horizon-wheel__ring">
      <svg viewBox="0 0 200 200" className="horizon-wheel__svg" role="img">
        <title>{ring.title}</title>
        <defs>
          {steps.map((_, index) => (
            <linearGradient
              key={index}
              id={`horizon-seg-${ringIndex}-${index}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="var(--thread-core)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--thread-core)" stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>

        <g className="horizon-wheel__rotor">
          {steps.map((step, index) => (
            <path
              key={step}
              d={arcPath(100, 100, 62, 92, index * sweep + gap / 2, (index + 1) * sweep - gap / 2)}
              fill={`url(#horizon-seg-${ringIndex}-${index})`}
              className="horizon-wheel__segment"
              style={{ animationDelay: `${index * 0.35}s` }}
            />
          ))}
        </g>

        <circle cx="100" cy="100" r="55" className="horizon-wheel__hub" />
      </svg>

      <figcaption className="horizon-wheel__caption">
        <span className="horizon-wheel__title">{ring.title}</span>
        <span className="horizon-wheel__sub">{ring.caption}</span>
      </figcaption>

      <ul className="horizon-wheel__steps">
        {steps.map((step, index) => (
          <li key={step} className="horizon-wheel__step">
            <span
              className="horizon-wheel__dot"
              style={{ opacity: 0.4 + (0.6 * (count - index)) / count }}
              aria-hidden="true"
            />
            {step}
          </li>
        ))}
      </ul>

      <ul className="horizon-wheel__bullets">
        {ring.bullets.map((bullet) => (
          <li key={bullet} className="horizon-wheel__bullet">
            {bullet}
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Donut segment from `start` to `end` degrees, clockwise from 12 o'clock. */
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
