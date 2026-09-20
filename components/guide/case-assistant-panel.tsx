"use client"

import { useState } from "react"
import { capabilitiesForModule } from "@/lib/horizon/ai/module-rails"

type Turn = { role: "user" | "assistant"; content: string }

const capabilityCopy: Record<string, { bg: string; de: string }> = {
  explain: { bg: "обяснява", de: "erklärt" },
  translate: { bg: "превежда", de: "übersetzt" },
  summarize: { bg: "обобщава", de: "fasst zusammen" },
  ask_missing_questions: { bg: "пита за липсващи данни", de: "fragt nach fehlenden Angaben" },
  draft: { bg: "подготвя чернова", de: "entwirft einen Text" },
  extract_assist: { bg: "помага при извличане", de: "hilft beim Auslesen" },
}

/**
 * P7 case assistant panel.
 *
 * Answers inside the current case and only explains/summarizes. It shows the
 * user which capabilities are active, so the surface never implies the
 * assistant can approve, send or decide something on their behalf: those are
 * separate steps the user performs explicitly.
 */
export function CaseAssistantPanel({ caseId, module, locale }: { caseId: string; module: string; locale: string }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const de = locale === "de"
  const capabilities = capabilitiesForModule(module)

  const copy = de
    ? {
        title: "Assistent zu diesem Vorgang",
        hint: "Der Assistent erklärt und fasst zusammen. Er gibt nichts frei, versendet nichts und entscheidet nichts.",
        capabilities: "Aktiv",
        placeholder: "Frage zu diesem Vorgang …",
        send: "Fragen",
        pending: "Antwortet …",
        empty: "Bitte eine Frage eingeben.",
        failed: "Keine Antwort erhalten. Bitte erneut versuchen.",
      }
    : {
        title: "Асистент по този случай",
        hint: "Асистентът обяснява и обобщава. Не одобрява, не изпраща и не решава вместо теб.",
        capabilities: "Активни",
        placeholder: "Въпрос по този случай …",
        send: "Питай",
        pending: "Отговаря …",
        empty: "Моля, въведи въпрос.",
        failed: "Няма отговор. Опитай отново.",
      }

  async function submit() {
    const question = input.trim()
    if (!question) {
      setError(copy.empty)
      return
    }
    setError(null)
    const history: Turn[] = [...turns, { role: "user", content: question }]
    setTurns(history)
    setInput("")
    setPending(true)

    try {
      const response = await fetch(`/api/horizon/cases/${caseId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-24) }),
      })
      if (!response.ok || !response.body) {
        setError(copy.failed)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let answer = ""
      setTurns([...history, { role: "assistant", content: "" }])
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setTurns([...history, { role: "assistant", content: answer }])
      }
    } catch {
      setError(copy.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{copy.hint}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.capabilities}:{" "}
          {capabilities
            .map((capability) => capabilityCopy[capability]?.[de ? "de" : "bg"] ?? capability)
            .join(", ")}
        </p>
      </div>

      {turns.length > 0 ? (
        <ul className="space-y-2">
          {turns.map((turn, index) => (
            <li
              key={index}
              className={`rounded-md px-3 py-2 text-sm ${
                turn.role === "user" ? "bg-muted" : "border border-border"
              }`}
            >
              <span className="sr-only">{turn.role === "user" ? "User" : "Assistant"}: </span>
              <span className="whitespace-pre-wrap">{turn.content}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-start gap-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={2}
          maxLength={30000}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.pending : copy.send}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}