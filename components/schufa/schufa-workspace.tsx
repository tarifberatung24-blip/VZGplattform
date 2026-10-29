"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ExternalLink,
  FileUp,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { SCHUFA_CATEGORY_LABEL, SCHUFA_FREE_APPLICATION_URL, type SchufaCategory, type SchufaPlan } from "@/lib/schufa/plan"

type Step = "apply" | "upload" | "plan"

const copy = {
  bg: {
    eyebrow: "Шуфа помощ",
    title: "Провери и подобри своята SCHUFA",
    intro:
      "Вземи безплатната си справка, качи я тук и получи план как да възстановиш платежоспособността си. Нищо не се изпраща и не се записва без твоето действие.",
    stepApply: "1. Вземи безплатната справка",
    stepUpload: "2. Качи справката",
    stepPlan: "3. Твоят план",
    applyBody:
      "По чл. 15 DSGVO (Datenkopie) имаш право на безплатно копие от данните, които SCHUFA пази за теб. Това е същата справка, която ти трябва за плана — не плащай за „проверка на оценка“.",
    applyCta: "Отвори безплатната заявка",
    applyNote: "Отваря се официалната страница на SCHUFA в нов таб.",
    continue: "Вече имам справката",
    uploadTitle: "Качи справката (PDF)",
    uploadHint: "Текстът се извлича в паметта и не се записва. Ако е сканирано копие, постави текста по-долу.",
    choose: "Избери PDF",
    uploading: "Извличам текста…",
    orPaste: "или постави текста от справката",
    pastePlaceholder: "Постави тук текста от твоята SCHUFA Datenkopie…",
    analyze: "Направи план",
    analyzing: "Съставям плана…",
    extractFailed: "Текстът не можа да се извлече. Постави го ръчно по-долу.",
    ocrRequired: "Това изглежда сканирано копие без текст. Постави текста ръчно по-долу.",
    tooLarge: "Файлът е твърде голям (макс. 10 MB).",
    typeUnsupported: "Поддържа се само PDF.",
    analyzeFailed: "Планът не можа да се състави. Опитай отново.",
    rateLimited: "Твърде много заявки. Изчакай малко и опитай отново.",
    authRequired: "Влез в профила си, за да използваш Шуфа помощта.",
    noText: "Първо качи или постави текста на справката.",
    planTitle: "Твоят план за възстановяване",
    planEmpty:
      "В текста не открихме разпознаваеми записи. Провери дали си поставил пълния текст от Datenkopie, или го качи като PDF.",
    found: "Открити записи",
    unreadable: "Неразчетени раздели",
    actions: "Стъпки",
    horizon: "Ориентир",
    notes: "Важно",
    restart: "Нова справка",
    disclaimerLabel: "Информация",
    sources: "Официални източници",
    openGuide: "Виж наръчника",
  },
  de: {
    eyebrow: "SCHUFA-Hilfe",
    title: "Prüfe und verbessere deine SCHUFA",
    intro:
      "Hol dir deine kostenlose Auskunft, lade sie hier hoch und erhalte einen Plan, wie du deine Bonität wiederherstellst. Nichts wird gesendet oder gespeichert ohne deine Handlung.",
    stepApply: "1. Kostenlose Auskunft holen",
    stepUpload: "2. Auskunft hochladen",
    stepPlan: "3. Dein Plan",
    applyBody:
      "Nach Art. 15 DSGVO (Datenkopie) hast du ein Recht auf eine kostenlose Kopie der Daten, die SCHUFA über dich speichert. Das ist dieselbe Auskunft, die du für den Plan brauchst – zahle nicht für einen „Score-Check“.",
    applyCta: "Kostenlosen Antrag öffnen",
    applyNote: "Öffnet die offizielle SCHUFA-Seite in einem neuen Tab.",
    continue: "Ich habe die Auskunft schon",
    uploadTitle: "Auskunft hochladen (PDF)",
    uploadHint: "Der Text wird im Speicher ausgelesen und nicht gespeichert. Bei einem Scan den Text unten einfügen.",
    choose: "PDF wählen",
    uploading: "Text wird ausgelesen …",
    orPaste: "oder Text aus der Auskunft einfügen",
    pastePlaceholder: "Hier den Text deiner SCHUFA-Datenkopie einfügen …",
    analyze: "Plan erstellen",
    analyzing: "Plan wird erstellt …",
    extractFailed: "Der Text konnte nicht ausgelesen werden. Bitte unten manuell einfügen.",
    ocrRequired: "Das sieht nach einem Scan ohne Textebene aus. Bitte den Text unten einfügen.",
    tooLarge: "Die Datei ist zu groß (max. 10 MB).",
    typeUnsupported: "Nur PDF wird unterstützt.",
    analyzeFailed: "Der Plan konnte nicht erstellt werden. Bitte erneut versuchen.",
    rateLimited: "Zu viele Anfragen. Bitte kurz warten.",
    authRequired: "Bitte anmelden, um die SCHUFA-Hilfe zu nutzen.",
    noText: "Bitte zuerst die Auskunft hochladen oder den Text einfügen.",
    planTitle: "Dein Sanierungsplan",
    planEmpty:
      "Im Text wurden keine erkennbaren Einträge gefunden. Prüfe, ob du den vollständigen Text der Datenkopie eingefügt hast, oder lade sie als PDF hoch.",
    found: "Gefundene Einträge",
    unreadable: "Nicht gelesene Abschnitte",
    actions: "Schritte",
    horizon: "Orientierung",
    notes: "Wichtig",
    restart: "Neue Auskunft",
    disclaimerLabel: "Hinweis",
    sources: "Offizielle Quellen",
    openGuide: "Ratgeber ansehen",
  },
} satisfies Record<"bg" | "de", Record<string, string>>

