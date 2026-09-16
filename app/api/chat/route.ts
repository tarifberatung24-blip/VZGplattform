import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export const runtime = "nodejs"
export const maxDuration = 30

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1800),
}).strict()

const requestSchema = z.object({ messages: z.array(messageSchema).min(1).max(12) }).strict()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  if (!process.env.GROQ_API_KEY) return Response.json({ code: "AI_PROVIDER_NOT_CONFIGURED" }, { status: 503 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ code: "INVALID_CHAT_REQUEST" }, { status: 400 })

  const householdId = await ensureHousehold(supabase)
  const [{ data: contracts }, { data: documents }] = await Promise.all([
    supabase.from("contracts").select("title,category,provider_name,monthly_amount,status,end_date").eq("household_id", householdId).order("created_at", { ascending: false }).limit(30),
    supabase.from("documents").select("original_filename,processing_status,created_at").eq("household_id", householdId).order("created_at", { ascending: false }).limit(12),
  ])

  const context = JSON.stringify({ contracts: contracts ?? [], documents: documents ?? [] })
  const result = streamText({
    model: groq("openai/gpt-oss-20b"),
    system: `Ти си KintexBG AI Home Office Assistant. Отговаряй кратко и ясно на български, когато потребителят пише на български, иначе на езика на въпроса. Използвай само данните в CONTEXT. Ако данните липсват, кажи "Няма въведени данни". Не измисляй цени, доставчици, спестявания или срокове. Не давай правни, данъчни или застрахователни заключения. Предлагай следваща стъпка, но не предприемай действие без потвърждение. CONTEXT: ${context}`,
    messages: parsed.data.messages,
    maxOutputTokens: 500,
    temperature: 0.2,
    abortSignal: request.signal,
  })

  return result.toTextStreamResponse()
}
