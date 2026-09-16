"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function ContactExpertForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending")
    const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, screeningSnapshot: { source: "contact_expert_page" } }) })
    setState(response.ok ? "sent" : "error")
  }
  if (state === "sent") return <div role="status" className="border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-800">Благодарим. Експерт от екипа ще се свърже с теб скоро.</div>
  return <form onSubmit={submit} className="space-y-4" aria-label="Contact expert form"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Име<Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="space-y-2 text-sm font-medium">Имейл<Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div><label className="block space-y-2 text-sm font-medium">Телефон (по желание)<Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">С какво да помогнем?<Textarea maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>{state === "error" && <p role="alert" className="text-sm text-destructive">Заявката не беше запазена. Опитай отново.</p>}<Button disabled={state === "sending"}>{state === "sending" ? "Изпращане…" : "Свържете ме с експерт"}</Button><p className="text-xs leading-5 text-muted-foreground">Изпращането е заявка за контакт, не представлява възлагане на данъчна или правна консултация.</p></form>
}
