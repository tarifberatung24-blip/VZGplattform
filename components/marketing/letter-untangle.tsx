"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { CalendarClock, FileText, ListChecks } from "lucide-react"
import type { Locale } from "@/lib/i18n/dictionaries"
import {
  letterHeroCopy,
  letterScenarioOrder,
  sampleLetters,
  type LetterScenarioId,
  type SampleLetter,
} from "@/components/marketing/letter-scenarios"

type Phase = "letter" | "dissolve" | "explain" | "leave"

/** How long each phase lasts, in milliseconds. */
export const PHASE_MS: Record<Phase, number> = { letter: 2200, dissolve: 1100, explain: 5200, leave: 600 }

export function nextPhase(phase: Phase): Phase {
  return phase === "letter" ? "dissolve" : phase === "dissolve" ? "explain" : phase === "explain" ? "leave" : "letter"
}

/** Deterministic scatter for word i, so server and client render the same markup. */
function scatter(i: number) {
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12543.1234
  const rx = a - Math.floor(a)
  const ry = b - Math.floor(b)
  return { dx: Math.round((rx - 0.5) * 120), dy: Math.round(-30 - ry * 90), delay: Math.round(rx * 380 + ry * 220) }
}

function Words({ text, offset }: { text: string; offset: number }) {
  return (
    <>
      {text.split(" ").map((word, index) => {
        const s = scatter(offset + index)
        return (
          <span
            key={index}
            className="letter-word"
            style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--d": `${s.delay}ms` } as CSSProperties}
          >
            {word}
          </span>
        )
      })}
    </>
  )
}

function Paper({ letter, sample }: { letter: SampleLetter; sample: string }) {
  // Word offsets give every word across the letter its own scatter values.
  const texts = [letter.subject, ...letter.paragraphs]
  const offsets = texts.map((_, index) =>
    texts.slice(0, index).reduce((sum, text) => sum + text.split(" ").length, 0),
  )
  return (
    <div className="letter-paper" lang="de">
      <span className="letter-sample">{sample}</span>
      <div className="letter-head">
        <p className="letter-sender">{letter.sender}</p>
        <p className="letter-sender-line">{letter.senderLine}</p>
      </div>
      <div className="letter-meta">
        <div className="letter-recipient">
          {letter.recipient.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="letter-date">
          <p>{letter.date}</p>
          <p>{letter.reference}</p>
        </div>
      </div>
      <p className="letter-subject">
        <Words text={letter.subject} offset={offsets[0]} />
      </p>
      <div className="letter-body">
        {letter.paragraphs.map((paragraph, index) => (
          <p key={paragraph}>
            <Words text={paragraph} offset={offsets[index + 1]} />
          </p>
        ))}
      </div>
      <p className="letter-footer">{letter.footer}</p>
    </div>
  )
}

/**
 * Home hero visual: a dense German letter that "untangles" into three plain
 * cards (what it says, the deadline, what to do), then moves on to the next
 * example. Pauses while hovered or focused; under prefers-reduced-motion it
 * shows the explained state without animation and does not auto-advance.
 */
export function LetterUntangle({ locale }: { locale: Locale }) {
  const copy = letterHeroCopy[locale]
  const [scenario, setScenario] = useState(0)
  const [phase, setPhase] = useState<Phase>("letter")
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (reduced || paused) return
    const timer = window.setTimeout(() => {
      if (phase === "leave") setScenario((current) => (current + 1) % letterScenarioOrder.length)
      setPhase(nextPhase(phase))
    }, PHASE_MS[phase])
    return () => window.clearTimeout(timer)
  }, [phase, paused, reduced])

  const id: LetterScenarioId = letterScenarioOrder[scenario]
  const letter = sampleLetters[id]
  const explanation = copy.explanations[id]
  const shownPhase: Phase = reduced ? "explain" : phase

  const cards = useMemo(
    () => [
      { key: "what", Icon: FileText, label: copy.labels.what, text: explanation.what },
      { key: "deadline", Icon: CalendarClock, label: copy.labels.deadline, text: explanation.deadline },
      { key: "action", Icon: ListChecks, label: copy.labels.action, text: explanation.action },
    ],
    [copy, explanation],
  )

  const choose = (index: number) => {
    setScenario(index)
    setPhase(reduced ? "explain" : "letter")
  }

  return (
    <div
      className="letter-stage"
      data-phase={shownPhase}
      role="group"
      aria-label={copy.regionLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="letter-tilt">
        <Paper key={id} letter={letter} sample={copy.sample} />
        <ol className="letter-cards" aria-live="off">
          {cards.map(({ key, Icon, label, text }, index) => (
            <li key={`${id}-${key}`} className="letter-card" style={{ "--i": index } as CSSProperties}>
              <span className="letter-card-icon">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="letter-card-label">{label}</span>
                <span className="letter-card-text">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="letter-dots">
        {letterScenarioOrder.map((scenarioId, index) => (
          <button
            key={scenarioId}
            type="button"
            className="letter-dot"
            aria-label={copy.show(index + 1)}
            aria-pressed={index === scenario}
            onClick={() => choose(index)}
          />
        ))}
      </div>
    </div>
  )
}
