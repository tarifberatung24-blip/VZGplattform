"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Send, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  serviceRequestMeta,
  serviceRequestKinds,
  type ServiceRequestKind,
} from "@/lib/service-request"

type Field = {
  id: string
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea" | "choice"
  required?: boolean
  labelBg: string
  labelDe: string
  placeholderBg?: string
  placeholderDe?: string
  choices?: Array<{ value: string; bg: string; de: string }>
}

type Step = {
  id: string
  questionBg: string
  questionDe: string
  helpBg: string
  helpDe: string
  fields: Field[]
}

const contactStep: Step = {
  id: "contact",
  questionBg: "Къде да изпратим резултата?",
  questionDe: "Wohin sollen wir das Ergebnis senden?",
  helpBg: "Нужно е само най-важното, за да може офертата да стигне до теб.",
  helpDe: "Nur das Wichtigste, damit das Angebot bei dir ankommt.",
  fields: [
    { id: "fullName", required: true, labelBg: "Име", labelDe: "Name", placeholderBg: "Иван Петров", placeholderDe: "Ivan Petrov" },
    { id: "email", type: "email", required: true, labelBg: "Имейл", labelDe: "E-Mail", placeholderBg: "name@email.de", placeholderDe: "name@email.de" },
    { id: "phone", type: "tel", labelBg: "Телефон по желание", labelDe: "Telefon optional", placeholderBg: "+49 ...", placeholderDe: "+49 ..." },
  ],
}

