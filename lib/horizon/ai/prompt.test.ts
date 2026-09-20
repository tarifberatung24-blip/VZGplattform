import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildCaseAssistantSystemPrompt } from "./prompt"
import { buildCaseContext } from "./context"
import { HORIZON_PROMPT_VERSIONS } from "./registry"
import type { Case } from "@/lib/horizon/case/contract"

const root = process.cwd()
const assistantRoute = readFileSync(
  join(root, "app/api/horizon/cases/[id]/assistant/route.ts"),
  "utf8",
)
const legacyChatRoute = readFileSync(join(root, "app/api/chat/route.ts"), "utf8")

/**
 * Strips comments so the assertions test executable code rather than prose.
 * The route's own doc comment explains what it does *not* do, which would
 * otherwise trip an assertion looking for the absence of those words.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

const assistantCode = stripComments(assistantRoute).toLowerCase()

const baseCase: Case = {
  id: "11111111-1111-1111-1111-111111111111",
  ownerId: "22222222-2222-2222-2222-222222222222",
  module: "agentur_fuer_arbeit",
  status: "collecting_data",
  title: "Anliegen bei der Agentur für Arbeit",
  intent: "application",
  uiLocale: "bg",
  conversationLocale: "bg",
  institution: null,
  deadline: null,
  createdAt: "2026-01-01T00:00:00.000Z",
}

describe("case assistant prompt", () => {
  it("carries the version literal so output is traceable", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    const prompt = buildCaseAssistantSystemPrompt(context)
    expect(prompt).toContain(HORIZON_PROMPT_VERSIONS.caseAssistant)
  })

  it("states the withheld decisions and the no-send rule", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    const prompt = buildCaseAssistantSystemPrompt(context)
    expect(prompt).toMatch(/Freigabe/)
    expect(prompt).toMatch(/versendest nichts/)
    expect(prompt).toMatch(/Erfinde keine/)
  })

  it("lists only the capabilities the module actually permits", () => {
    const context = buildCaseContext({
      case: baseCase,
      facts: [],
      missing: null,
      drafts: [],
      approvedDraftIds: [],
      documentCount: 0,
    })
    const prompt = buildCaseAssistantSystemPrompt(context)
    // agentur_fuer_arbeit: explain, draft, ask_missing_questions
    expect(prompt).toContain("explain, draft, ask_missing_questions")
    expect(prompt).not.toContain("translate")
  })
})

describe("case assistant route keeps the safety properties", () => {
  it("enforces ownership through the case engine, not a service client", () => {
    expect(assistantRoute).toContain("createCaseEngine")
    expect(assistantRoute).toContain("loadCaseContext")
    expect(assistantRoute).not.toContain("createAdminClient")
    expect(assistantRoute).not.toContain("service_role")
  })

  it("requires an authenticated session before streaming", () => {
    expect(assistantRoute).toContain("AUTHENTICATION_REQUIRED")
    expect(assistantRoute).toContain("status: 401")
  })

  it("reports a non-owned case as not found rather than forbidden", () => {
    expect(assistantRoute).toContain("CASE_NOT_FOUND")
    expect(assistantRoute).toContain("status: 404")
  })

  it("takes the case id from the path only, not the body", () => {
    expect(assistantCode).toContain("await params")
    expect(assistantCode).not.toContain("caseid:")
  })

  it("exposes no approval, send or authorization path", () => {
    expect(assistantCode).not.toContain("approve")
    expect(assistantCode).not.toContain("recordapproval")
    expect(assistantCode).not.toContain("sendmail")
    expect(assistantCode).not.toContain("/approve")
    expect(assistantCode).not.toContain("insert(")
    expect(assistantCode).not.toContain(".update(")
  })

  it("is rate limited and fails closed without a provider key", () => {
    expect(assistantRoute).toContain("checkRateLimit")
    expect(assistantRoute).toContain("AI_PROVIDER_NOT_CONFIGURED")
  })
})

describe("legacy household chat route is left untouched by P7", () => {
  it("still reads the platform household stack, pending a later reconciliation", () => {
    // P7 adds the canonical case-scoped assistant. The older household chat
    // route is deliberately not rewritten in this phase: replacing it changes a
    // live surface and belongs to the reconciliation phase, not here.
    expect(legacyChatRoute).toContain("ensureHousehold")
    expect(legacyChatRoute).toContain("contracts")
  })
})