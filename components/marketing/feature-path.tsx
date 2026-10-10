"use client"

import { useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties } from "react"
import { FolderKanban, Lightbulb, SearchCheck, Target } from "lucide-react"
import type { HowItWorksStage, HowItWorksStageId } from "@/components/marketing/how-it-works-copy"
import { BrandText } from "@/components/brand/horizon-wordmark"

const stageIcons: Record<HowItWorksStageId, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  understand: Lightbulb,
  manage: FolderKanban,
  analyze: SearchCheck,
  plan: Target,
}

/** Horizontal room reserved left and right of the cards for the start and end markers. */
const SIDE = 48
/** Distance of the path from the top and bottom edge of the row. */
const EDGE = 14
/** Corner radius of the path. */
const RADIUS = 26
/** Centre of the start and end markers, measured from the outer edges. */
const START_INSET = 14

type Size = { width: number; height: number }

/**
 * The serpentine connector: starts at a marker on the left, runs over the first
 * card, under the second, over the third, under the fourth and ends at a marker
 * on the right. Built from measured pixels so corners stay round at any width.
 */
export function buildPathGeometry({ width, height }: Size, columns: number) {
  const colW = (width - SIDE * 2) / columns
  const top = EDGE
  const bottom = height - EDGE
  const mid = height / 2
  const r = Math.min(RADIUS, colW / 4, (bottom - top) / 4)
  const startX = START_INSET
  const endX = width - START_INSET

  let d = `M ${startX} ${mid} H ${SIDE - r} Q ${SIDE} ${mid} ${SIDE} ${mid - r} V ${top + r} Q ${SIDE} ${top} ${SIDE + r} ${top}`
  const dots: Array<{ x: number; y: number }> = []

  for (let i = 0; i < columns; i++) {
    const right = SIDE + colW * (i + 1)
    const overTop = i % 2 === 0
    const y = overTop ? top : bottom
    dots.push({ x: SIDE + colW * i + colW / 2, y })
    const isLast = i === columns - 1
    if (!isLast) {
      const nextY = overTop ? bottom : top
      const dir = overTop ? 1 : -1
      d += ` H ${right - r} Q ${right} ${y} ${right} ${y + dir * r} V ${nextY - dir * r} Q ${right} ${nextY} ${right + r} ${nextY}`
    } else {
      const dir = overTop ? 1 : -1
      d += ` H ${right - r} Q ${right} ${y} ${right} ${y + dir * r} V ${mid - dir * r} Q ${right} ${mid} ${right + r} ${mid} H ${endX}`
    }
  }

  return { d, dots, start: { x: startX, y: mid }, end: { x: endX, y: mid } }
}