const serviceSteps: Record<ServiceRequestKind, Step[]> = {
  energy: [
    {
      id: "energy-basics",
      questionBg: "За какво търсим по-добра тарифа?",
      questionDe: "Fuer welchen Tarif suchen wir ein besseres Angebot?",
      helpBg: "Ако имаш последна Jahresabrechnung, данните от нея са най-добрата база.",
      helpDe: "Wenn du die letzte Jahresabrechnung hast, sind diese Daten die beste Grundlage.",
      fields: [
        { id: "energyType", type: "choice", required: true, labelBg: "Вид тарифа", labelDe: "Tarifart", choices: [
          { value: "strom", bg: "Само ток", de: "Nur Strom" },
          { value: "gas", bg: "Само газ", de: "Nur Gas" },
          { value: "both", bg: "Ток и газ", de: "Strom und Gas" },
        ] },
        { id: "postcode", required: true, labelBg: "Пощенски код", labelDe: "Postleitzahl", placeholderBg: "60311", placeholderDe: "60311" },
        { id: "annualConsumption", type: "number", required: true, labelBg: "Годишно потребление kWh", labelDe: "Jahresverbrauch kWh", placeholderBg: "2500", placeholderDe: "2500" },
      ],
    },
    {
      id: "energy-contract",
      questionBg: "Какво плащаш в момента?",
      questionDe: "Was zahlst du aktuell?",
      helpBg: "Дори приблизителни данни помагат, но финалната оферта се проверява по документ.",
      helpDe: "Auch ungefaehre Angaben helfen, das finale Angebot wird aber anhand der Unterlagen geprueft.",
      fields: [
        { id: "currentProvider", labelBg: "Настоящ доставчик", labelDe: "Aktueller Anbieter", placeholderBg: "E.ON, Mainova...", placeholderDe: "E.ON, Mainova..." },
        { id: "monthlyPayment", type: "number", labelBg: "Месечна вноска EUR", labelDe: "Monatlicher Abschlag EUR", placeholderBg: "85", placeholderDe: "85" },
        { id: "deadlineInfo", labelBg: "Срок / Kündigungsfrist", labelDe: "Laufzeit / Kuendigungsfrist", placeholderBg: "не знам / до 31.10.", placeholderDe: "unbekannt / bis 31.10." },
      ],
    },
  ],
  kfz: [
    {
      id: "kfz-car",
      questionBg: "За кой автомобил е застраховката?",
      questionDe: "Fuer welches Fahrzeug ist die Versicherung?",
      helpBg: "HSN/TSN от талона правят сравнението много по-точно.",
      helpDe: "HSN/TSN aus dem Fahrzeugschein machen den Vergleich deutlich genauer.",
      fields: [
        { id: "carData", required: true, labelBg: "Автомобил или HSN/TSN", labelDe: "Fahrzeug oder HSN/TSN", placeholderBg: "VW Golf 2018 или 0603/...", placeholderDe: "VW Golf 2018 oder 0603/..." },
        { id: "sfClass", labelBg: "SF клас, ако го знаеш", labelDe: "SF-Klasse, falls bekannt", placeholderBg: "SF 5 / не знам", placeholderDe: "SF 5 / unbekannt" },
      ],
    },
    {
      id: "kfz-cover",
      questionBg: "Какво покритие искаш?",
      questionDe: "Welchen Schutz wuenschst du?",
      helpBg: "Ще проверим цена, самоучастие и покритие, не само най-ниската премия.",
      helpDe: "Wir pruefen Preis, Selbstbeteiligung und Deckung, nicht nur die niedrigste Praemie.",
      fields: [
        { id: "coverage", type: "choice", required: true, labelBg: "Покритие", labelDe: "Deckung", choices: [
          { value: "haftpflicht", bg: "Haftpflicht", de: "Haftpflicht" },
          { value: "teilkasko", bg: "Teilkasko", de: "Teilkasko" },
          { value: "vollkasko", bg: "Vollkasko", de: "Vollkasko" },
        ] },
        { id: "startDate", type: "date", labelBg: "Желана начална дата", labelDe: "Gewuenschter Start" },
      ],
    },
  ],
  credit: [
    {
      id: "credit-amount",
      questionBg: "Какъв кредит търсиш?",
      questionDe: "Welchen Kredit suchst du?",
      helpBg: "Не обещаваме одобрение. Подреждаме заявката така, че да е реалистична за партньора.",
      helpDe: "Wir versprechen keine Zusage. Wir bereiten die Anfrage so vor, dass sie realistisch pruefbar ist.",
      fields: [
        { id: "loanAmount", type: "number", required: true, labelBg: "Сума EUR", labelDe: "Betrag EUR", placeholderBg: "10000", placeholderDe: "10000" },
        { id: "loanTerm", labelBg: "Желан срок", labelDe: "Gewuenschte Laufzeit", placeholderBg: "36 месеца", placeholderDe: "36 Monate" },
        { id: "loanPurpose", labelBg: "Цел", labelDe: "Zweck", placeholderBg: "автомобил, ремонт, обединяване...", placeholderDe: "Auto, Renovierung, Umschuldung..." },
      ],
    },
    {
      id: "credit-profile",
      questionBg: "Как изглежда финансовата база?",
      questionDe: "Wie sieht die finanzielle Basis aus?",
      helpBg: "Тук събираме само ориентир, за да не пращаме неподходяща заявка.",
      helpDe: "Hier sammeln wir nur eine Orientierung, damit keine unpassende Anfrage rausgeht.",
      fields: [
        { id: "monthlyNetIncome", type: "number", required: true, labelBg: "Нетен месечен доход EUR", labelDe: "Monatliches Nettoeinkommen EUR", placeholderBg: "2400", placeholderDe: "2400" },
        { id: "employmentStatus", required: true, labelBg: "Трудов статус", labelDe: "Beschaeftigungsstatus", placeholderBg: "на трудов договор, самонает...", placeholderDe: "angestellt, selbststaendig..." },
        { id: "schufaStatus", type: "choice", required: true, labelBg: "SCHUFA ситуация", labelDe: "SCHUFA-Situation", choices: [
          { value: "positive", bg: "Очаквам добра SCHUFA", de: "Ich erwarte gute SCHUFA" },
          { value: "unknown", bg: "Не знам", de: "Ich weiss es nicht" },
          { value: "check_first", bg: "Първо искам проверка", de: "Erst Auskunft pruefen" },
        ] },
      ],
    },
  ],
  schufa: [
    {
      id: "schufa-purpose",
      questionBg: "За какво ти трябва SCHUFA справката?",
      questionDe: "Wofuer brauchst du die SCHUFA-Auskunft?",
      helpBg: "Различните ситуации изискват различен тип справка и различна спешност.",
      helpDe: "Verschiedene Situationen brauchen unterschiedliche Auskuenfte und Dringlichkeit.",
      fields: [
        { id: "schufaPurpose", type: "choice", required: true, labelBg: "Цел", labelDe: "Zweck", choices: [
          { value: "rent", bg: "Наем на жилище", de: "Wohnung mieten" },
          { value: "credit", bg: "Кредит", de: "Kredit" },
          { value: "general", bg: "Искам да видя данните си", de: "Daten pruefen" },
        ] },
        { id: "deadline", labelBg: "До кога ти трябва?", labelDe: "Bis wann brauchst du sie?", placeholderBg: "възможно най-бързо / дата", placeholderDe: "so schnell wie moeglich / Datum" },
        { id: "alreadyHasReport", type: "choice", labelBg: "Имаш ли вече справка?", labelDe: "Hast du schon eine Auskunft?", choices: [
          { value: "yes", bg: "Да", de: "Ja" },
          { value: "no", bg: "Не", de: "Nein" },
          { value: "unknown", bg: "Не съм сигурен", de: "Nicht sicher" },
        ] },
      ],
    },
  ],
}

