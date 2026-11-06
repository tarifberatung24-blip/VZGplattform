import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { createAssistantStepRunner } from "./assistant"
import type { CaseEngineRepository } from "../case/repository"
import type { CaseContext } from "../ai/context"
import type { StepContext } from "./executor"

/**
 * The assistant runner is the engine's only link to a model. These tests use a
 * real (injected) generator function and a stubbed case engine, and they check the
 * boundaries the runner must hold regardless of what the model returns:
 *
 * - a gated or unknown operation never reaches the model;
 * - a missing model key produces `ENGINE_NOT_CONFIGURED`, not a fabricated answer;
 * - the returned reference points at the stored assistant message and carries only
 *   provenance metadata — never the message text, and never a prompt.
 */

const CASE_ID = "a0000000-0000-4000-8000-0000000000c1"

const context = (overrides: Partial<StepContext> = {}): StepContext =>
  ({
    plan: {
      runId: "r1",
      ownerId: "o1",
      traceId: "t1",
      caseId: CASE_ID,
      objective: "подготви отговор",
      leadAgent: "finance-tax",
      steps: [],
    },
    step: { stepKey: "finance-tax:draft_content", agentId: "finance-tax", operation: "draft_content" },
    attempt: 1,
    signal: new AbortController().signal,
    ...overrides,
  }) as StepContext

function makeRepository(options: { context?: CaseContext | null; storeError?: string } = {}): CaseEngineRepository {
  const stored = { id: "message-1" }
  return {
    loadCaseContext: async () =>
      options.context === null
        ? { data: null, error: "Case not found" }
        : {
            data:
              options.context ??
              ({ caseId: CASE_ID, documentIds: [], conversationLocale: "bg" } as unknown as CaseContext),
            error: null,
          },
    addMessage: async () =>
      options.storeError ? { data: null, error: options.storeError } : { data: stored, error: null },
  } as unknown as CaseEngineRepository
}

const okGenerator = async () => "Draft reply text"

describe("assistant step runner: safety boundaries", () => {
  it("refuses an operation the runner does not implement", async () => {
    const runner = createAssistantStepRunner({ repository: makeRepository() })
    const outcome = await runner(
      context({
        step: { stepKey: "x:send_external", agentId: "x", operation: "send_external" },
      }),
    )
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("SAFETY_POLICY_DENIED")
  })

  it("refuses an unknown operation string", async () => {
    const runner = createAssistantStepRunner({ repository: makeRepository() })
    const outcome = await runner(
      context({ step: { stepKey: "x:invented", agentId: "x", operation: "invented_operation" } }),
    )
    expect(outcome.errorCode).toBe("SAFETY_POLICY_DENIED")
  })

  it("never calls the model for a denied operation", async () => {
    const generate = vi.fn(okGenerator)
    const runner = createAssistantStepRunner({ repository: makeRepository(), generate })
    await runner(
      context({ step: { stepKey: "x:sign", agentId: "x", operation: "sign_or_accept_contract" } }),
    )
    expect(generate).not.toHaveBeenCalled()
  })
})

describe("assistant step runner: unconfigured engine", () => {
  it("reports ENGINE_NOT_CONFIGURED instead of fabricating an answer", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => false,
    })
    const outcome = await runner(context())
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("ENGINE_NOT_CONFIGURED")
  })
})

describe("assistant step runner: case context", () => {
  it("skips a run with no case context rather than answering from nothing", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: okGenerator,
    })
    const outcome = await runner(context({ plan: { ...context().plan, caseId: null } }))
    expect(outcome.status).toBe("skipped")
    expect(outcome.outputReference).toMatchObject({ reason: "NO_CASE_CONTEXT" })
  })

  it("fails when the case cannot be loaded through the owner-scoped engine", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository({ context: null }),
      apiKeyPresent: () => true,
      generate: okGenerator,
    })
    const outcome = await runner(context())
    expect(outcome.errorCode).toBe("CASE_NOT_FOUND")
  })

  it("fails when the assistant message cannot be stored", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository({ storeError: "insert failed" }),
      apiKeyPresent: () => true,
      generate: okGenerator,
    })
    const outcome = await runner(context())
    expect(outcome.errorCode).toBe("STEP_OPERATION_FAILED")
  })
})

describe("assistant step runner: output is a reference, not content", () => {
  it("returns a reference to the stored message and no message text", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: async () => "Highly confidential draft body",
    })
    const outcome = await runner(context())

    expect(outcome.status).toBe("completed")
    expect(outcome.outputReference).toMatchObject({
      kind: "assistant_message",
      messageId: "message-1",
      caseId: CASE_ID,
    })
    // The content must not be echoed into the reference: it belongs to the case
    // conversation, which is the single source of truth.
    expect(JSON.stringify(outcome)).not.toContain("Highly confidential draft body")
    expect(JSON.stringify(outcome.outputReference)).not.toContain("confidential")
  })

  it("records the model and prompt versions for provenance", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: okGenerator,
    })
    const outcome = await runner(context())
    expect(outcome.outputReference?.model).toBeTruthy()
    expect(outcome.outputReference?.promptVersion).toBeTruthy()
    expect(outcome.outputReference?.skillVersion).toBe("finance-tax:draft_content")
  })

  it("does not put the objective or the prompt into the reference", async () => {
    let capturedPrompt = ""
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: async ({ prompt }) => {
        capturedPrompt = prompt
        return "ok"
      },
    })
    const outcome = await runner(
      context({ plan: { ...context().plan, objective: "SECRET OBJECTIVE TEXT" } }),
    )
    // The objective reaches the model as data, but is not persisted in the reference.
    expect(capturedPrompt).toContain("SECRET OBJECTIVE TEXT")
    expect(JSON.stringify(outcome.outputReference)).not.toContain("SECRET OBJECTIVE TEXT")
  })
})

describe("assistant step runner: model failures", () => {
  it("classifies an aborted generation as a timeout", async () => {
    const controller = new AbortController()
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: async () => {
        controller.abort()
        const error = new Error("aborted")
        error.name = "AbortError"
        throw error
      },
    })
    const outcome = await runner(context({ signal: controller.signal }))
    expect(outcome.errorCode).toBe("EXECUTION_TIMEOUT")
  })

  it("classifies an empty completion as a step failure", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: async () => "   ",
    })
    const outcome = await runner(context())
    expect(outcome.errorCode).toBe("STEP_OPERATION_FAILED")
  })

  it("never leaks the provider error message into the outcome", async () => {
    const runner = createAssistantStepRunner({
      repository: makeRepository(),
      apiKeyPresent: () => true,
      generate: async () => {
        throw new Error("groq 401: key sk-secret-value rejected")
      },
    })
    const outcome = await runner(context())
    expect(outcome.errorCode).toBe("STEP_OPERATION_FAILED")
    expect(JSON.stringify(outcome)).not.toContain("sk-secret-value")
  })
})
