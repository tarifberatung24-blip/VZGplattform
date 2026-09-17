import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const CEREBRAS_ENDPOINT = "https://api.cerebras.ai/v1/chat/completions"

// Models currently served on Cerebras public endpoints (gpt-oss-120b, qwen-3.8-27b).
const modelName = process.env.CEREBRAS_MODEL ?? "qwen-3.8-27b"

/**
 * Calls the OpenAI-compatible Cerebras endpoint directly instead of importing a provider
 * SDK. The previous implementation required "@ai-sdk/openai", which was never declared as
 * a dependency, so the require always threw and the route reported the provider as
 * unconfigured even when CEREBRAS_API_KEY was present.
 */
async function generateCerebrasText(system: string, prompt: string): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY
  if (!apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED")
  const response = await fetch(CEREBRAS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error(`CEREBRAS_HTTP_${response.status}`)
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error("CEREBRAS_EMPTY_RESPONSE")
  return content
}

const requestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Please describe what you need the letter to say."),
  recipient: z.enum([
    "Finanzamt",
    "Jobcenter",
    "Familienkasse",
    "Health Insurance",
    "Other",
  ]),
  userLanguage: z.enum(["bg", "de"]).optional(),
})

function missingProviderError() {
  return NextResponse.json(
    {
      error:
        "Letter generation is not configured yet. The Cerebras AI provider is not available in this deployment.",
    },
    { status: 503 },
  )
}

export async function POST(request: Request) {
  if (!process.env.CEREBRAS_API_KEY) {
    return missingProviderError()
  }

  let parsed: z.infer<typeof requestSchema>
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    parsed = requestSchema.parse(body)
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please provide a description and recipient." },
      { status: 400 },
    )
  }

  const { description, recipient, userLanguage } = parsed
  const locale = userLanguage ?? "bg"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.display_name && profile.display_name.trim().length > 0) {
      userName = profile.display_name.trim()
    }
  }

  const systemPrompt =
    "You are an expert in German administrative law and formal correspondence. Your task is to transform a user's request in Bulgarian into a highly professional, formal German letter (Behördenschreiben).\n" +
    "Use strict formal German (Sie-Form).\n" +
    "Include placeholders for [Name], [Your Address], [Date], [Customer Number].\n" +
    "Provide two outputs only:\n" +
    "1) The professional German letter.\n" +
    "2) A literal Bulgarian translation of the letter so the user understands the content.\n" +
    "Ensure the tone is polite but firm and administratively correct.\n" +
    "Return the result in JSON with exactly these fields: german, bulgarian.\n" +
    "Do not add explanations outside the JSON.\n" +
    "Do not invent personal data. Use the provided placeholders for anything missing.\n"

  const userPrompt =
    `Recipient: ${recipient}\n\n` +
    `User request in Bulgarian:\n${description}\n\n` +
    `Use ${locale === "bg" ? "Bulgarian" : "German"} for the translation part.`

  let result: string
  try {
    result = await generateCerebrasText(systemPrompt, userPrompt)
  } catch (error) {
    console.error("[generate-letter] AI failed", error)
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? (error as any).message
        : ""
    if (typeof message === "string" && /api key|unauthorized/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Letter generation is not configured yet. Please try again later.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: "Letter generation failed. Please try again." },
      { status: 500 },
    )
  }

  const raw = result.trim()

  let json:
    | { german?: string; bulgarian?: string }
    | { germanLetter?: string; bulgarianTranslation?: string }
  try {
    json = JSON.parse(raw)
  } catch {
    json = { germanLetter: raw, bulgarianTranslation: "" }
  }

  const german =
    ("german" in json ? json.german : undefined) ??
    ("germanLetter" in json ? json.germanLetter : undefined) ??
    raw.slice(0, 8000)
  const bulgarian =
    ("bulgarian" in json ? json.bulgarian : undefined) ??
    ("bulgarianTranslation" in json ? json.bulgarianTranslation : undefined) ??
    ""

  if (!german || german.trim().length === 0) {
    return NextResponse.json(
      { error: "Letter generation returned no content." },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      german,
      bulgarian,
      placeholders: {
        name:userName ?? "[Name]",
        address: "[Your Address]",
        date: "[Date]",
        customerNumber: "[Customer Number]",
      },
    },
    { status: 200 },
  )
}