const notesStep: Step = {
  id: "notes",
  questionBg: "Има ли нещо важно, което да знаем?",
  questionDe: "Gibt es etwas Wichtiges, das wir wissen sollen?",
  helpBg: "Напиши свободно. Ако имаш документ, после можеш да го добавиш от клиентския панел.",
  helpDe: "Schreib frei. Wenn du ein Dokument hast, kannst du es spaeter im Kundenbereich hinzufuegen.",
  fields: [
    { id: "notes", type: "textarea", labelBg: "Допълнение", labelDe: "Ergaenzung", placeholderBg: "Имам стара оферта, годишна сметка, талон, срок за отказ...", placeholderDe: "Ich habe ein altes Angebot, Jahresabrechnung, Fahrzeugschein, Frist..." },
  ],
}

const consentStep: Step = {
  id: "consent",
  questionBg: "Да подготвим ли заявката?",
  questionDe: "Sollen wir die Anfrage vorbereiten?",
  helpBg: "След изпращане заявката отива към n8n workflow за ръчна обработка. Целта е до 2 часа да получиш оферта или ясен отговор.",
  helpDe: "Nach dem Absenden geht die Anfrage an den n8n Workflow zur manuellen Bearbeitung. Ziel ist ein Angebot oder eine klare Antwort innerhalb von 2 Stunden.",
  fields: [
    { id: "privacyConsent", type: "choice", required: true, labelBg: "Съгласие", labelDe: "Einwilligung", choices: [
      { value: "yes", bg: "Да, обработете данните ми за тази заявка", de: "Ja, verarbeitet meine Daten fuer diese Anfrage" },
    ] },
  ],
}

function fieldLabel(field: Field, locale: "bg" | "de") {
  return locale === "bg" ? field.labelBg : field.labelDe
}

function fieldPlaceholder(field: Field, locale: "bg" | "de") {
  return locale === "bg" ? field.placeholderBg : field.placeholderDe
}

