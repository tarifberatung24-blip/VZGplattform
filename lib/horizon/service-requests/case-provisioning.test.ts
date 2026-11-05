import { describe, expect, it, vi } from "vitest"
import { provisionHorizonServiceCase } from "./case-provisioning"

function repository() {
  return {
    createCase: vi.fn().mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111", status: "draft" }, error: null }),
    addFacts: vi.fn().mockResolvedValue({ data: [], error: null }),
    addMessage: vi.fn().mockResolvedValue({ data: { id: "message" }, error: null }),
    appendAudit: vi.fn().mockResolvedValue({ data: {}, error: null }),
    advanceTo: vi.fn().mockImplementation(async (_id: string, status: string) => ({ data: { id: "case", status }, error: null })),
  }
}

describe("Horizon service case provisioning", () => {
  it("creates a case, records service facts, starts the conversation and blocks on missing evidence", async () => {
    const repo = repository()
    const result = await provisionHorizonServiceCase(repo as never, {
      kind: "steuererklaerung",
      locale: "bg",
      requestId: "hz_request",
      customerName: "Ivan Petrov",
      customerEmail: "ivan@example.com",
      answers: { serviceDetails: "Steuerjahr 2025" },
    })

    expect(result.error).toBeNull()
    expect(repo.createCase).toHaveBeenCalledWith(expect.objectContaining({ module: "general", intent: "application" }))
    expect(repo.addFacts).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
      expect.objectContaining({ key: "service_request_type", value: "steuererklaerung", critical: true }),
      expect.objectContaining({ key: "alpha_team_lead", value: "finance-tax" }),
    ]))
    expect(repo.addMessage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ role: "assistant" }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "alpha_team_run_created", expect.objectContaining({ serviceKind: "steuererklaerung" }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.any(String), "quality_safety_blocked", expect.objectContaining({ externalActions: "blocked_until_human_approval" }))
    expect(repo.advanceTo).toHaveBeenNthCalledWith(1, expect.any(String), "collecting_data")
    expect(repo.advanceTo).toHaveBeenNthCalledWith(2, expect.any(String), "waiting_for_user")
  })
})
