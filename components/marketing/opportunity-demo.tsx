"use client"

import Link from "next/link"
import { useState } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { ArrowDown, ArrowRight, Check, ChevronRight, Gauge, ShieldCheck, Wifi, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const modules = [
  { id: "strom", name: "Strom", icon: Gauge, min: 35, max: 180, initial: 86, tone: "bg-[#ffffff]" },
  { id: "gas", name: "Gas", icon: Gauge, min: 40, max: 220, initial: 118, tone: "bg-[#ffffff]" },
  { id: "internet", name: "Internet", icon: Wifi, min: 20, max: 90, initial: 49, tone: "bg-[#ffffff]" },
  { id: "versicherung", name: "Versicherungen", icon: ShieldCheck, min: 25, max: 260, initial: 112, tone: "bg-[#ffffff]" },
] as const

const outcomes = {
  bg: ["Нужна е проверка на тарифата", "Липсват данни за сравнение", "Готово за персонална проверка"],
  de: ["Tarifprüfung erforderlich", "Vergleichsdaten fehlen", "Bereit für die persönliche Prüfung"],
}

export function OpportunityDemo() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(modules.map((module) => [module.id, module.initial])))
  const [state, setState] = useState<"idle" | "analysing" | "done">("idle")
  const monthly = Object.values(values).reduce((sum, value) => sum + value, 0)

  function startCheck() {
    setState("analysing")
    window.setTimeout(() => setState("done"), 900)
  }

  return (
    <>
      <section className="relative overflow-hidden border-y border-[#cbd5e1]/50 bg-[#0f172a] py-5 text-[#f8fafc] sm:hidden" aria-label={de ? "Opportunity Demo öffnen" : "Отвори демо за възможности"}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">Opportunity Demo</p>
            <p className="mt-1 text-sm font-semibold text-[#f8fafc]">{de ? "Verschaffe dir einen schnellen Überblick." : "Получи бърз преглед на възможностите."}</p>
          </div>
          <Button type="button" onClick={() => setIsOpen(true)} aria-label={de ? "Opportunity Demo öffnen" : "Отвори демо за възможности"} className="relative shrink-0 bg-[#2563eb] text-[#f8fafc] shadow-sm hover:bg-[#3b82f6]"><ArrowDown className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#2563eb]" aria-hidden="true" /><span>{de ? "Demo öffnen" : "Отвори демо"}</span><ChevronRight data-icon="inline-end" /></Button>
        </div>
      </section>
      <section className={`fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/90 px-4 py-8 backdrop-blur-sm sm:px-6 ${isOpen ? "block" : "hidden"}`} role="dialog" aria-modal="true" aria-labelledby="opportunity-demo-title">
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Button type="button" onClick={() => setIsOpen(false)} variant="outline" aria-label={de ? "Opportunity Demo schließen" : "Затвори демо за възможности"} className="absolute right-4 top-4 border-[#2563eb]/40 bg-[#ffffff]/80 text-[#f8fafc] hover:bg-[#2563eb]/20"><X data-icon="inline-start" />{de ? "Schließen" : "Затвори"}</Button>
        <div className="max-w-2xl">
          <p className="mb-2 hidden text-sm font-semibold text-[#2563eb] sm:block">Opportunity Demo</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">Opportunity Demo</p>
          <h2 id="opportunity-demo-title" className="mt-4 text-balance text-3xl font-bold tracking-tight text-[#f8fafc] md:text-5xl">Намали разходите си от УТРЕ !</h2>
          <p className="mt-4 max-w-xl text-pretty leading-7 text-[#64748b]">Тук само с няколко клика намаляш дългосрочно основните месечни разходи.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch">
          <div className="grid gap-4 sm:grid-cols-2" aria-label="Разходни модули">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <label key={module.id} className={`group relative overflow-hidden rounded-sm border border-[#2563eb]/35 ${module.tone} p-5 text-[#f8fafc] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#2563eb]/70 motion-reduce:transform-none ${index % 2 ? "lg:translate-y-5" : ""}`}>
                  <span className="absolute -right-8 -top-8 size-28 rounded-full border border-[#2563eb]/25 bg-[#2563eb]/10" />
                  <span className="relative flex items-center justify-between">
                    <span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-sm border border-[#2563eb]/35 bg-[#ffffff]/80 text-[#2563eb]"><Icon aria-hidden="true" /></span><span className="font-semibold">{module.name}</span></span>
                    <span className="font-mono text-sm text-[#64748b]">{values[module.id]} € / мес.</span>
                  </span>
                  <input className="relative mt-8 w-full accent-[#2563eb]" type="range" min={module.min} max={module.max} value={values[module.id]} aria-label={`Месечен разход за ${module.name}`} onChange={(event) => setValues((current) => ({ ...current, [module.id]: Number(event.target.value) }))} />
                  <span className="relative mt-2 flex justify-between text-xs text-[#94a3b8]"><span>{module.min} €</span><span>{module.max} €</span></span>
                </label>
              )
            })}
          </div>

          <div className="flex flex-col justify-between rounded-sm border border-[#2563eb]/45 bg-[#ffffff] p-6 shadow-sm motion-reduce:transform-none">
            <div>
              <p className="text-sm text-[#2563eb]">Твоят текущ ориентир</p>
              <p className="mt-3 font-mono text-4xl font-bold tracking-tight">{monthly} €<span className="ml-2 text-base font-normal text-[#94a3b8]">/ мес.</span></p>
              <p className="mt-2 text-sm text-[#64748b]">{monthly * 12} € годишно за избраните разходи</p>
              <div className="mt-6 rounded-sm border border-[#2563eb]/25 bg-[#0f172a]/45 p-4" aria-live="polite">
                {state === "idle" && <p className="text-sm text-[#64748b]">Готово за неутрална проверка на наличните възможности.</p>}
                {state === "analysing" && <p className="animate-pulse text-sm text-[#2563eb]">Анализираме избраните разходи…</p>}
                {state === "done" && <div className="flex items-start gap-2 text-sm text-[#f8fafc]"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#2563eb]" /><span>{outcomes[de ? "de" : "bg"][monthly % 3]}</span></div>}
              </div>
            </div>
            <div className="mt-8">
              <Button type="button" onClick={startCheck} disabled={state === "analysing"} className="w-full bg-[#2563eb] text-[#f8fafc] shadow-sm hover:bg-[#3b82f6]">{state === "analysing" ? "Проверяваме…" : "Стартирай проверка"}<ChevronRight data-icon="inline-end" /></Button>
              {state === "done" && <p className="mt-4 text-center text-sm font-semibold text-[#2563eb]">4 разхода за проверка</p>}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-sm border border-[#cbd5e1]/60 bg-[#ffffff]/45 p-5 text-sm leading-6 text-[#64748b] md:flex-row md:items-center md:justify-between">
          <p>Реалните резултати изискват адрес, потребление, договорни данни и проверени партньорски оферти.</p>
          <Button asChild variant="outline" className="shrink-0 border-[#2563eb]/50 bg-transparent text-[#f8fafc] hover:bg-[#2563eb]/15"><Link href="/auth/sign-up">Регистрирай се и направи реална проверка<ArrowRight data-icon="inline-end" /></Link></Button>
        </div>
        <p className="mt-5 max-w-4xl text-xs leading-5 text-[#94a3b8]">Това е илюстративно демо, а не оферта или обещание за спестяване. Реалните резултати зависят от твоите данни и проверени партньорски оферти.</p>
      </div>
      </section>
    </>
  )
}
