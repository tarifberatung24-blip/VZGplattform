"use client"

import { useState, useTransition } from "react"
import { setJourneyConsentAction } from "@/lib/journey/actions"
import { JOURNEY_STATUS_KEY } from "@/lib/journey/keys"

const COPY = {
  bg: {
    title: "Лична помощ",
    body: "Когато е включено, виждаме кои функции пробваш и къде се затрудняваш: само имена на екрани и грешки, без съдържание на документи и без въведени данни. Така можем да ти помогнем лично и да направим платформата по-лесна. Ако го изключиш, изтриваме досегашните записи.",
    label: "Позволявам на VZG CONSULT да вижда къде се затруднявам",
    on: "Включено. Можеш да го изключиш по всяко време.",
    off: "Изключено. Нищо не се записва.",
    error: "Промяната не се записа. Опитай отново.",
  },
  de: {
    title: "Persönliche Hilfe",
    body: "Wenn das aktiv ist, sehen wir, welche Funktionen du ausprobierst und wo du nicht weiterkommst: nur Bildschirmnamen und Fehler, keine Dokumentinhalte und keine eingegebenen Daten. So können wir dir persönlich helfen und die Plattform einfacher machen. Wenn du es ausschaltest, löschen wir die bisherigen Aufzeichnungen.",
    label: "VZG CONSULT darf sehen, wo ich nicht weiterkomme",
    on: "Aktiv. Du kannst es jederzeit ausschalten.",
    off: "Aus. Es wird nichts aufgezeichnet.",
    error: "Die Änderung wurde nicht gespeichert. Bitte versuche es erneut.",
  },
} as const

export function JourneyConsentCard({ initialEnabled, locale }: { initialEnabled: boolean; locale: "bg" | "de" }) {
  const copy = COPY[locale]
  const [enabled, setEnabled] = useState(initialEnabled)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  function change(next: boolean) {
    setFailed(false)
    startTransition(async () => {
      const result = await setJourneyConsentAction(next)
      if (!result.ok) {
        setFailed(true)
        return
      }
      setEnabled(next)
      try {
        window.sessionStorage.removeItem(JOURNEY_STATUS_KEY)
      } catch {
        // Storage can be blocked; the tracker re-checks within minutes anyway.
      }
    })
  }

  return (
    <section className="kintex-panel mx-auto mt-6 max-w-2xl p-5 sm:p-6" aria-labelledby="journey-consent-title">
      <h2 id="journey-consent-title" className="text-lg font-semibold text-foreground">{copy.title}</h2>
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
