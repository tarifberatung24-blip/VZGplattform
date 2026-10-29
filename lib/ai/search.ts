/**
 * HORIZON AI search: one free-text question, two answers.
 *
 * A question like "Mahnung vom Jobcenter bekommen, was tun?" is answered best in
 * two parts: which platform service fits (so the user can act inside HORIZON),
 * and what the authorities actually say (so the answer is correct even when the
 * user has stored nothing). The first part is a routing decision over the service
 * catalog; the second is a web-grounded answer with citations.
 *
 * The routing step is a small, web-free model call that must return one catalog
 * id or the literal `none`. The id is validated against the catalog, so a model
 * that invents a destination cannot produce a link to a page that does not exist.
 */

import type { Locale } from "@/lib/i18n/dictionaries"
import { serviceCatalog, type ServiceCatalogEntry } from "@/lib/navigation/service-catalog"
import {
  AI_SEARCH_PROMPT_VERSION,
  localeDisplayName,
  requestChatText,
  requestWebSearch,
  type WebSearchMessage,
  type WebSearchSource,
} from "./web-search"

export type PlatformMatch = { id: string; href: string; title: string; detail: string }

export type AiSearchResult = {
  answer: string
  sources: WebSearchSource[]
  platform: PlatformMatch | null
  model: string
  promptVersion: string
}

export function findCatalogEntry(id: string): ServiceCatalogEntry | undefined {
  return serviceCatalog.find((entry) => entry.id === id)
}

/**
 * The routing prompt lists the catalog as `id — title`. The model is told to
 * answer with an id or `none` and nothing else, so the reply is a single token
 * that `parsePlatformRoute` can validate.
 */
export function buildPlatformRoutingPrompt(question: string, locale: Locale): string {
  const list = serviceCatalog.map((entry) => `${entry.id} — ${entry.title[locale]}`).join("\n")
  return [
    "Du leitest eine Frage an den passenden HORIZON-Dienst weiter.",
    "Antworte mit genau einer id aus der Liste oder mit dem Wort none.",
    "Gib keinen Text, keine Erklärung und keine Anführungszeichen zurück.",
    "Wähle none, wenn kein Dienst klar passt.",
    "",
    "Dienste:",
    list,
    "",
    `Frage: ${question}`,
  ].join("\n")
}

/**
 * Extracts the first token of the model's reply and keeps it only when it names a
 * real catalog id. Anything else — including the literal `none`, a sentence, or a
 * made-up destination — resolves to null.
 */
export function parsePlatformRouteId(raw: string): string | null {
  const token = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, " ").trim().split(/\s+/)[0] ?? ""
  return findCatalogEntry(token) ? token : null
}

/** Resolves a route token to a fully localized match. */
export function resolvePlatformMatch(raw: string, locale: Locale): PlatformMatch | null {
  const id = parsePlatformRouteId(raw)
  const entry = id ? findCatalogEntry(id) : undefined
  if (!entry) return null
  return { id: entry.id, href: entry.href, title: entry.title[locale], detail: entry.detail[locale] }
}

export function buildAnswerMessages(input: {
  question: string
  locale: Locale
  history: readonly WebSearchMessage[]
  platformTitle: string | null
}): WebSearchMessage[] {
  const system = [
    "Du bist die HORIZON-Suche von VZG. Du hilfst Menschen in Deutschland mit Behörden, Geld und Alltag.",
    `Antworte in ${localeDisplayName(input.locale)}.`,
    "Suche im Web und stütze dich auf offizielle oder verlässliche Quellen (Behörden, Gesetze, Verbraucherzentralen).",
    "Nenne nur Angaben, die eine der von dir gelesenen Quellen belegt. Erfinde keine Fristen, Beträge, Träger oder Formularwerte.",
    "Wenn die Quellen sich widersprechen, sage das. Wenn etwas unsicher ist, sage es.",
    "Gib keine Rechts-, Steuer- oder Versicherungsberatung. Du erklärst, du entscheidest nicht.",
    input.platformTitle ? `HORIZON hat dazu den Dienst "${input.platformTitle}" — weise am Ende kurz darauf hin.` : "",
    "Antworte knapp: höchstens fünf kurze Absätze.",
  ]
    .filter(Boolean)
    .join("\n")

  return [
    { role: "system", content: system },
    ...input.history.slice(-6),
    { role: "user", content: input.question },
  ]
}

/**
 * Runs the two-step search. Routing failure never fails the whole call: a user
 * still gets the web-grounded answer even when no platform service fits.
 */
export async function runAiSearch(input: {
  question: string
  locale: Locale
  history?: readonly WebSearchMessage[]
  signal?: AbortSignal
}): Promise<AiSearchResult> {
  const history = input.history ?? []

  let platform: PlatformMatch | null = null
  try {
    const raw = await requestChatText({
      messages: [
        { role: "system", content: "Antworte mit genau einer id oder none." },
        { role: "user", content: buildPlatformRoutingPrompt(input.question, input.locale) },
      ],
      maxTokens: 20,
      signal: input.signal,
    })
    platform = resolvePlatformMatch(raw, input.locale)
  } catch {
    platform = null
  }

  const result = await requestWebSearch({
    messages: buildAnswerMessages({
      question: input.question,
      locale: input.locale,
      history,
      platformTitle: platform?.title ?? null,
    }),
    signal: input.signal,
  })

  return {
    answer: result.answer,
    sources: result.sources,
    platform,
    model: result.model,
    promptVersion: AI_SEARCH_PROMPT_VERSION,
  }
}
