import { describe, expect, it } from "vitest"
import {
  CASE_MODULES,
  HORIZON_CASE_ACTIONS,
  HORIZON_CASE_STATUSES,
  type CaseModule,
  type HorizonCaseAction,
  type HorizonCaseStatus,
} from "./contract"
import {
  LEGACY_CASE_STATUSES,
  allowedCaseActions,
  canApplyCaseAction,
  fromLegacyStatus,
  isHorizonCaseAction,
  isHorizonCaseStatus,
  isTerminalCaseStatus,
  nextCaseStatus,
  resolveCaseStatus,
  toLegacyStatus,
} from "./lifecycle"
import { isCaseModule, moduleFromIntent, resolveCaseModule } from "./module"
import {
  AGENTUR_TASK_FACT_KEY,
  deriveMissingInformation,
  requiredKeysFor,
  selectedAgenturTask,
} from "./missing-info"
import { buildApprovalPayload, computeContentHash, isApprovalValid } from "./approval"

describe("case contract vocabularies", () => {
  it("supports the seven required modules", () => {
    for (const caseModule of [
      "agentur_fuer_arbeit",
      "jobcenter",
      "kuendigung",
      "steuererklaerung",
      "unterlagen_erklaeren",
      "contract_management",
      "general",
    ]) {
      expect(isCaseModule(caseModule)).toBe(true)
    }
    expect(CASE_MODULES).toHaveLength(7)
  })

  it("uses the smallest sufficient lifecycle vocabulary", () => {
    expect([...HORIZON_CASE_STATUSES]).toEqual([
      "draft",
      "collecting_data",
      "waiting_for_user",
      "processing",
      "draft_ready",
      "review",
      "approved",
      "action_ready",
      "completed",
      "cancelled",
    ])
  })

  it("rejects unknown statuses and actions", () => {
    for (const value of [null, undefined, "", "DRAFT", "new", 1, {}]) {
      expect(isHorizonCaseStatus(value)).toBe(false)
      expect(isHorizonCaseAction(value)).toBe(false)
    }
    expect(isHorizonCaseStatus("draft")).toBe(true)
    expect(isHorizonCaseAction("approve")).toBe(true)
  })
})

describe("legacy status mapping", () => {
  it("maps every canonical status onto a real legacy value", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      expect(LEGACY_CASE_STATUSES).toContain(toLegacyStatus(status))
    }
  })

  it("maps every legacy value back to a canonical status", () => {
    for (const legacy of LEGACY_CASE_STATUSES) {
      expect(HORIZON_CASE_STATUSES).toContain(fromLegacyStatus(legacy))
    }
  })

  it("collapses the two terminal canonical states into their distinct read-back values", () => {
    // Both write CLOSED, which is why the canonical value lives in its own column.
    expect(toLegacyStatus("completed")).toBe("CLOSED")
    expect(toLegacyStatus("cancelled")).toBe("CLOSED")
    expect(fromLegacyStatus("CLOSED")).toBe("completed")
  })

  it("round-trips every status except the ambiguous CLOSED pair", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      const back = fromLegacyStatus(toLegacyStatus(status))
      if (toLegacyStatus(status) === "CLOSED") continue
      expect(back).toBe(status)
    }
  })

  it("prefers the canonical column and falls back to the legacy one", () => {
    expect(resolveCaseStatus({ horizon_status: "review", status: "NEW" })).toBe("review")
    expect(resolveCaseStatus({ horizon_status: null, status: "APPROVED" })).toBe("approved")
    expect(resolveCaseStatus({ status: "HUMAN_REVIEW" })).toBe("review")
  })

  it("treats unreadable or absent state as the first step rather than guessing", () => {
    expect(resolveCaseStatus({ horizon_status: "bogus", status: null })).toBe("draft")
    expect(resolveCaseStatus({})).toBe("draft")
    expect(resolveCaseStatus({ horizon_status: null, status: "NOT_A_STATUS" })).toBe("draft")
  })
})

