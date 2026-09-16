import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"

const cerebrasModel =
  (() => {
    try {
      const { createOpenAI } = require("@ai-sdk/openai")
      return createOpenAI({
        apiKey: process.env.CEREBRAS_API_KEY ?? "",
        baseURL: "https://api.cerebras.ai/v1",
      })
    } catch {
      return null
    }
  })()

const modelName = process.env.CEREBRAS_MODEL ?? "llama3.1-70b"

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
  if (!cerebrasModel) {
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

  let result
  try {
    result = await generateText({
      model: cerebrasModel(modelName),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    })
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

  const raw = result.text.trim()

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
