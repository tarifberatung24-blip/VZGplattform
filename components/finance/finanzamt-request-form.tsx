"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { finanzamtRequestTypes, type FinanzamtRequestType } from "@/lib/finanzamt-requests"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"

export function FinanzamtRequestForm() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [requestType, setRequestType] = useState<FinanzamtRequestType>("BELEGNACHREICHUNG")
  const [subject, setSubject] = useState("")
  const [text, setText] = useState("")
  const [message, setMessage] = useState("")

  async function save() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !subject.trim() || !text.trim()) return setMessage(de ? "Bitte Betreff und Text ausfüllen." : "Моля, попълни тема и текст.")
    const selected = finanzamtRequestTypes.find((item) => item.value === requestType)
    const { error } = await supabase.from("finanzamt_requests").insert({ user_id: user.id, request_type: requestType, subject: subject.trim(), text: text.trim(), attachments_metadata: [], status: "DRAFT", future_elster_transaction: selected?.transaction ?? null })
    setMessage(error ? (de ? "Die Anfrage wurde nicht gespeichert." : "Заявката не беше запазена.") : (de ? "Als Entwurf gespeichert. Es wurde nichts versendet." : "Запазено като чернова. Нищо не е изпратено."))
  }

  return <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="finanzamt-title"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finanzamt</p><h2 id="finanzamt-title" className="mt-1 text-xl font-semibold text-foreground">{de ? "Nachricht an das Finanzamt" : "Съобщение до данъчната служба"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{de ? "Wähle einen konkreten offiziellen Typ. „Sonstige Nachricht“ nur verwenden, wenn keine passende Kategorie existiert." : "Избери конкретен официален тип. „Sonstige Nachricht“ използвай само ако няма подходяща категория."}</p><div className="mt-4 grid gap-3"><label htmlFor="finanzamt-type" className="text-sm font-medium text-foreground">{de ? "Art der Nachricht" : "Вид на съобщението"}</label><select id="finanzamt-type" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={requestType} onChange={(event) => setRequestType(event.target.value as FinanzamtRequestType)}>{finanzamtRequestTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Input aria-label={de ? "Betreff" : "Тема"} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={de ? "Betreff" : "Тема"} /><Textarea aria-label={de ? "Nachricht" : "Съобщение"} value={text} onChange={(event) => setText(event.target.value)} placeholder={de ? "Beschreibe den Fall..." : "Опиши случая..."} /><Button type="button" onClick={save}>{de ? "Entwurf speichern" : "Запази чернова"}</Button>{message && <p className="text-sm text-muted-foreground">{message}</p>}</div></section>
}