describe("case lifecycle transitions", () => {
  it("walks the shared happy path end to end", () => {
    let status: HorizonCaseStatus = "draft"
    for (const action of [
      "start_collecting",
      "user_input_received",
      "mark_draft_ready",
      "submit_for_review",
      "approve",
      "mark_action_ready",
      "complete",
    ] satisfies HorizonCaseAction[]) {
      const next = nextCaseStatus(status, action)
      expect(next).not.toBeNull()
      status = next as HorizonCaseStatus
    }
    expect(status).toBe("completed")
  })

  it("refuses to approve before a draft exists", () => {
    expect(canApplyCaseAction("draft", "approve")).toBe(false)
    expect(canApplyCaseAction("collecting_data", "complete")).toBe(false)
    expect(nextCaseStatus("draft", "approve")).toBeNull()
  })

  it("never produces an unknown status from any allowed transition", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      for (const action of allowedCaseActions(status)) {
        expect(isHorizonCaseStatus(nextCaseStatus(status, action))).toBe(true)
      }
    }
  })

  it("keeps every reachable target inside the legacy vocabulary", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      for (const action of HORIZON_CASE_ACTIONS) {
        const next = nextCaseStatus(status, action)
        if (next) expect(LEGACY_CASE_STATUSES).toContain(toLegacyStatus(next))
      }
    }
  })

  it("marks only completed and cancelled as terminal", () => {
    expect(isTerminalCaseStatus("completed")).toBe(true)
    expect(isTerminalCaseStatus("cancelled")).toBe(true)
    expect(isTerminalCaseStatus("action_ready")).toBe(false)
    expect(isTerminalCaseStatus("review")).toBe(false)
  })

  it("allows reopening a terminal case", () => {
    expect(canApplyCaseAction("completed", "reopen")).toBe(true)
    expect(canApplyCaseAction("cancelled", "reopen")).toBe(true)
  })
})

describe("module resolution and adapters", () => {
  it("maps every known legacy intent to a valid module", () => {
    for (const intent of [
      "explanation",
      "reply",
      "complaint",
      "application",
      "objection",
      "cancellation",
      "document_request",
      "reminder",
      "free_email",
    ]) {
      expect(isCaseModule(moduleFromIntent(intent))).toBe(true)
    }
  })

  it("routes legacy intents to their closest module", () => {
    expect(moduleFromIntent("cancellation")).toBe("kuendigung")
    expect(moduleFromIntent("application")).toBe("agentur_fuer_arbeit")
    expect(moduleFromIntent("explanation")).toBe("unterlagen_erklaeren")
  })

  it("falls back to general for unknown or absent intents", () => {
    for (const value of [null, undefined, "", "something_new"]) {
      expect(moduleFromIntent(value)).toBe("general")
    }
  })

  it("prefers the canonical module column over the legacy intent", () => {
    expect(resolveCaseModule({ horizon_module: "jobcenter", intent: "cancellation" })).toBe("jobcenter")
    expect(resolveCaseModule({ horizon_module: null, intent: "cancellation" })).toBe("kuendigung")
    expect(resolveCaseModule({ horizon_module: "bogus", intent: "cancellation" })).toBe("kuendigung")
    expect(resolveCaseModule({})).toBe("general")
  })
})

