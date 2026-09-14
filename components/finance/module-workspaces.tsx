"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Check, CircleAlert, FileUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EntitlementNavigator() {
  const [children, setChildren] = useState("")
  const [income, setIncome] = useState("")
  const [status, setStatus] = useState<"NEEDS_MORE_DATA" | "POSSIBLY_RELEVANT" | null>(null)
  return <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Entitlement Navigator</p><h2 className="mt-2 text-2xl font-semibold text-foreground">Провери следващата стъпка</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Това е предварителен ориентир. Не потвърждава право на конкретна помощ.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-foreground">Деца в домакинството<input className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3" inputMode="numeric" value={children} onChange={(event) => setChildren(event.target.value)} placeholder="напр. 1" /></label><label className="text-sm font-medium text-foreground">Месечен нетен доход<input className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} placeholder="в €" /></label></div><Button className="mt-5" onClick={() => setStatus(children && income ? "POSSIBLY_RELEVANT" : "NEEDS_MORE_DATA")}>Покажи предварителен статус <ArrowRight data-icon="inline-end" /></Button>{status && <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4" role="status"><p className="font-semibold text-foreground">{status}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{status === "POSSIBLY_RELEVANT" ? "Има основание да провериш подходящите официални страници и документи. Не е извършена правна проверка." : "Въведи поне деца и доход, за да продължиш с по-смислена предварителна ориентация."}</p></div>}</section>
}

export function DocumentWorkspace() {
  const [fileName, setFileName] = useState("")
  return <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Dokumente</p><h2 className="mt-2 text-2xl font-semibold text-foreground">Документна зона</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Избери файл, за да подготвиш работната си папка. OCR и автоматично извличане са <strong>NOT_CONFIGURED</strong>.</p><label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center"><FileUp className="size-7 text-primary" /><span className="font-medium text-foreground">Добави документ</span><span className="text-sm text-muted-foreground">PDF, JPG или PNG · файлът не се анализира автоматично</span><input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>{fileName && <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-4 text-sm"><span className="truncate text-foreground">{fileName}</span><span className="shrink-0 text-xs font-semibold text-amber-600">NOT_CONFIGURED</span></div>}<div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0" />Няма фалшив анализ или извлечено съдържание. За реално съхранение е необходима Storage интеграция.</div></section>
}

export function TariffWorkspace() {
  return <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tarife</p><h2 className="mt-2 text-2xl font-semibold text-foreground">Проверка на реални оферти</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Партньорските предложения се отварят във външен доставчик. KintexBG не измисля тарифи и не обещава спестяване.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button asChild><Link href="/produkte">Отвори сравненията <ArrowRight data-icon="inline-end" /></Link></Button><Button asChild variant="outline"><a href="https://www.check24.de/internet/" target="_blank" rel="sponsored noopener noreferrer">Сравни интернет <ExternalLink data-icon="inline-end" /></a></Button></div><p className="mt-4 text-xs text-muted-foreground">Статус: EXTERNAL_PROVIDER · ако widget-ът не зареди, използвай директната връзка.</p></section>
}

export function ProgressChecklist({ items }: { items: string[] }) { return <div className="mt-6 grid gap-3 sm:grid-cols-2">{items.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span className="text-sm leading-6 text-foreground">{item}</span></div>)}</div> }

export function ModuleLink({ href, children }: { href: string; children: ReactNode }) { return <Button asChild variant="outline"><Link href={href}>{children}</Link></Button> }