type Copy = Record<string, string>

const SCHUFA_SOURCES = [
  { label: "Art. 15 DSGVO — Recht auf Datenkopie", url: "https://www.gesetze-im-internet.de/dsgvo/__15.html" },
  { label: "§ 34 BDSG — Auskunftsrecht", url: "https://www.gesetze-im-internet.de/bdsg_2018/__34.html" },
  { label: "SCHUFA — Datenkopie anfordern", url: SCHUFA_FREE_APPLICATION_URL },
]

function errorCopy(code: string, c: Copy): string {
  if (code === "RATE_LIMITED") return c.rateLimited
  if (code === "AUTHENTICATION_REQUIRED") return c.authRequired
  if (code === "NO_TEXT_TO_ANALYZE") return c.noText
  return c.analyzeFailed
}

/**
 * The SCHUFA workspace: apply, upload, plan.
 *
 * Three steps the user drives. The first links to the free statutory data copy so
 * nobody pays for something they are entitled to. The second reads the text in
 * memory. The third shows the deterministic plan — the same document always
 * produces the same steps — with official sources and a clear note that no score
 * is promised.
 */
export function SchufaWorkspace() {
  const { locale } = useLanguage()
  const c = copy[locale === "de" ? "de" : "bg"]
  const [step, setStep] = useState<Step>("apply")
  const [text, setText] = useState("")
  const [plan, setPlan] = useState<SchufaPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const analyze = useCallback(async () => {
    if (text.trim().length < 20) {
      setError(c.noText)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/schufa/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const payload = (await response.json().catch(() => ({}))) as { plan?: SchufaPlan; code?: string }
      if (!response.ok || !payload.plan) {
        setError(errorCopy(payload.code ?? "", c))
        return
      }
      setPlan(payload.plan)
      setStep("plan")
    } catch {
      setError(c.analyzeFailed)
    } finally {
      setBusy(false)
    }
  }, [c, text])

  const upload = useCallback(
    async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(c.tooLarge)
        return
      }
      if (file.type !== "application/pdf") {
        setError(c.typeUnsupported)
        return
      }
      setBusy(true)
      setError(null)
      try {
        const form = new FormData()
        form.append("file", file)
        const response = await fetch("/api/schufa/extract", { method: "POST", body: form })
        const payload = (await response.json().catch(() => ({}))) as { status?: string; text?: string; code?: string }
        if (!response.ok) {
          setError(errorCopy(payload.code ?? "", c))
          return
        }
        if (payload.status === "extracted" && payload.text) {
          setText(payload.text)
          setError(null)
        } else {
          setError(c.ocrRequired)
        }
      } catch {
        setError(c.extractFailed)
      } finally {
        setBusy(false)
      }
    },
    [c],
  )

  const restart = () => {
    setStep("apply")
    setText("")
    setPlan(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const counts = plan
    ? plan.entries.reduce<Partial<Record<SchufaCategory, number>>>((acc, entry) => {
        acc[entry.category] = (acc[entry.category] ?? 0) + 1
        return acc
      }, {})
    : {}

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <header className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          {c.eyebrow}
        </p>
        <h1 className="mt-4 text-balance text-3xl font-black tracking-[-0.03em] md:text-4xl">{c.title}</h1>
        <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">{c.intro}</p>
      </header>

      <ol className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
        {([["apply", c.stepApply], ["upload", c.stepUpload], ["plan", c.stepPlan]] as const).map(([id, label]) => (
          <li
            key={id}
            aria-current={step === id ? "step" : undefined}
            className={`rounded-full border px-3 py-1.5 ${
              step === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {error ? (
        <p role="alert" className="paper paper-note paper-note-danger mt-5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {step === "apply" ? (
        <section className="paper mt-6 p-5">
          <p className="text-sm leading-6 text-muted-foreground">{c.applyBody}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={SCHUFA_FREE_APPLICATION_URL}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {c.applyCta}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              {c.continue}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{c.applyNote}</p>
        </section>
      ) : null}

      {step === "upload" ? (
        <section className="paper mt-6 p-5">
          <h2 className="text-base font-semibold">{c.uploadTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.uploadHint}</p>
          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileUp className="size-4" aria-hidden="true" />}
              {busy ? c.uploading : c.choose}
            </button>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold">{c.orPaste}</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              maxLength={60000}
              placeholder={c.pastePlaceholder}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => void analyze()}
            disabled={busy || text.trim().length < 20}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {busy ? c.analyzing : c.analyze}
          </button>
        </section>
      ) : null}

      {step === "plan" && plan ? (
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{c.planTitle}</h2>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {c.restart}
            </button>
          </div>

          {plan.empty ? (
            <p className="paper paper-note px-4 py-3 text-sm text-muted-foreground">{c.planEmpty}</p>
          ) : (
            <>
              <div className="paper p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.found}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(counts) as SchufaCategory[]).map((category) => (
                    <li key={category} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
                      {SCHUFA_CATEGORY_LABEL[category][locale]} · {counts[category]}
                    </li>
                  ))}
                </ul>
                {plan.unreadable.length ? (
                  <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {c.unreadable}: {plan.unreadable.map((category) => SCHUFA_CATEGORY_LABEL[category][locale]).join(", ")}
                  </p>
                ) : null}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.actions}</h3>
                <ol className="mt-2 space-y-3">
                  {plan.actions.map((action, index) => (
                    <li key={action.id} className="paper p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold">{action.title[locale]}</h4>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.detail[locale]}</p>
                          {action.horizon ? (
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {c.horizon}: {action.horizon[locale]}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          <div className="paper paper-inset p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.notes}</h3>
            <ul className="mt-2 space-y-2">
              {plan.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {note[locale]}
                </li>
              ))}
            </ul>
          </div>

          <div className="paper paper-inset p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.sources}</h3>
            <ul className="mt-2 space-y-2">
              {SCHUFA_SOURCES.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="flex items-start gap-2 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="flex items-start gap-2 rounded-md border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {plan.disclaimer}
          </p>

          <Link
            href={localizedPath("/ratgeber", locale)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {c.openGuide}
          </Link>
        </section>
      ) : null}
    </div>
  )
}
