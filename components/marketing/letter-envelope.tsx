"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { ArrowRight, Bell, CheckCircle2, Mail } from "lucide-react"
import type { Locale } from "@/lib/i18n/dictionaries"
import { BrandText, HorizonWordmark } from "@/components/brand/horizon-wordmark"
import {
  envelopeCopy,
  letterCaseOrder,
  sampleLetters,
  type DashboardCase,
  type DashboardFigure,
  type LetterCaseId,
  type SampleLetter,
} from "@/components/marketing/letter-scenarios"

/* ── Step model ─────────────────────────────────────────────────────────── */

export type Side = "front" | "back"
export type Step = { caseIndex: number; side: Side }

/** Click or scroll forward: before, after, next case before, and round again. */
export function stepAfter(step: Step, count: number): Step {
  return step.side === "front"
    ? { caseIndex: step.caseIndex, side: "back" }
    : { caseIndex: (step.caseIndex + 1) % count, side: "front" }
}

export function stepBefore(step: Step, count: number): Step {
  return step.side === "back"
    ? { caseIndex: step.caseIndex, side: "front" }
    : { caseIndex: (step.caseIndex - 1 + count) % count, side: "back" }
}

export const isFirstStep = (step: Step) => step.caseIndex === 0 && step.side === "front"
export const isLastStep = (step: Step, count: number) => step.caseIndex === count - 1 && step.side === "back"

/** Envelope timing in ms. Opening plays once per page load. */
export const OPEN_MS = 1900
export const SCAN_MS = 650
export const FLIP_MS = 900

