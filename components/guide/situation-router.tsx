"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { startGuideCase } from "@/lib/horizon/guide/actions"
import { startModuleCase } from "@/lib/horizon/modules/actions"
import { recommendGuideIntent, type SituationRecommendation } from "@/lib/horizon/guide/situation-router"

type RouterLabel = { title: string; reason: string; action: string }

const labels: Record<SituationRecommendation["reason"], Record<"bg" | "de", RouterLabel>> = {
  application: {
    bg: { title: "Кандидатстване за помощ", reason: "Описанието подсказва, че искаш да започнеш заявление.", action: "Продължи с този път" },
    de: { title: "Hilfe beantragen", reason: "Deine Beschreibung deutet darauf hin, dass du einen Antrag beginnen möchtest.", action: "Mit diesem Weg fortfahren" },
  },
  deadline: {
    bg: { title: "Срок или отговор", reason: "Описанието подсказва, че има срок или трябва да отговориш.", action: "Продължи с този път" },
    de: { title: "Frist oder Antwort", reason: "Deine Beschreibung deutet auf eine Frist oder eine Antwort hin.", action: "Mit diesem Weg fortfahren" },
  },
  cancellation: {
    bg: { title: "Прекратяване на договор", reason: "Описанието подсказва, че искаш да прекратиш договор.", action: "Продължи с този път" },
    de: { title: "Vertrag kündigen", reason: "Deine Beschreibung deutet darauf hin, dass du einen Vertrag kündigen möchtest.", action: "Mit diesem Weg fortfahren" },
  },
  document: {
    bg: { title: "Разбиране на документ", reason: "Описанието споменава писмо или документ.", action: "Продължи с този път" },
    de: { title: "Dokument verstehen", reason: "Deine Beschreibung erwähnt einen Brief oder ein Dokument.", action: "Mit diesem Weg fortfahren" },
  },
  energy: {
    bg: { title: "Провери тарифата за ток или газ", reason: "Описанието е за по-евтина тарифа. Ще отворим Договори и тарифи.", action: "Отвори Договори и тарифи" },
    de: { title: "Strom- oder Gastarif prüfen", reason: "Deine Beschreibung betrifft einen günstigeren Tarif. Wir öffnen Verträge und Tarife.", action: "Verträge und Tarife öffnen" },
  },
  jobcenter: {
    bg: { title: "Помощ от Jobcenter", reason: "Описанието изрично споменава Jobcenter или Bürgergeld.", action: "Отвори Jobcenter помощ" },
    de: { title: "Hilfe vom Jobcenter", reason: "Deine Beschreibung erwähnt ausdrücklich Jobcenter oder Bürgergeld.", action: "Jobcenter-Hilfe öffnen" },
  },
  agentur: {
    bg: { title: "Помощ от Arbeitsagentur", reason: "Описанието изрично споменава Arbeitsagentur или Arbeitsamt.", action: "Отвори Arbeitsagentur помощ" },
    de: { title: "Hilfe von der Arbeitsagentur", reason: "Deine Beschreibung erwähnt ausdrücklich Arbeitsagentur oder Arbeitsamt.", action: "Arbeitsagentur-Hilfe öffnen" },
  },
  unclear: {
    bg: { title: "Общ случай", reason: "Няма достатъчно ясни сигнали. Ще започнем без предположения.", action: "Продължи с този път" },
    de: { title: "Allgemeiner Vorgang", reason: "Es gibt noch keine eindeutigen Hinweise. Wir starten ohne Annahmen.", action: "Mit diesem Weg fortfahren" },
  },
}

export function SituationRouter({ locale }: { locale: "bg" | "de" }) {
  const de = locale === "de"
  const [description, setDescription] = useState("")
  const [recommendation, setRecommendation] = useState<SituationRecommendation | null>(null)
  const copy = de
    ? {
        title: "Beschreibe kurz deine Situation",
        hint: "Zum Beispiel: „Ich suche einen günstigeren Stromtarif.“",
        label: "Deine Situation",
        assess: "Passenden Weg vorschlagen",
        save: "Deine Beschreibung wird dem neuen Vorgang als dein Text hinzugefügt.",
      }
    : {
        title: "Опиши накратко ситуацията",
        hint: "Например: „Търся по-евтина тарифа за ток.“",
        label: "Твоята ситуация",
        assess: "Предложи подходящ път",
        save: "Описанието ти ще бъде добавено като твой текст към новия случай.",
      }
  const suggestion = recommendation ? labels[recommendation.reason][locale] : null

  return (
    <section className="paper paper-note mt-6 p-4 sm:p-5" aria-labelledby="situation-router-title">
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 id="situation-router-title" className="text-sm font-semibold">{copy.title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.hint}</p>
        </div>
      </div>
      <label className="mt-4 block text-xs font-medium" htmlFor="situation-description">{copy.label}</label>
      <textarea
        id="situation-description"
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
          setRecommendation(null)
        }}
        maxLength={1800}
        rows={4}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {!recommendation ? (
        <button type="button" disabled={!description.trim()} onClick={() => setRecommendation(recommendGuideIntent(description))} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {copy.assess}<ArrowRight className="ml-2 size-4" />
        </button>
      ) : null}
      {recommendation && suggestion ? (
        <div className="paper paper-inset mt-4 p-4">
          <p className="text-sm font-semibold">{suggestion.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
          {recommendation.destination.kind === "contracts" ? (
            <Link href={`/${locale}/vertraege`} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {suggestion.action}<ArrowRight className="ml-2 size-4" />
            </Link>
          ) : recommendation.destination.kind === "module" ? (
            <form action={startModuleCase} className="mt-3">
              <input type="hidden" name="module" value={recommendation.destination.module} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
                {suggestion.action}<ArrowRight className="ml-2 size-4" />
              </button>
            </form>
          ) : (
            <form action={startGuideCase} className="mt-3">
              <input type="hidden" name="intent" value={recommendation.intent} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="description" value={description} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
                {suggestion.action}<ArrowRight className="ml-2 size-4" />
              </button>
              <p className="mt-2 text-xs text-muted-foreground">{copy.save}</p>
            </form>
          )}
        </div>
      ) : null}
    </section>
  )
}
