"use client"

import { useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { startGuideCase } from "@/lib/horizon/guide/actions"
import { recommendGuideIntent, type SituationRecommendation } from "@/lib/horizon/guide/situation-router"

const labels: Record<SituationRecommendation["reason"], Record<"bg" | "de", { title: string; reason: string }>> = {
  application: { bg: { title: "Кандидатстване за помощ", reason: "Описанието подсказва, че искаш да започнеш заявление." }, de: { title: "Hilfe beantragen", reason: "Deine Beschreibung deutet darauf hin, dass du einen Antrag beginnen möchtest." } },
  deadline: { bg: { title: "Срок или отговор", reason: "Описанието подсказва, че има срок или трябва да отговориш." }, de: { title: "Frist oder Antwort", reason: "Deine Beschreibung deutet auf eine Frist oder eine Antwort hin." } },
  cancellation: { bg: { title: "Прекратяване на договор", reason: "Описанието подсказва, че искаш да прекратиш договор." }, de: { title: "Vertrag kündigen", reason: "Deine Beschreibung deutet auf eine Kündigung hin." } },
  document: { bg: { title: "Разбиране на документ", reason: "Описанието споменава писмо или документ." }, de: { title: "Dokument verstehen", reason: "Deine Beschreibung erwähnt einen Brief oder ein Dokument." } },
  unclear: { bg: { title: "Общ случай", reason: "Няма достатъчно ясни сигнали. Ще започнем без предположения." }, de: { title: "Allgemeiner Vorgang", reason: "Es gibt noch keine eindeutigen Hinweise. Wir starten ohne Annahmen." } },
}

export function SituationRouter({ locale }: { locale: "bg" | "de" }) {
  const de = locale === "de"
  const [description, setDescription] = useState("")
  const [recommendation, setRecommendation] = useState<SituationRecommendation | null>(null)
  const copy = de
    ? { title: "Beschreibe kurz deine Situation", hint: "Zum Beispiel: „Ich habe einen Brief vom Finanzamt bekommen.“", label: "Deine Situation", assess: "Passenden Weg vorschlagen", continue: "Mit diesem Weg fortfahren", save: "Deine Beschreibung wird dem neuen Vorgang als dein Text hinzugefügt." }
    : { title: "Опиши накратко ситуацията", hint: "Например: „Получих писмо от Finanzamt.“", label: "Твоята ситуация", assess: "Предложи подходящ път", continue: "Продължи с този път", save: "Описанието ти ще бъде добавено като твой текст към новия случай." }
  const suggestion = recommendation ? labels[recommendation.reason][locale] : null

  return <section className="paper paper-note mt-6 p-4 sm:p-5" aria-labelledby="situation-router-title">
    <div className="flex gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 id="situation-router-title" className="text-sm font-semibold">{copy.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.hint}</p></div></div>
    <label className="mt-4 block text-xs font-medium" htmlFor="situation-description">{copy.label}</label>
    <textarea id="situation-description" value={description} onChange={(event) => { setDescription(event.target.value); setRecommendation(null) }} maxLength={1800} rows={4} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    {!recommendation ? <button type="button" disabled={!description.trim()} onClick={() => setRecommendation(recommendGuideIntent(description))} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{copy.assess}<ArrowRight className="ml-2 size-4" /></button> : null}
    {recommendation && suggestion ? <div className="paper paper-inset mt-4 p-4"><p className="text-sm font-semibold">{suggestion.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p><form action={startGuideCase} className="mt-3"><input type="hidden" name="intent" value={recommendation.intent} /><input type="hidden" name="locale" value={locale} /><input type="hidden" name="description" value={description} /><button type="submit" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">{copy.continue}<ArrowRight className="ml-2 size-4" /></button><p className="mt-2 text-xs text-muted-foreground">{copy.save}</p></form></div> : null}
  </section>
}