describe("missing-information derivation", () => {
  const fact = (key: string, confirmed: boolean, critical = false) => ({
    key,
    critical,
    confirmedAt: confirmed ? "2026-09-19T00:00:00.000Z" : null,
  })

  it("reports required keys that are absent rather than inventing them", () => {
    const result = deriveMissingInformation([], "kuendigung")
    expect(result.missingFactKeys).toEqual(["contract_provider", "contract_reference"])
    expect(result.complete).toBe(false)
  })

  it("reports a present but unconfirmed critical fact separately", () => {
    const result = deriveMissingInformation(
      [fact("contract_provider", false, true), fact("contract_reference", true)],
      "kuendigung",
    )
    expect(result.missingFactKeys).toEqual([])
    expect(result.unconfirmedCriticalFactKeys).toEqual(["contract_provider"])
    expect(result.complete).toBe(false)
  })

  it("is complete only when nothing is missing and nothing critical is unconfirmed", () => {
    const result = deriveMissingInformation(
      [fact("contract_provider", true, true), fact("contract_reference", true)],
      "kuendigung",
    )
    expect(result).toEqual({
      missingFactKeys: [],
      unconfirmedCriticalFactKeys: [],
      complete: true,
    })
  })

  it("treats an unknown module as having no required keys", () => {
    expect(deriveMissingInformation([], "not_a_module")).toEqual({
      missingFactKeys: [],
      unconfirmedCriticalFactKeys: [],
      complete: true,
    })
  })

  it("does not require module-specific keys for the explain module", () => {
    expect(deriveMissingInformation([], "unterlagen_erklaeren").complete).toBe(true)
  })

  it("makes the Agentur module ask for the task before task-specific facts", () => {
    const base = deriveMissingInformation([], "agentur_fuer_arbeit")
    expect(base.missingFactKeys).toEqual(["recipient_institution", "claim_type"])
  })

  it("adds a selected task's own requirements to the module's", () => {
    const result = deriveMissingInformation(
      [{ key: AGENTUR_TASK_FACT_KEY, value: "arbeitslosengeld_beantragen" }],
      "agentur_fuer_arbeit",
    )
    expect(result.missingFactKeys).toContain("recipient_institution")
    expect(result.missingFactKeys).toContain("bank_iban")
    expect(result.missingFactKeys).toContain("unemployment_start_date")
  })

  it("does not let one task's requirements leak into another", () => {
    const melden = deriveMissingInformation(
      [{ key: AGENTUR_TASK_FACT_KEY, value: "arbeitslos_melden" }],
      "agentur_fuer_arbeit",
    )
    expect(melden.missingFactKeys).not.toContain("bank_iban")
  })

  it("ignores a task value that is not a known task", () => {
    const result = deriveMissingInformation(
      [{ key: AGENTUR_TASK_FACT_KEY, value: "not_a_task" }],
      "agentur_fuer_arbeit",
    )
    expect(result.missingFactKeys).toEqual(["recipient_institution", "claim_type"])
    expect(selectedAgenturTask([{ key: AGENTUR_TASK_FACT_KEY, value: "not_a_task" }])).toBeNull()
  })

  /**
   * Re-selecting a task appends a superseding fact, and `listFacts` returns rows
   * oldest-first. Resolving to the first match would keep the user's *previous*
   * choice and silently ask the wrong follow-up questions.
   */
  it("resolves the newest task selection, not the oldest", () => {
    const facts = [
      { key: AGENTUR_TASK_FACT_KEY, value: "arbeitslos_melden" },
      { key: AGENTUR_TASK_FACT_KEY, value: "arbeitslosengeld_beantragen" },
    ]
    expect(selectedAgenturTask(facts)).toBe("arbeitslosengeld_beantragen")
    expect(requiredKeysFor("agentur_fuer_arbeit", facts)).toContain("bank_iban")
  })
})

describe("approval validity", () => {
  it("accepts only a hash matching the current content", () => {
    expect(isApprovalValid("abc", "abc")).toBe(true)
    expect(isApprovalValid("abc", "def")).toBe(false)
    expect(isApprovalValid(null, "abc")).toBe(false)
    expect(isApprovalValid(undefined, "abc")).toBe(false)
    expect(isApprovalValid("", "abc")).toBe(false)
  })

  it("invalidates approval when approved content changes", () => {
    const approved = buildApprovalPayload({ subject: "Kündigung", body: "Text", recipient: "A" })
    const changed = buildApprovalPayload({ subject: "Kündigung", body: "Text geändert", recipient: "A" })
    expect(isApprovalValid(approved, approved)).toBe(true)
    // The stored hash stays; it simply no longer matches.
    expect(isApprovalValid(approved, changed)).toBe(false)
  })

  it("treats a missing recipient as an explicit null rather than dropping it", () => {
    expect(buildApprovalPayload({ subject: "s", body: "b", recipient: null })).toBe(
      buildApprovalPayload({ subject: "s", body: "b", recipient: null }),
    )
    expect(buildApprovalPayload({ subject: "s", body: "b", recipient: null })).not.toBe(
      buildApprovalPayload({ subject: "s", body: "b", recipient: "x" }),
    )
  })

  it("produces a 64-character lowercase hex digest", async () => {
    const hash = await computeContentHash("payload")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is stable for identical payloads and different for different ones", async () => {
    const a = await computeContentHash("same")
    const b = await computeContentHash("same")
    const c = await computeContentHash("different")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it("stays within the DB hash CHECK pattern for realistic content", async () => {
    const hash = await computeContentHash(
      buildApprovalPayload({
        subject: "Widerspruch gegen Bescheid",
        body: "Sehr geehrte Damen und Herren, ...",
        recipient: "Agentur für Arbeit",
      }),
    )
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe("module typing is exhaustive", () => {
  it("keeps every module assignable and distinct", () => {
    const seen = new Set<CaseModule>()
    for (const caseModule of CASE_MODULES) seen.add(caseModule)
    expect(seen.size).toBe(CASE_MODULES.length)
  })
})