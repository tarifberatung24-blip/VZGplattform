"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { finanzamtRequestTypes, type FinanzamtRequestType } from "@/lib/finanzamt-requests"
import { createClient } from "@/lib/supabase/client"

export function FinanzamtRequestForm() {
  const [requestType, setRequestType] = useState<FinanzamtRequestType>("BELEGNACHREICHUNG")
  const [subject, setSubject] = useState("")
  const [text, setText] = useState("")
  const [message, setMessage] = useState("")
  async function save() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !subject.trim() || !text.trim()) return setMessage("Моля, попълни тема и текст.")
    const selected = finanzamtRequestTypes.find((item) => item.value === requestType)
    const { error } = await supabase.from("finanzamt_requests").insert({ user_id: user.id, request_type: requestType, subject: subject.trim(), text: text.trim(), attachments_metadata: [], status: "DRAFT", future_elster_transaction: selected?.transaction ?? null })
    setMessage(error ? "Заявката не беше запазена." : "Запазено като чернова. Нищо не е изпратено.")
  }
  return <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="finanzamt-title"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finanzamt</p><h2 id="finanzamt-title" className="mt-1 text-xl font-semibold text-foreground">Съобщение до данъчната служба</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Избери конкретен официален тип. „Sonstige Nachricht“ използвай само ако няма подходяща категория.</p><div className="mt-4 grid gap-3"><select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={requestType} onChange={(event) => setRequestType(event.target.value as FinanzamtRequestType)}>{finanzamtRequestTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Тема" /><Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Опиши случая..." /><Button type="button" onClick={save}>Запази чернова</Button>{message && <p className="text-sm text-muted-foreground">{message}</p>}</div></section>
}
