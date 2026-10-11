"use client"

import { useState, useTransition } from "react"
import { setJourneyRecordingAction } from "@/lib/journey/actions"
import { resetJourneyStatus } from "./journey-tracker"

const COPY = {
  bg: {
    title: "Лична помощ и подобряване",
    body: "За да ти помагаме лично и да правим платформата по-лесна, записваме кои функции използваш и къде се затрудняваш: само имена на екрани и грешки, без съдържание на документи и без въведени данни. Можеш да изключиш записа по всяко време. Тогава изтриваме досегашните записи.",
    label: "Записвай къде се затруднявам",
    on: "Включено. Можеш да го изключиш по всяко време.",
    off: "Изключено. Нищо не се записва.",
    error: "Промяната не се записа. Опитай отново.",
  },
  de: {
    title: "Persönliche Hilfe und Verbesserung",
    body: "Damit wir dir persönlich helfen und die Plattform einfacher machen können, zeichnen wir auf, welche Funktionen du nutzt und wo du nicht weiterkommst: nur Bildschirmnamen und Fehler, keine Dokumentinhalte und keine eingegebenen Daten. Du kannst die Aufzeichnung jederzeit ausschalten. Dann löschen wir die bisherigen Aufzeichnungen.",
    label: "Aufzeichnen, wo ich nicht weiterkomme",
    on: "Aktiv. Du kannst es jederzeit ausschalten.",
    off: "Aus. Es wird nichts aufgezeichnet.",
    error: "Die Änderung wurde nicht gespeichert. Bitte versuche es erneut.",
  },
} as const

export function JourneyRecordingCard({ initialEnabled, locale }: { initialEnabled: boolean; locale: "bg" | "de" }) {
  const copy = COPY[locale]
  const [enabled, setEnabled] = useState(initialEnabled)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  function change(next: boolean) {
    setFailed(false)
    startTransition(async () => {
      const result = await setJourneyRecordingAction(next)
      if (!result.ok) {
        setFailed(true)
        return
      }
      setEnabled(next)
      resetJourneyStatus()
    })
  }

  return (
    <section className="kintex-panel mx-auto mt-6 max-w-2xl p-5 sm:p-6" aria-labelledby="journey-recording-title">
      <h2 id="journey-recording-title" className="text-lg font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>
      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          role="switch"
          className="mt-0.5 size-5 shrink-0 accent-primary"
          checked={enabled}
          disabled={pending}
          onChange={(event) => change(event.target.checked)}
        />
        <span>{copy.label}</span>
      </label>
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{enabled ? copy.on : copy.off}</p>
      {failed ? <p role="alert" className="mt-2 text-sm text-destructive">{copy.error}</p> : null}
    </section>
  )
}
