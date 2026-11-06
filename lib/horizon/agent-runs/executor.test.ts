import { describe, expect, it } from "vitest"
import {
  DEFAULT_STEP_TIMEOUT_MS,
  MAX_STEPS_PER_RUN,
  executePlan,
  isRunnableStatus,
  type StepRunner,
} from "./executor"
import type { RunExecutionPlan, RunStepDescriptor } from "./contract"

/**
 * The executor is pure orchestration over an injected runner, so these tests use a
 * real (in-process) runner rather than a mock of the engine: what is under test is
 * the engine's own control flow — ordering, deadlines, abort points and attempt
 * bookkeeping — and a mock would only restate that control flow back to itself.
 */

const plan = (steps: RunStepDescriptor[]): RunExecutionPlan => ({
  runId: "11111111-1111-4111-8111-111111111111",
  ownerId: "22222222-2222-4222-8222-222222222222",
  traceId: "33333333-3333-4333-8333-333333333333",
  caseId: "44444444-4444-4444-8444-444444444444",
  objective: "Prepare a reply for the case",
  leadAgent: "finance-tax",
  steps,
})

const step = (key: string): RunStepDescriptor => ({
  stepKey: key,
  agentId: "finance-tax",
  operation: "draft_reply",
})

describe("agent run executor", () => {
  it("runs steps in declared order and reports completed", async () => {
    const seen: string[] = []
    const runner: StepRunner = async ({ step: s }) => {
      seen.push(s.stepKey)
      return { status: "completed", outputReference: { kind: "draft", id: s.stepKey } }
    }

    const outcome = await executePlan(plan([step("a"), step("b"), step("c")]), runner)
    expect(seen).toEqual(["a", "b", "c"])
    expect(outcome.status).toBe("completed")
    expect(outcome.errorCode).toBeNull()
    expect(outcome.steps).toHaveLength(3)
  })

  it("stops at the first failure so a later step never runs on a failed step", async () => {
    const seen: string[] = []
    const runner: StepRunner = async ({ step: s }) => {
      seen.push(s.stepKey)
      return s.stepKey === "b" ? { status: "failed", errorCode: "STEP_OPERATION_FAILED" } : { status: "completed" }
    }

    const outcome = await executePlan(plan([step("a"), step("b"), step("c")]), runner)
    expect(seen).toEqual(["a", "b"])
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("STEP_OPERATION_FAILED")
  })

  it("bounds the number of steps it will execute", async () => {
    // A malformed or hostile plan cannot turn into unbounded work.
    const many = Array.from({ length: MAX_STEPS_PER_RUN + 5 }, (_, i) => step(`s${i}`))
    let calls = 0
    const runner: StepRunner = async () => {
      calls += 1
      return { status: "completed" }
    }

    const outcome = await executePlan(plan(many), runner)
    expect(calls).toBe(MAX_STEPS_PER_RUN)
    expect(outcome.steps).toHaveLength(MAX_STEPS_PER_RUN)
  })

  it("fails a step that outlives its deadline, even if the runner ignores the signal", async () => {
    const runner: StepRunner = () => new Promise(() => {}) // never settles

    const outcome = await executePlan(plan([step("a")]), runner, { stepTimeoutMs: 20 })
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("EXECUTION_TIMEOUT")
    expect(outcome.steps[0]?.status).toBe("aborted")
  })

  it("records a thrown runner as a failed step rather than throwing out of the executor", async () => {
    const runner: StepRunner = async () => {
      throw new Error("provider exploded with a secret")
    }

    const outcome = await executePlan(plan([step("a")]), runner)
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("STEP_OPERATION_FAILED")
    // The raw message is not part of the outcome, so it cannot reach storage.
    expect(JSON.stringify(outcome)).not.toContain("provider exploded")
  })

  it("honours a pause request at a step boundary", async () => {
    const runner: StepRunner = async () => ({ status: "completed" })
    let calls = 0

    const outcome = await executePlan(plan([step("a"), step("b")]), runner, {
      shouldAbort: async () => {
        calls += 1
        return calls === 2 ? "pause" : null
      },
    })
    expect(outcome.status).toBe("paused")
    expect(outcome.steps).toHaveLength(1)
  })

  it("honours a cancellation request at a step boundary", async () => {
    const runner: StepRunner = async () => ({ status: "completed" })
    let calls = 0

    const outcome = await executePlan(plan([step("a"), step("b")]), runner, {
      shouldAbort: async () => {
        calls += 1
        return calls === 1 ? "cancel" : null
      },
    })
    expect(outcome.status).toBe("cancelled")
    expect(outcome.steps).toHaveLength(0)
  })

  it("fails the run when the overall run deadline elapses", async () => {
    // The clock advances by more than the run budget after the first step.
    let clock = 0
    const runner: StepRunner = async () => {
      clock += 10_000
      return { status: "completed" }
    }

    const outcome = await executePlan(plan([step("a"), step("b"), step("c")]), runner, {
      runTimeoutMs: 5_000,
      now: () => clock,
    })
    expect(outcome.status).toBe("failed")
    expect(outcome.errorCode).toBe("EXECUTION_TIMEOUT")
  })

  it("reports each finished step to the caller as it completes", async () => {
    const persisted: string[] = []
    const onStep = async (executed: { step: { stepKey: string }; status: string }) => {
      persisted.push(`${executed.step.stepKey}:${executed.status}`)
    }
    const runner: StepRunner = async ({ step: s }) => ({
      status: "completed",
      outputReference: { kind: "draft", id: s.stepKey },
    })

    await executePlan(plan([step("a"), step("b")]), runner, { onStep })
    // Incremental persistence is what makes a crash resumable, so each step must be
    // reported as it finishes rather than only at the end of the run.
    expect(persisted).toEqual(["a:completed", "b:completed"])
  })

  it("gives each step an attempt number and a duration", async () => {
    const runner: StepRunner = async () => ({ status: "completed" })
    const outcome = await executePlan(plan([step("a")]), runner, {
      now: (() => {
        let t = 100
        return () => (t += 5)
      })(),
    })
    expect(outcome.steps[0]?.attempt).toBe(1)
    expect(outcome.steps[0]?.durationMs ?? -1).toBeGreaterThanOrEqual(0)
  })

  it("exposes the runnable statuses the dispatcher may execute", () => {
    expect(isRunnableStatus("queued")).toBe(true)
    expect(isRunnableStatus("running")).toBe(true)
    expect(isRunnableStatus("paused")).toBe(false)
    expect(isRunnableStatus("awaiting_approval")).toBe(false)
    expect(isRunnableStatus("completed")).toBe(false)
    expect(isRunnableStatus("cancelled")).toBe(false)
  })

  it("has a positive default step timeout", () => {
    expect(DEFAULT_STEP_TIMEOUT_MS).toBeGreaterThan(0)
  })
})