function StageCard({ stage, index, stepWord }: { stage: HowItWorksStage; index: number; stepWord: string }) {
  const Icon = stageIcons[stage.id]
  return (
    <div className="group h-full [perspective:1200px]">
      <article
        className="relative flex h-full flex-col rounded-3xl border border-border/70 bg-card/85 p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-18px_rgba(0,40,100,0.35)] backdrop-blur-md transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateX(7deg)_rotateY(-9deg)_translateY(-6px)] group-focus-within:[transform:rotateX(7deg)_rotateY(-9deg)_translateY(-6px)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none] motion-reduce:group-focus-within:[transform:none]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 translate-y-3 scale-[0.96] rounded-3xl opacity-70 blur-md"
          style={{ background: "color-mix(in srgb, var(--thread-core) 22%, transparent)" }}
        />
        <div className="flex items-center justify-between gap-3 [transform:translateZ(42px)]">
          <span
            className="inline-flex size-14 items-center justify-center rounded-2xl shadow-[0_12px_24px_-12px_rgba(0,40,100,0.55)]"
            style={{
              color: "var(--thread-core)",
              background: "color-mix(in srgb, var(--thread-core) 10%, var(--card))",
              border: "1px solid color-mix(in srgb, var(--thread-core) 30%, transparent)",
            }}
          >
            <Icon className="size-7" aria-hidden={true} />
          </span>
          {stage.soon ? (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{
                color: "var(--thread-core)",
                background: "color-mix(in srgb, var(--thread-core) 12%, transparent)",
              }}
            >
              {stage.soon}
            </span>
          ) : null}
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground [transform:translateZ(28px)]">
          {stepWord} {index + 1}
        </p>
        <h3 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] [transform:translateZ(28px)]" style={{ color: "var(--thread-core)" }}>
          {stage.label}
        </h3>
        <p className="mt-2 text-base font-semibold leading-6 text-foreground [transform:translateZ(20px)]">{stage.title}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground [transform:translateZ(12px)]"><BrandText text={stage.body} /></p>
        <ul className="mt-auto flex flex-wrap gap-2 pt-5 [transform:translateZ(16px)]">
          {stage.chips.map((chip) => (
            <li key={chip} className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              {chip}
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}

/**
 * Four stage cards joined by one continuous line with markers, in the style of
 * a connected infographic. Desktop shows the serpentine path; small screens
 * fall back to a vertical timeline so nothing has to be scrolled sideways.
 */
export function FeaturePath({
  stages,
  label,
  stepWord,
}: {
  stages: readonly HowItWorksStage[]
  label: string
  stepWord: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number | null>(null)
  const [size, setSize] = useState<Size | null>(null)

  useLayoutEffect(() => {
    const element = rowRef.current
    if (!element) return
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const geometry = size && size.width > 0 ? buildPathGeometry(size, stages.length) : null
  const pathD = geometry?.d

  // The draw-in animation needs the real length of the path in pixels.
  useLayoutEffect(() => {
    if (pathRef.current && pathD) setPathLength(pathRef.current.getTotalLength())
  }, [pathD])

  return (
    <section aria-label={label}>
      {/* Desktop: serpentine connector */}
      <div ref={rowRef} className="relative hidden lg:block" style={{ paddingInline: SIDE }}>
        {geometry && size ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            <path
              d={geometry.d}
              fill="none"
              stroke="var(--thread-core)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              ref={pathRef}
              className={pathLength ? "feature-path-line" : undefined}
              style={pathLength ? ({ "--feature-path-length": `${pathLength}` } as CSSProperties) : undefined}
            />
            {geometry.dots.map((dot, index) => (
              <circle key={index} cx={dot.x} cy={dot.y} r={7} fill="var(--background)" stroke="var(--thread-core)" strokeWidth={2.5} />
            ))}
            {[geometry.start, geometry.end].map((point, index) => (
              <g key={index}>
                <circle cx={point.x} cy={point.y} r={14} fill="color-mix(in srgb, var(--thread-core) 18%, var(--background))" stroke="var(--thread-core)" strokeWidth={2.5} />
                <circle cx={point.x} cy={point.y} r={5} fill="var(--thread-core)" />
              </g>
            ))}
          </svg>
        ) : null}
        <ol className="relative grid grid-cols-4">
          {stages.map((stage, index) => (
            <li key={stage.id} className="px-5 py-12">
              <StageCard stage={stage} index={index} stepWord={stepWord} />
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile and tablet: vertical timeline */}
      <ol className="relative flex flex-col gap-8 pl-10 lg:hidden">
        <span
          aria-hidden="true"
          className="absolute top-3 bottom-3 left-[15px] w-0.5 rounded-full"
          style={{ background: "var(--thread-core)" }}
        />
        {stages.map((stage, index) => (
          <li key={stage.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-8 -left-[33px] size-4 rounded-full border-[2.5px]"
              style={{ borderColor: "var(--thread-core)", background: "var(--background)" }}
            />
            <StageCard stage={stage} index={index} stepWord={stepWord} />
          </li>
        ))}
      </ol>
    </section>
  )
}
