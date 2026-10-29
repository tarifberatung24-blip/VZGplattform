/**
 * Web-search client for the HORIZON AI search.
 *
 * The search answers a free question from *external* sources, not only from the
 * data the user already has in the platform. That is a deliberate product
 * decision: a person asks "was ist die Frist für einen Widerspruch?" and expects
 * the answer the authority publishes, not an empty state because nothing is
 * stored locally.
 *
 * The provider is OpenRouter with its `web` plugin: the model runs the search
 * itself and returns the pages it actually read as `url_citation` annotations.
 * Those annotations are the only sources the UI shows, so every citation is a
 * page the model read rather than a URL the model typed from memory.
 *
 * The module stays free of `server-only` on purpose: the request builder and the
 * response parser are pure and are exercised directly by tests.
 */

import type { Locale } from "@/lib/i18n/dictionaries"

export const OPENROUTER_CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

/** Provenance literal, bumped whenever the prompt changes. */
export const AI_SEARCH_PROMPT_VERSION = "horizon-ai-search-v1"

export type WebSearchRole = "system" | "user" | "assistant"

export type WebSearchMessage = { role: WebSearchRole; content: string }

export type WebSearchSource = {
  title: string
  url: string
  /** The passage the model saw, when the provider returns one. */
  snippet: string | null
}

export type WebSearchAnswer = {
  answer: string
  sources: WebSearchSource[]
  model: string
}

/** Stable codes the route maps to a status; raw provider text never reaches the UI. */
export type WebSearchErrorCode =
  | "AI_SEARCH_NOT_CONFIGURED"
  | "AI_SEARCH_PROVIDER_ERROR"
  | "AI_SEARCH_INVALID_RESPONSE"

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

/**
 * The model that runs the search. `OPENROUTER_MODEL` wins when set, so the
 * deployment can move models without a code change; the default is a model that
 * supports the `web` plugin out of the box.
 */
export function webSearchModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
}

/**
 * Builds the chat-completions body. `plugins: [{ id: "web" }]` is what turns the
 * call into a web search; the model decides the queries and returns citations.
 */
export function buildWebSearchRequest(input: {
  messages: readonly WebSearchMessage[]
  maxResults?: number
  maxTokens?: number
}) {
  return {
    model: webSearchModel(),
    messages: input.messages,
    plugins: [{ id: "web", max_results: input.maxResults ?? 5 }],
    temperature: 0.2,
    max_tokens: input.maxTokens ?? 900,
  }
}

type OpenRouterAnnotation = {
  type?: string
  url_citation?: { url?: string; title?: string; content?: string }
}

type OpenRouterPayload = {
  choices?: { message?: { content?: unknown; annotations?: OpenRouterAnnotation[] } }[]
}

/**
 * Reads the answer and its citations out of a provider payload.
 *
 * Citations are de-duplicated by URL and capped, so a model that repeats the same
 * page does not fill the source list with duplicates. A citation without a URL is
 * dropped: an unsourced claim cannot be shown as a source.
 */
export function parseWebSearchResponse(payload: unknown): { answer: string; sources: WebSearchSource[] } {
  const data = (payload ?? {}) as OpenRouterPayload
  const message = data.choices?.[0]?.message
  const answer = typeof message?.content === "string" ? message.content.trim() : ""
  const seen = new Set<string>()
  const sources: WebSearchSource[] = []
  for (const annotation of message?.annotations ?? []) {
    if (annotation?.type !== "url_citation") continue
    const citation = annotation.url_citation
    const url = citation?.url?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    sources.push({
      title: citation?.title?.trim() || url,
      url,
      snippet: citation?.content?.trim() || null,
    })
    if (sources.length >= 6) break
  }
  return { answer, sources }
}

async function postChatCompletion(body: unknown, signal?: AbortSignal): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("AI_SEARCH_NOT_CONFIGURED" satisfies WebSearchErrorCode)
  const response = await fetch(OPENROUTER_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vzgplattform.onrender.com",
      "X-Title": "HORIZON by VZG",
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error("AI_SEARCH_PROVIDER_ERROR" satisfies WebSearchErrorCode)
  return response.json().catch(() => {
    throw new Error("AI_SEARCH_INVALID_RESPONSE" satisfies WebSearchErrorCode)
  })
}

/** Runs one web-grounded answer. */
export async function requestWebSearch(input: {
  messages: readonly WebSearchMessage[]
  maxResults?: number
  signal?: AbortSignal
}): Promise<WebSearchAnswer> {
  const body = buildWebSearchRequest(input)
  const payload = await postChatCompletion(body, input.signal)
  const parsed = parseWebSearchResponse(payload)
  if (!parsed.answer && parsed.sources.length === 0) {
    throw new Error("AI_SEARCH_INVALID_RESPONSE" satisfies WebSearchErrorCode)
  }
  return { ...parsed, model: body.model }
}

/**
 * A small, web-free call used to route a question to platform destinations.
 * Keeping it separate means the routing decision never costs a web search and
 * the answer call stays the only one that reaches the open web.
 */
export async function requestChatText(input: {
  messages: readonly WebSearchMessage[]
  maxTokens?: number
  signal?: AbortSignal
}): Promise<string> {
  const payload = await postChatCompletion(
    {
      model: webSearchModel(),
      messages: input.messages,
      temperature: 0,
      max_tokens: input.maxTokens ?? 200,
    },
    input.signal,
  )
  const data = (payload ?? {}) as OpenRouterPayload
  const content = data.choices?.[0]?.message?.content
  return typeof content === "string" ? content : ""
}

/** The locale name used inside the prompt, so the model answers in that language. */
export function localeDisplayName(locale: Locale): string {
  return locale === "de" ? "Deutsch" : "Bulgarisch (български)"
}
