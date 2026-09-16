"use client"

import { FormEvent, useState } from "react"
import { Bot, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ChatMessage = { role: "user" | "assistant"; content: string }

export function AiHomeOfficeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || loading) return
    const next = [...messages, { role: "user" as const, content }]
    setMessages(next)
    setInput("")
    setError(null)
    setLoading(true)
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8) }) })
      if (!response.ok || !response.body) throw new Error(response.status === 503 ? "AI Provider не е активиран." : "Чатът временно не е достъпен.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let answer = ""
      setMessages((current) => [...current, { role: "assistant", content: "" }])
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: answer } : message))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Чатът временно не е достъпен.")
    } finally {
      setLoading(false)
    }
  }

  return <section className="border border-border bg-card p-4" aria-label="AI чат">
    <div className="flex items-center gap-2"><Bot className="size-4 text-primary" /><h3 className="text-sm font-semibold">Реален AI чат</h3></div>
    <div className="mt-3 max-h-52 space-y-2 overflow-y-auto text-sm">
      {messages.length === 0 && <p className="text-xs leading-5 text-muted-foreground">Попитай за въведените договори, документи или следваща стъпка.</p>}
      {messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-6 bg-primary px-3 py-2 text-primary-foreground" : "mr-3 bg-muted px-3 py-2 text-foreground"}>{message.content || (loading ? "…" : "")}</div>)}
    </div>
    {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    <form className="mt-3 flex gap-2" onSubmit={submit}>
      <Input value={input} onChange={(event) => setInput(event.target.value)} disabled={loading} placeholder="Напиши въпрос…" aria-label="Въпрос към AI" className="h-10" />
      <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Изпрати">{loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
    </form>
  </section>
}