type Stage = "closed" | "opening" | "open"

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Letter({ letter, sample }: { letter: SampleLetter; sample: string }) {
  return (
    <div className="env-paper" lang="de">
      <span className="env-sample">{sample}</span>
      <p className="env-sender">{letter.sender}</p>
      <p className="env-sender-line">{letter.senderLine}</p>
      <div className="env-meta">
        <div>
          {letter.recipient.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="env-date">
          <p>{letter.date}</p>
          <p>{letter.reference}</p>
        </div>
      </div>
      <p className="env-subject">{letter.subject}</p>
      <div className="env-body">
        {letter.body.map((block, index) =>
          typeof block === "string" ? (
            <p key={index}>{block}</p>
          ) : (
            <table key={index} className="env-rows">
              <tbody>
                {block.rows.map(([label, amount]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{amount}</td>
                  </tr>
                ))}
                {block.total ? (
                  <tr className="env-rows-total">
                    <td>{block.total[0]}</td>
                    <td>{block.total[1]}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ),
        )}
      </div>
      <p className="env-footer">{letter.footer}</p>
    </div>
  )
}

function CountUp({ figure, active, locale }: { figure: DashboardFigure; active: boolean; locale: Locale }) {
  const [shown, setShown] = useState<string | null>(null)
  const target = figure.countTo

  useEffect(() => {
    if (!active || target === undefined) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const format = new Intl.NumberFormat(locale === "bg" ? "bg-BG" : "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const suffix = figure.value.replace(/^[\d.\s,]+/, " ").trimEnd()
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(t < 1 ? `${format.format(target * eased)}${suffix}` : null)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, target, figure.value, locale])

  return <>{shown ?? figure.value}</>
}

function Dashboard({
  item,
  copy,
  locale,
  active,
}: {
  item: DashboardCase
  copy: (typeof envelopeCopy)[Locale]
  locale: Locale
  active: boolean
}) {
  return (
    <div className="env-dash">
      <div className="env-dash-top">
        <span className="env-dash-brand">
          <HorizonWordmark className="env-dash-mark" />
          <span>{copy.dashboard}</span>
        </span>
        <span className="env-dash-user">
          <span className="env-sample env-sample-dash">{copy.sample}</span>
          <span className="env-dash-bell">
            <Bell className="size-[1.1em]" aria-hidden="true" />
          </span>
          <span className="env-dash-avatar">EM</span>
        </span>
      </div>

      {item.notice ? (
        <div className="env-dash-notice">
          <Bell className="size-[1.2em] shrink-0" aria-hidden="true" />
          <p>
            <strong>{copy.notice}</strong> <BrandText text={item.notice} />
          </p>
        </div>
      ) : null}

      <div className="env-dash-head">
        <span className="env-dash-tag" data-tone={item.tone}>
          {item.tag}
        </span>
        <span className="env-dash-meta">{item.meta}</span>
      </div>
      <p className="env-dash-title">{item.title}</p>
      <p className="env-dash-summary">{item.summary}</p>

      <dl className="env-dash-figures">
        {item.figures.map((figure) => (
          <div key={figure.label} data-tone={figure.tone ?? "neutral"}>
            <dt>{figure.label}</dt>
            <dd>
              <CountUp figure={figure} active={active} locale={locale} />
            </dd>
          </div>
        ))}
      </dl>

      <p className="env-dash-steps-title">{copy.stepsTitle}</p>
      <ol className="env-dash-steps">
        {item.steps.map((step) => (
          <li key={step}>
            <CheckCircle2 className="size-[1.15em] shrink-0" aria-hidden="true" />
            <span>
              <BrandText text={step} />
            </span>
          </li>
        ))}
      </ol>

      <div className="env-dash-action">
        <span className="env-dash-button">
          {item.action}
          <ArrowRight className="size-[1em]" aria-hidden="true" />
        </span>
        {item.note ? (
          <span className="env-dash-note">
            <BrandText text={item.note} />
          </span>
        ) : null}
      </div>
    </div>
  )
}

function Envelope({ letter }: { letter: SampleLetter }) {
  return (
    <div className="env-envelope" aria-hidden="true">
      <div className="env-envelope-body">
        <div className="env-envelope-front">
          <p className="env-envelope-sender">{letter.senderLine.replace(/^[^·]+·\s*/, `${letter.sender} · `)}</p>
          <div className="env-envelope-window">
            {letter.recipient.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <span className="env-envelope-postage">
            <Mail className="size-[1.6em]" aria-hidden="true" />
          </span>
          <span className="env-envelope-code" />
        </div>
        <div className="env-envelope-back">
          <div className="env-envelope-plate" />
          <div className="env-envelope-mini">
            <p className="env-envelope-mini-sender">{letter.sender}</p>
            <span />
            <span />
            <span />
          </div>
          <div className="env-envelope-pocket" />
          <div className="env-envelope-flap">
            <span className="env-envelope-flap-out" />
            <span className="env-envelope-flap-in" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Stage ──────────────────────────────────────────────────────────────── */

/**
 * Home hero visual. A closed German window envelope; the visitor opens it, the
 * letter slides out ("before HORIZON"), and a click, scroll or swipe turns the
 * sheet over to show the same case in the HORIZON dashboard ("after"). Further
 * clicks walk through the other cases, and the chips jump to any case. The
 * envelope opens once per page load; only a refresh closes it again.
 *
 * Under prefers-reduced-motion every change is instant and nothing floats.
 */
export function LetterEnvelope({ locale }: { locale: Locale }) {
  const copy = envelopeCopy[locale]
  const count = letterCaseOrder.length

  const [stage, setStage] = useState<Stage>("closed")
  const [step, setStep] = useState<Step>({ caseIndex: 0, side: "front" })
  const [turn, setTurn] = useState(0)
  const [faces, setFaces] = useState({ front: 0, back: 0 })
  const [swapKey, setSwapKey] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [reduced, setReduced] = useState(false)

  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  // Mirrors `step` for event handlers; every change goes through `goTo`.
  const stepRef = useRef<Step>({ caseIndex: 0, side: "front" })

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    const pending = timers.current
    return () => {
      query.removeEventListener("change", update)
      pending.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const open = useCallback(() => {
    if (stage !== "closed") return
    if (reduced) {
      setStage("open")
      return
    }
    setStage("opening")
    later(() => setStage("open"), OPEN_MS)
  }, [stage, reduced, later])

  const goTo = useCallback(
    (target: Step, dir: 1 | -1) => {
      if (busy.current) return
      const current = stepRef.current
      if (target.caseIndex === current.caseIndex && target.side === current.side) return

      if (target.side === current.side) {
        // Same side: swap the content with a short fade.
        setFaces((f) => (target.side === "front" ? { front: target.caseIndex, back: target.caseIndex } : { ...f, back: target.caseIndex }))
        setSwapKey((k) => k + 1)
        stepRef.current = target
        setStep(target)
        return
      }

      busy.current = true
      stepRef.current = target
      const flip = () => {
        // The face that turns into view is hidden right now, so its content can change.
        setFaces((f) => (target.side === "back" ? { ...f, back: target.caseIndex } : { ...f, front: target.caseIndex }))
        setTurn((t) => t + dir)
        setStep(target)
        later(() => (busy.current = false), reduced ? 0 : FLIP_MS)
      }
      if (target.side === "back" && !reduced) {
        setScanning(true)
        later(() => {
          setScanning(false)
          flip()
        }, SCAN_MS)
      } else flip()
    },
    [later, reduced],
  )

  const next = useCallback(() => goTo(stepAfter(stepRef.current, count), 1), [goTo, count])
  const prev = useCallback(() => goTo(stepBefore(stepRef.current, count), -1), [goTo, count])

  // Scroll on the sheet walks through the steps. At the two ends the page scrolls normally.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || stage !== "open") return
    let acc = 0
    let lockedUntil = 0
    let lockedDir = 0
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
      const dir = Math.sign(event.deltaY)
      const current = stepRef.current
      const atEnd = dir > 0 ? isLastStep(current, count) : isFirstStep(current)
      const now = performance.now()
      if (now < lockedUntil) {
        if (dir === lockedDir) event.preventDefault()
        return
      }
      if (atEnd) return
      event.preventDefault()
      acc += event.deltaY
      if (Math.abs(acc) < 40) return
      acc = 0
      lockedDir = dir
      lockedUntil = now + FLIP_MS + SCAN_MS
      if (dir > 0) next()
      else prev()
    }
    sheet.addEventListener("wheel", onWheel, { passive: false })
    return () => sheet.removeEventListener("wheel", onWheel)
  }, [stage, count, next, prev])

  // Horizontal swipe on touch screens; vertical swipes keep scrolling the page.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || stage !== "open") return
    let startX = 0
    let startY = 0
    const onStart = (event: TouchEvent) => {
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
    }
    const onEnd = (event: TouchEvent) => {
      const dx = event.changedTouches[0].clientX - startX
      const dy = event.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) next()
      else prev()
    }
    sheet.addEventListener("touchstart", onStart, { passive: true })
    sheet.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      sheet.removeEventListener("touchstart", onStart)
      sheet.removeEventListener("touchend", onEnd)
    }
  }, [stage, next, prev])

  // Subtle tilt that follows the pointer, written straight to CSS variables.
  useEffect(() => {
    const element = stageRef.current
    if (!element || reduced) return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const rect = element.getBoundingClientRect()
      const px = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const py = ((event.clientY - rect.top) / rect.height) * 2 - 1
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--px", px.toFixed(3))
        element.style.setProperty("--py", py.toFixed(3))
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      element.style.setProperty("--px", "0")
      element.style.setProperty("--py", "0")
    }
    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerleave", onLeave)
    }
  }, [reduced])

  const isOpen = stage === "open"
  const frontId: LetterCaseId = letterCaseOrder[faces.front]
  const backId: LetterCaseId = letterCaseOrder[faces.back]
  const showingBack = isOpen && step.side === "back"
  const firstLetter = sampleLetters[letterCaseOrder[0]]

  const sheetLabel = step.side === "front" ? copy.toAfter : copy.next

  const onSheetKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      next()
    } else if (event.key === "ArrowRight") next()
    else if (event.key === "ArrowLeft") prev()
  }

  return (
    <div
      ref={stageRef}
      className="env-stage"
      data-stage={stage}
      data-side={step.side}
      data-scanning={scanning ? "true" : undefined}
      role="group"
      aria-label={copy.regionLabel}
    >
      <div className="env-bar">
        <p className="env-label" aria-live="polite" data-side={isOpen ? step.side : "closed"}>
          {isOpen ? <span>{step.side === "front" ? copy.before : copy.after}</span> : null}
        </p>
        <div className="env-chips" role="group" aria-label={copy.casesLabel} hidden={!isOpen}>
          {letterCaseOrder.map((id, index) => (
            <button
              key={id}
              type="button"
              className="env-chip"
              aria-pressed={index === step.caseIndex}
              aria-label={copy.showCase(copy.caseNames[id])}
              onClick={() => goTo({ caseIndex: index, side: "front" }, 1)}
            >
              {copy.caseNames[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="env-scene">
        <p className="env-closed-eyebrow" aria-hidden={stage !== "closed"}>
          {copy.eyebrow}
        </p>
        <div className="env-tilt">
          <button
            type="button"
            className="env-envelope-button"
            onClick={open}
            aria-label={copy.open}
            aria-hidden={stage !== "closed"}
            tabIndex={stage === "closed" ? 0 : -1}
            disabled={stage !== "closed"}
          >
            <Envelope letter={firstLetter} />
          </button>

          <div
            ref={sheetRef}
            className="env-sheet"
            role="button"
            tabIndex={isOpen ? 0 : -1}
            aria-hidden={!isOpen}
            aria-label={sheetLabel}
            onClick={isOpen ? next : undefined}
            onKeyDown={isOpen ? onSheetKey : undefined}
          >
            <div className="env-sheet-inner" style={{ "--turn": turn } as CSSProperties}>
              <div className="env-face env-face-front" aria-hidden={showingBack}>
                <div key={`f-${swapKey}-${frontId}`} className="env-swap">
                  <Letter letter={sampleLetters[frontId]} sample={copy.sample} />
                </div>
                <span className="env-scan" aria-hidden="true" />
              </div>
              <div className="env-face env-face-back" aria-hidden={!showingBack}>
                <div key={`b-${swapKey}-${backId}`} className="env-swap">
                  <Dashboard item={copy.cases[backId]} copy={copy} locale={locale} active={showingBack} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="env-cta env-closed-cta"
          onClick={open}
          disabled={stage !== "closed"}
          aria-hidden={stage !== "closed"}
          tabIndex={stage === "closed" ? 0 : -1}
        >
          <span>{copy.upload}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="env-controls" aria-hidden={!isOpen}>
        {step.side === "front" ? (
          <button type="button" className="env-cta" onClick={next} disabled={!isOpen} tabIndex={isOpen ? 0 : -1} aria-label={copy.toAfter}>
            <span>{copy.toAfter}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="env-cta" onClick={next} disabled={!isOpen} tabIndex={isOpen ? 0 : -1} aria-label={copy.next}>
            <span>{copy.next}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
        <p className="env-hint">{copy.hint}</p>
      </div>
    </div>
  )
}
