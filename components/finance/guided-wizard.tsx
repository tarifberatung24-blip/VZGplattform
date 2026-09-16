"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CircleAlert, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n/language-context"

type WizardKind = "kindergeld" | "steuer"
type Answer = string | boolean
type Field = { id: string; label: string; type?: "date" | "number" | "text"; required?: boolean }
type Step = { id: string; title: string; question: string; help: string; fields: Field[] }

const configs: Record<WizardKind, { steps: Step[]; href: string }> = {
  kindergeld: { href: "/kindergeld", steps: [
    { id: "applicant", title: "Antragsteller", question: "Wer stellt den Antrag?", help: "Diese Angaben werden als persönliche Angaben gespeichert.", fields: [{ id: "firstName", label: "Vorname / Име", required: true }, { id: "lastName", label: "Nachname / Фамилия", required: true }, { id: "address", label: "Adresse / Адрес", required: true }] },
    { id: "child", title: "Kind", question: "Für welches Kind?", help: "Diese Angaben gehören zum Kind-Abschnitt.", fields: [{ id: "childName", label: "Name des Kindes / Име на детето", required: true }, { id: "childBirthDate", label: "Geburtsdatum / Дата на раждане", type: "date", required: true }] },
    { id: "eligibility", title: "Voraussetzungen", question: "Welche Situation trifft zu?", help: "Es wird kein Anspruch berechnet.", fields: [{ id: "livesInGermany", label: "Kind lebt in Deutschland / Детето живее в Германия", required: true }, { id: "otherBenefits", label: "Andere Familienleistung / Друга семейна помощ", required: true }] },
  ] },
  steuer: { href: "/steuer", steps: [
    { id: "year", title: "Steuerjahr", question: "Für welches Steuerjahr?", help: "Das Steuerjahr bestimmt die später prüfbaren Formulare.", fields: [{ id: "taxYear", label: "Steuerjahr / Данъчна година", type: "number", required: true }] },
    { id: "employment", title: "Arbeit", question: "Welche Arbeitssituation trifft zu?", help: "Nur passende Folgefragen werden später ergänzt.", fields: [{ id: "employmentType", label: "Arbeitsverhältnis / Трудова ситуация", required: true }, { id: "hasCommute", label: "Arbeitsweg vorhanden? / Имаш ли пътуване до работа?", required: true }] },
    { id: "expenses", title: "Ausgaben", question: "Welche Ausgaben möchtest du prüfen?", help: "Keine Beträge werden geschätzt.", fields: [{ id: "hasHomeOffice", label: "Homeoffice / Работа от дома", required: true }, { id: "hasChildren", label: "Kinder / Деца", required: true }] },
  ] },
}

export function GuidedWizard({ kind }: { kind: WizardKind }) {
  const { locale } = useLanguage(); const de = locale === "de"; const config = configs[kind]
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<Record<string, Answer>>({}); const [draftId, setDraftId] = useState<string>(); const [saveState, setSaveState] = useState("idle"); const [error, setError] = useState<string | null>(null); const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const current = config.steps[step]; const progress = Math.round(((step + 1) / config.steps.length) * 100)
  const requiredMissing = useMemo(() => current.fields.filter((field) => field.required && !String(answers[field.id] ?? "").trim()), [answers, current])
  useEffect(() => { let cancelled = false; if (kind !== "kindergeld") return; fetch(`/api/kindergeld/draft?locale=${locale}`).then(async (response) => { if (!response.ok) throw new Error("DRAFT_LOAD_FAILED"); return response.json() }).then((payload: { draft?: { id: string; answers: Record<string, Answer>; current_step: number } }) => { if (!cancelled && payload.draft) { setDraftId(payload.draft.id); setAnswers(payload.draft.answers); setStep(Math.min(payload.draft.current_step, config.steps.length - 1)) } }).catch(() => { if (!cancelled) setError(de ? "Entwurf konnte nicht geladen werden." : "Черновата не може да се зареди.") }); return () => { cancelled = true } }, [config.steps.length, de, kind, locale])
  useEffect(() => { if (kind !== "kindergeld" || !Object.keys(answers).length) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(async () => { setSaveState("saving"); try { const response = await fetch("/api/kindergeld/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftId, locale, answers, currentStep: step }) }); const payload = await response.json() as { draft?: { id: string } }; if (!response.ok || !payload.draft) throw new Error("DRAFT_SAVE_FAILED"); setDraftId(payload.draft.id); setSaveState("saved") } catch { setSaveState("error") } }, 500); return () => clearTimeout(saveTimer.current) }, [answers, draftId, kind, locale, step])
  function update(id: string, value: Answer) { setAnswers((currentAnswers) => ({ ...currentAnswers, [id]: value })); setError(null); setSaveState("idle") }
  function next() { if (requiredMissing.length) { setError(de ? "Bitte fülle die Pflichtfelder aus." : "Моля, попълни задължителните полета."); return } setError(null); setStep((value) => Math.min(value + 1, config.steps.length - 1)) }
  const saveLabel = saveState === "saving" ? (de ? "Speichert…" : "Записване…") : saveState === "saved" ? (de ? "Gespeichert" : "Записано") : saveState === "error" ? (de ? "Speichern fehlgeschlagen" : "Грешка при запис") : (de ? "Autosave bereit" : "Autosave готов")
  return <main className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-3xl"><Link href={config.href} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{de ? "Zurück" : "Назад"}</Link><p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">KintexBG · {kind === "steuer" ? "Steuer" : "Kindergeld"}</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{de ? (kind === "steuer" ? "Steuererklärung vorbereiten" : "Kindergeld-Antrag vorbereiten") : (kind === "steuer" ? "Подготовка на данъчна декларация" : "Подготовка на заявление за Kindergeld")}</h1><div className="mt-8 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div><span className="text-sm font-medium">{progress}%</span></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Save className="size-4" />{saveLabel}</div><section className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="flex items-start gap-3"><CircleAlert className="mt-1 size-5 shrink-0 text-primary" /><div><h2 className="font-semibold">{current.question}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.help}</p></div></div><div className="mt-8 grid gap-5 sm:grid-cols-2">{current.fields.map((field) => <div key={field.id} className="space-y-2"><Label htmlFor={field.id}>{field.label}{field.required ? " *" : ""}</Label><Input id={field.id} type={field.type ?? "text"} value={String(answers[field.id] ?? "")} onChange={(event) => update(field.id, event.target.value)} /></div>)}</div>{error && <p className="mt-5 text-sm text-destructive" role="alert">{error}</p>}<div className="mt-8 flex justify-between gap-3"><Button variant="outline" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0}><ArrowLeft className="mr-2 size-4" />{de ? "Zurück" : "Назад"}</Button><Button onClick={next} disabled={saveState === "saving"}>{step === config.steps.length - 1 ? (de ? "Prüfen" : "Преглед") : (de ? "Weiter" : "Напред")}<ArrowRight className="ml-2 size-4" /></Button></div></section></div></main>
}
