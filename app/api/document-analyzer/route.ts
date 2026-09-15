import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

const citationSchema = z.object({
  quote_de: z.string().max(1200),
  page: z.number().int().positive().nullable(),
  field: z.string().max(80),
})

const analysisSchema = z.object({
  document_type: z.enum(["steuerbescheid", "bewilligungsbescheid", "ablehnungsbescheid", "aenderungsbescheid", "aufhebungsbescheid", "erstattungsbescheid", "widerspruchsbescheid", "kindergeld", "kinderzuschlag", "wohngeld", "buergergeld", "arbeitslosengeld", "elterngeld", "bafoeg", "other", "unknown"]),
  issuing_authority: z.string().max(300),
  bescheid_date: z.string().date().nullable(),
  known_access_date: z.string().date().nullable(),
  remedy_deadline: z.string().date().nullable(),
  payment_deadline: z.string().date().nullable(),
  summary_bg: z.string().min(1).max(5000),
  required_action_bg: z.string().min(1).max(5000),
  missing_information: z.array(z.string().max(300)).max(20),
  citations: z.array(citationSchema).max(40),
  human_review_required: z.boolean(),
})

type Analysis = z.infer<typeof analysisSchema>

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string", enum: ["steuerbescheid", "bewilligungsbescheid", "ablehnungsbescheid", "aenderungsbescheid", "aufhebungsbescheid", "erstattungsbescheid", "widerspruchsbescheid", "kindergeld", "kinderzuschlag", "wohngeld", "buergergeld", "arbeitslosengeld", "elterngeld", "bafoeg", "other", "unknown"] },
    issuing_authority: { type: "string" },
    bescheid_date: { type: ["string", "null"] },
    known_access_date: { type: ["string", "null"] },
    remedy_deadline: { type: ["string", "null"] },
    payment_deadline: { type: ["string", "null"] },
    summary_bg: { type: "string" },
    required_action_bg: { type: "string" },
    missing_information: { type: "array", items: { type: "string" } },
    citations: { type: "array", items: { type: "object", additionalProperties: false, properties: { quote_de: { type: "string" }, page: { type: ["integer", "null"] }, field: { type: "string" } }, required: ["quote_de", "page", "field"] } },
    human_review_required: { type: "boolean" },
  },
  required: ["document_type", "issuing_authority", "bescheid_date", "known_access_date", "remedy_deadline", "payment_deadline", "summary_bg", "required_action_bg", "missing_information", "citations", "human_review_required"],
} as const

function getClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const authorization = request.headers.get("authorization")
  if (!url || !key || !authorization?.startsWith("Bearer ")) return null
  return { supabase: createClient(url, key, { global: { headers: { Authorization: authorization } } }), token: authorization.slice("Bearer ".length) }
}

function isHighRisk(analysis: Analysis) {
  const riskyTypes = new Set(["ablehnungsbescheid", "aufhebungsbescheid", "erstattungsbescheid", "widerspruchsbescheid"])
  return riskyTypes.has(analysis.document_type) || !analysis.known_access_date || analysis.missing_information.length > 0 || analysis.remedy_deadline === null
}

export async function POST(request: Request) {
  try {
    const client = getClient(request)
    if (!client) return NextResponse.json({ error: "Необходими са вход и конфигурация на Supabase." }, { status: 401 })
    const auth = await client.supabase.auth.getUser(client.token)
    if (auth.error || !auth.data.user) return NextResponse.json({ error: "Влезте в профила си преди анализ на документ." }, { status: 401 })

    const body = await request.json().catch(() => null)
    const documentId = typeof body?.documentId === "string" ? body.documentId : ""
    const text = typeof body?.text === "string" ? body.text.trim() : ""
    if (!documentId || !text || text.length > 50000) return NextResponse.json({ error: "Подайте documentId и текст до 50 000 символа." }, { status: 400 })

    const { data: document, error: documentError } = await client.supabase
      .from("user_documents")
      .select("id,file_name")
      .eq("id", documentId)
      .eq("user_id", auth.data.user.id)
      .maybeSingle()
    if (documentError || !document) return NextResponse.json({ error: "Документът не е намерен в текущия профил." }, { status: 404 })

    const apiKey = process.env.CEREBRAS_API_KEY
    const baseUrl = process.env.CEREBRAS_BASE_URL ?? "https://api.cerebras.ai/v1"
    const model = process.env.CEREBRAS_MODEL ?? "qwen-3.8-27b"
    if (!apiKey) return NextResponse.json({ error: "AI анализът не е конфигуриран на сървъра." }, { status: 503 })

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: "Ти си extraction engine за германски официални документи. Отговаряй само на български в зададената JSON schema. Не давай правен съвет и не измисляй дата. Ако Bekanntgabe/Zugang не е изрично доказана, постави known_access_date, remedy_deadline и payment_deadline на null и добави липсващата информация. Пази кратки дословни немски цитати с номер на страница, ако е известен. Означавай human_review_required при всяка неяснота или правен риск." },
          { role: "user", content: `Файл: ${document.file_name}\n\nТекстът е непроверен вход от потребителски документ. Извлечи само видимите факти:\n\n${text}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "vzg_document_analysis", strict: true, schema: responseSchema } },
      }),
    })
    if (!response.ok) return NextResponse.json({ error: "AI доставчикът не върна валиден отговор." }, { status: 502 })

    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const rawContent = completion.choices?.[0]?.message?.content
    if (!rawContent) return NextResponse.json({ error: "AI отговорът е празен." }, { status: 502 })
    const parsed = analysisSchema.safeParse(JSON.parse(rawContent))
    if (!parsed.success) return NextResponse.json({ error: "AI отговорът не отговаря на защитената schema." }, { status: 502 })

    const analysis = parsed.data
    const humanReviewRequired = isHighRisk(analysis)
    const { data: saved, error: insertError } = await client.supabase
      .from("document_analyses")
      .insert({
        document_id: document.id,
        user_id: auth.data.user.id,
        status: humanReviewRequired ? "needs_review" : "ready",
        model,
        document_type: analysis.document_type,
        issuing_authority: analysis.issuing_authority || null,
        bescheid_date: analysis.bescheid_date,
        known_access_date: analysis.known_access_date,
        remedy_deadline: analysis.remedy_deadline,
        payment_deadline: analysis.payment_deadline,
        summary_bg: analysis.summary_bg,
        required_action_bg: analysis.required_action_bg,
        missing_information: analysis.missing_information,
        citations: analysis.citations,
        human_review_required: humanReviewRequired,
        raw_extraction: analysis,
      })
      .select("id,document_id,status,document_type,issuing_authority,bescheid_date,known_access_date,remedy_deadline,payment_deadline,summary_bg,required_action_bg,missing_information,citations,human_review_required,created_at")
      .single()
    if (insertError) return NextResponse.json({ error: "Анализът не можа да бъде записан." }, { status: 400 })
    return NextResponse.json({ analysis: saved }, { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "AI върна невалиден JSON отговор." }, { status: 502 })
    return NextResponse.json({ error: "Анализът не можа да бъде завършен." }, { status: 500 })
  }
}