export function ServiceRequestWizard({ initialKind }: { initialKind?: ServiceRequestKind }) {
  const { locale } = useLanguage()
  const [kind, setKind] = useState<ServiceRequestKind>(initialKind ?? "energy")
  const [stepIndex, setStepIndex] = useState(initialKind ? 1 : 0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const de = locale === "de"

  const steps = useMemo<Step[]>(() => [
    {
      id: "service",
      questionBg: "За коя тарифа, застраховка или услуга искаш оферта?",
      questionDe: "Fuer welchen Tarif, welche Versicherung oder Leistung moechtest du ein Angebot?",
      helpBg: "Избери темата. След това ще ти зададем само нужните въпроси.",
      helpDe: "Waehle das Thema. Danach fragen wir nur die noetigen Angaben ab.",
      fields: [],
    },
    contactStep,
    ...serviceSteps[kind],
    notesStep,
    consentStep,
  ], [kind])

  const current = steps[stepIndex] ?? steps[0]
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  function update(id: string, value: string) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [id]: value }))
    setMessage(null)
  }

  function selectKind(nextKind: ServiceRequestKind) {
    setKind(nextKind)
    setStepIndex(1)
    setMessage(null)
  }

  function requiredMissing() {
    return current.fields.some((field) => field.required && !String(answers[field.id] ?? "").trim())
  }

  function next() {
    if (requiredMissing()) {
      setMessage(de ? "Bitte beantworte die Pflichtfrage." : "Моля, отговори на задължителния въпрос.")
      return
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (requiredMissing()) {
      setMessage(de ? "Bitte bestaetige die Verarbeitung." : "Моля, потвърди обработката.")
      return
    }
    setSubmitting(true)
    setMessage(null)
    setRequestId(null)
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          landingUrl: window.location.href,
          source: "service_request_wizard",
          customer: {
            name: answers.fullName,
            email: answers.email,
            phone: answers.phone,
          },
          answers,
          consent: answers.privacyConsent === "yes",
        }),
      })
      const payload = await response.json().catch(() => ({})) as { requestId?: string; code?: string }
      if (!response.ok) throw new Error(payload.code ?? "REQUEST_FAILED")
      setRequestId(payload.requestId ?? null)
      setMessage(de ? "Anfrage ist eingegangen. Wir melden uns mit Angebot oder klarer Rueckfrage." : "Заявката е приета. Ще получиш оферта или ясен уточняващ въпрос.")
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "REQUEST_FAILED"
      setMessage(code === "N8N_WEBHOOK_NOT_CONFIGURED"
        ? (de ? "n8n Webhook ist noch nicht konfiguriert." : "n8n webhook още не е конфигуриран.")
        : (de ? "Заявката не можа да бъде изпратена. Bitte versuche es erneut." : "Заявката не можа да бъде изпратена. Опитай отново."))
    } finally {
      setSubmitting(false)
    }
  }

  const copy = {
    eyebrow: de ? "FinanzBG Angebotsdesk" : "FinanzBG заявка за оферта",
    title: de ? "Beschreibe kurz, wir bereiten das bessere Angebot vor." : "Опиши накратко, ние подготвяме по-добрата оферта.",
    intro: de
      ? "Kein schwerer AI-Prozess. Deine Antworten gehen strukturiert an den n8n Workflow, danach erfolgt die manuelle Bearbeitung."
      : "Без тежка AI обработка. Отговорите ти отиват структурирано към n8n workflow, след това офертата се обработва ръчно.",
    promise: de ? serviceRequestMeta[kind].promiseDe : serviceRequestMeta[kind].promiseBg,
    back: de ? "Zurueck" : "Назад",
    next: de ? "Weiter" : "Напред",
    send: de ? "Anfrage senden" : "Изпрати заявка",
    selected: de ? "Ausgewaehlt" : "Избрано",
    request: de ? "Anfrage" : "Заявка",
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <Link href="/produkte" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />{de ? "Alle Angebote" : "Всички предложения"}
            </Link>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{copy.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{copy.intro}</p>
          </div>
          <aside className="rounded-lg border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary"><Clock3 className="size-5" /></span>
              <div>
                <p className="text-sm font-semibold text-foreground">2h Service-SLA</p>
                <p className="text-sm text-muted-foreground">{copy.promise}</p>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-md border border-border bg-secondary/50 p-4 text-sm leading-6 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              {de ? "Keine automatische Entscheidung, kein erfundener Preis. Ein Mensch prueft die Anfrage und bereitet die naechste Aktion vor." : "Без автоматично решение и без измислена цена. Човек проверява заявката и подготвя следващото действие."}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="rounded-lg bg-secondary/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.request} {stepIndex + 1} / {steps.length}</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">{de ? current.questionDe : current.questionBg}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{de ? current.helpDe : current.helpBg}</p>
          </div>

          {current.id === "service" ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {serviceRequestKinds.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectKind(item)}
                  className={`rounded-lg border p-4 text-left transition-colors ${item === kind ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
                >
                  <span className="text-sm font-semibold text-foreground">{de ? serviceRequestMeta[item].labelDe : serviceRequestMeta[item].labelBg}</span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">{de ? serviceRequestMeta[item].promiseDe : serviceRequestMeta[item].promiseBg}</span>
                  {item === kind && <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="size-3.5" />{copy.selected}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {current.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label htmlFor={field.type === "choice" ? undefined : field.id} className="text-sm font-medium text-foreground">
                    {fieldLabel(field, locale)}{field.required ? " *" : ""}
                  </label>
                  {field.type === "choice" ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {field.choices?.map((choice) => (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => update(field.id, choice.value)}
                          className={`rounded-md border px-3 py-3 text-left text-sm transition-colors ${answers[field.id] === choice.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/50"}`}
                        >
                          {de ? choice.de : choice.bg}
                        </button>
                      ))}
                    </div>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      value={answers[field.id] ?? ""}
                      onChange={(event) => update(field.id, event.target.value)}
                      placeholder={fieldPlaceholder(field, locale)}
                      className="min-h-28"
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type ?? "text"}
                      value={answers[field.id] ?? ""}
                      onChange={(event) => update(field.id, event.target.value)}
                      placeholder={fieldPlaceholder(field, locale)}
                      className="h-11"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {requestId && <p className="mt-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{de ? "Referenz" : "Референция"}: {requestId}</p>}
          {message && <p className="mt-5 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground" role="status">{message}</p>}

          <div className="mt-7 flex flex-wrap justify-between gap-3">
            <Button type="button" variant="outline" disabled={stepIndex === 0 || submitting} onClick={() => setStepIndex((value) => Math.max(value - 1, 0))}>
              <ArrowLeft className="size-4" />{copy.back}
            </Button>
            {stepIndex === steps.length - 1 ? (
              <Button type="submit" disabled={submitting || Boolean(requestId)}>
                {submitting ? (de ? "Sendet..." : "Изпращане...") : copy.send}<Send className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={next} disabled={submitting}>
                {copy.next}<ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
