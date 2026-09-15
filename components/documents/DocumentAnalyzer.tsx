"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, FileSearch, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Analysis = {
  id: string
  document_id: string
  status: "ready" | "needs_review" | "error" | string
  document_type: string
  issuing_authority: string | null
  bescheid_date: string | null
  known_access_date: string | null
  remedy_deadline: string | null
  payment_deadline: string | null
  summary_bg: string
  required_action_bg: string
  missing_information: string[]
  citations: Array<{ quote_de: string; page: number | null; field: string }>
  human_review_required: boolean
  created_at: string
}

const typeLabels: Record<string, string> = {
  steuerbescheid: "Данъчен документ",
  bewilligungsbescheid: "Одобрение",
  ablehnungsbescheid: "Отказ",
  aenderungsbescheid: "Промяна",
  erstattungsbescheid: "Възстановяване",
  widerspruchsbescheid: "Решение по възражение",
  kindergeld: "Kindergeld",
  kinderzuschlag: "Kinderzuschlag",
  wohngeld: "Wohngeld",
  buergergeld: "Bürgergeld",
  unknown: "Неуточнен документ",
}

function formatDate(value: string | null) {
  if (!value) return "Не е посочена"
  return new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
}

export function DocumentAnalyzer() {
  const [fileName, setFileName] = useState("")
  const [text, setText] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const characterCount = text.length
  const canAnalyze = fileName.trim().length > 0 && text.trim().length >= 20 && text.length <= 50000
  const statusText = useMemo(() => {
    if (loading) return "AI анализът се изпълнява..."
    if (analysis?.status === "needs_review") return "Нужна е човешка проверка"
    if (analysis) return "Анализът е готов"
    return "Очаква документ"
  }, [analysis, loading])

  useEffect(() => {
    let active = true
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.user))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!documentId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`document-analysis-${documentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "document_analyses", filter: `document_id=eq.${documentId}` }, (payload) => {
        setAnalysis(payload.new as Analysis)
        setLastUpdated(new Date())
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [documentId])

  async function selectFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setFileName(file.name)
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      setText(await file.text())
      return
    }
    setError("В тази версия поставете копирания текст от PDF/сканиран документ в полето. За сканирани файлове е нужен OCR pipeline.")
  }

  async function analyze() {
    if (!canAnalyze) return
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error("Влезте в профила си, за да анализирате документ.")
      const { data: document, error: documentError } = await supabase
        .from("user_documents")
        .insert({ user_id: auth.user.id, file_name: fileName.trim(), status: "processing" })
        .select("id")
        .single()
      if (documentError || !document) throw new Error(documentError?.message ?? "Документът не можа да бъде създаден.")
      setDocumentId(document.id)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error("Сесията изтече. Влезте отново в профила си.")
      const response = await fetch("/api/document-analyzer", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId: document.id, text: text.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Анализът не можа да бъде завършен.")
      setAnalysis(payload.analysis as Analysis)
      setLastUpdated(new Date())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Анализът не можа да бъде завършен.")
    } finally {
      setLoading(false)
    }
  }

  return <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><Sparkles className="size-4" /> AI Document Analyzer</p><h2 className="mt-3 text-2xl font-semibold text-white">Разберете официалното писмо на български</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">Поставете извлечения немски текст, за да получим структуриран превод на смисъла, сроковете и следващото действие. Не се генерира правно решение.</p></div><span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400">{statusText}</span></div>
    {!isAuthenticated && <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">Влезте в профила си, за да запазите документа и анализа в личния Workspace. <Link className="font-semibold text-cyan-300 underline" href="/auth/login?next=/workspace">Вход</Link></div>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="space-y-5"><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Документ</span><input type="file" accept=".txt,.md,text/plain" onChange={(event) => void selectFile(event.target.files?.[0])} className="block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950" /></label><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Име на документа</span><input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="Напр. Steuerbescheid-2025.txt" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/70" /></label><label className="block space-y-2"><span className="flex items-center justify-between text-sm font-medium text-slate-200"><span>Немски текст</span><span className="text-xs text-slate-500">{characterCount.toLocaleString("bg-BG")}/50 000</span></span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={13} maxLength={50000} placeholder="Поставете текста от писмото тук..." className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-200 outline-none focus:border-cyan-400/70" /></label>{error && <p role="alert" className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm leading-6 text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}<button type="button" onClick={() => void analyze()} disabled={!canAnalyze || loading || !isAuthenticated} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}Анализирай документа</button><p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="size-4 shrink-0 text-cyan-300" /> Съхраняваме само metadata и validated analysis; binary файлът не се качва от този компонент.</p></div><div className="min-h-[300px] rounded-2xl border border-white/10 bg-slate-950/50 p-5">{analysis ? <div className="space-y-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" /><div><p className="font-semibold text-white">{typeLabels[analysis.document_type] ?? "Официален документ"}</p><p className="mt-1 text-xs text-slate-500">{analysis.issuing_authority || "Институцията не е уточнена"} · {lastUpdated?.toLocaleTimeString("bg-BG")}</p></div></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Какво означава</p><p className="mt-2 text-sm leading-7 text-slate-300">{analysis.summary_bg}</p></div><div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Следващо действие</p><p className="mt-2 text-sm leading-7 text-slate-200">{analysis.required_action_bg}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><DateCard label="Дата на документа" value={formatDate(analysis.bescheid_date)} /><DateCard label="Срок за възражение" value={formatDate(analysis.remedy_deadline)} /><DateCard label="Дата на получаване" value={formatDate(analysis.known_access_date)} /><DateCard label="Срок за плащане" value={formatDate(analysis.payment_deadline)} /></div>{analysis.missing_information.length > 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Липсваща информация</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-100/80">{analysis.missing_information.map((item) => <li key={item}>{item}</li>)}</ul></div>}<div className="flex flex-wrap gap-2"><Link href="/anspruch" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/50">Провери помощи</Link><Link href="/steuer" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/50">Към данъчна оценка</Link></div><p className="text-xs leading-5 text-slate-500">{analysis.human_review_required ? "Нужна е човешка проверка преди действие." : "Въпреки автоматичната проверка, проверете оригиналния документ."} Резултатът не е правен съвет.</p></div> : <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center"><FileSearch className="size-10 text-slate-700" /><p className="mt-4 font-medium text-slate-300">Резултатът ще се появи тук</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">След анализа ще видите резюме, срокове, липсващи данни и следващи действия.</p>{documentId && <p className="mt-4 flex items-center gap-2 text-xs text-cyan-300"><RefreshCw className="size-3 animate-spin" /> Слушаме за realtime промени</p>}</div>}</div></div>
  </section>
}

function DateCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{value}</p></div>
}
