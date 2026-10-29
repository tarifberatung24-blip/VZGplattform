import { describe, expect, it } from "vitest"
import {
  buildWebSearchRequest,
  parseWebSearchResponse,
  isWebSearchConfigured,
  webSearchModel,
  AI_SEARCH_PROMPT_VERSION,
  type WebSearchMessage,
} from "./web-search"
import { buildPlatformRoutingPrompt, parsePlatformRouteId, resolvePlatformMatch } from "./search"

/**
 * The web-search client is the only place that talks to the model provider, so
 * these tests hold the two properties the feature's correctness depends on: the
 * request actually turns the web plugin on, and the citations shown to the user
 * come from the provider rather than from the model's memory.
 */
describe("web search request", () => {
  const messages: WebSearchMessage[] = [{ role: "user", content: "Wie lang ist die Widerspruchsfrist?" }]

  it("enables the web plugin and honours the result cap", () => {
    const body = buildWebSearchRequest({ messages, maxResults: 4 })
    expect(body.plugins).toEqual([{ id: "web", max_results: 4 }])
    expect(body.messages).toBe(messages)
    expect(body.model.length).toBeGreaterThan(0)
  })

  it("defaults the result cap and the token budget", () => {
    const body = buildWebSearchRequest({ messages })
    expect(body.plugins[0]).toMatchObject({ id: "web", max_results: 5 })
    expect(body.max_tokens).toBe(900)
  })

  it("reads the model from the environment when set", () => {
    const previous = process.env.OPENROUTER_MODEL
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet"
    expect(webSearchModel()).toBe("anthropic/claude-3.5-sonnet")
    if (previous === undefined) delete process.env.OPENROUTER_MODEL
    else process.env.OPENROUTER_MODEL = previous
    expect(AI_SEARCH_PROMPT_VERSION.length).toBeGreaterThan(0)
  })
})

describe("web search response", () => {
  it("reads the answer and de-duplicates citations by url", () => {
    const parsed = parseWebSearchResponse({
      choices: [
        {
          message: {
            content: "  Die Frist beträgt einen Monat.  ",
            annotations: [
              { type: "url_citation", url_citation: { url: "https://a.de", title: "A" } },
              { type: "url_citation", url_citation: { url: "https://a.de", title: "A again" } },
              { type: "url_citation", url_citation: { url: "https://b.de", title: "B", content: "snippet" } },
              { type: "not_a_citation", url_citation: { url: "https://c.de" } },
              { type: "url_citation", url_citation: { title: "no url" } },
            ],
          },
        },
      ],
    })
    expect(parsed.answer).toBe("Die Frist beträgt einen Monat.")
    expect(parsed.sources.map((source) => source.url)).toEqual(["https://a.de", "https://b.de"])
    expect(parsed.sources[1].snippet).toBe("snippet")
    expect(parsed.sources[0].snippet).toBeNull()
  })

  it("falls back to the url as a title and tolerates an empty payload", () => {
    const parsed = parseWebSearchResponse({
      choices: [{ message: { content: "x", annotations: [{ type: "url_citation", url_citation: { url: "https://d.de" } }] } }],
    })
    expect(parsed.sources[0].title).toBe("https://d.de")
    expect(parseWebSearchResponse(null)).toEqual({ answer: "", sources: [] })
  })

  it("reports configuration from the environment only", () => {
    const previous = process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
    expect(isWebSearchConfigured()).toBe(false)
    process.env.OPENROUTER_API_KEY = "test-key"
    expect(isWebSearchConfigured()).toBe(true)
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previous
  })
})

describe("platform routing", () => {
  it("lists the catalog in the routing prompt", () => {
    const prompt = buildPlatformRoutingPrompt("Mahnung vom Jobcenter", "de")
    expect(prompt).toContain("inkasso — Inkasso-Check")
    expect(prompt).toContain("Frage: Mahnung vom Jobcenter")
  })

  it("accepts only a real catalog id and rejects prose or none", () => {
    expect(parsePlatformRouteId("schufa")).toBe("schufa")
    expect(parsePlatformRouteId("SCHUFA.")).toBe("schufa")
    expect(parsePlatformRouteId("none")).toBeNull()
    expect(parsePlatformRouteId("Der passende Dienst ist schufa")).toBeNull()
    expect(parsePlatformRouteId("made-up-service")).toBeNull()
    expect(parsePlatformRouteId("")).toBeNull()
  })

  it("localizes a resolved match", () => {
    const bg = resolvePlatformMatch("vorlagen", "bg")
    const de = resolvePlatformMatch("vorlagen", "de")
    expect(bg?.title).toBe("Готови писма")
    expect(de?.title).toBe("Fertige Briefe")
    expect(bg?.href).toBe("/vorlagen")
    expect(resolvePlatformMatch("nope", "bg")).toBeNull()
  })
})
