import { describe, expect, it } from "vitest"
import {
  AGENT_RUN_EVENT_TYPES,
  AGENT_RUN_STATUSES,
  AGENT_STEP_STATUSES,
  MAX_ATTEMPTS_LIMIT,
  RUN_REFERENCE_KINDS,
  isTerminalRunStatus,
} from "./contract"
import {
  allowedRunTransitions,
  allowedStepTransitions,
  backoffMs,
  canTransitionRun,
  canTransitionStep,
  eventAppliesToRun,
  isRunTerminal,
  runStatusForEvent,
  shouldRetry,
} from "./lifecycle"

/**
 * The lifecycle is the declared behaviour the database CHECK constraints only
 * backstop. These tests pin the properties the brief depends on: no regression
 * out of a terminal state, bounded retries, and a human-in-the-loop pause that is
 * a real state rather than a convention.
 */
describe("agent run lifecycle", () => {
  it("never transitions out of a terminal run status", () => {
    for (const status of AGENT_RUN_STATUSES) {
      if (!isTerminalRunStatus(status)) continue
      expect(allowedRunTransitions(status)).toHaveLength(0)
      for (const target of AGENT_RUN_STATUSES) {
        expect(canTransitionRun(status, target)).toBe(false)
      }
    }
  })

  it("treats failed as retryable but dead_letter as terminal", () => {
    // The distinction is the whole point of the retry design: a failure that still
    // has attempts left must be re-runnable, and one that does not must be visible.
    expect(canTransitionRun("failed", "queued")).toBe(true)
    expect(canTransitionRun("failed", "running")).toBe(true)
    expect(canTransitionRun("failed", "dead_letter")).toBe(true)
    expect(isRunTerminal("failed")).toBe(false)
    expect(isRunTerminal("dead_letter")).toBe(true)
  })

  it("refuses a self-transition, so a status write is never a no-op", () => {
    for (const status of AGENT_RUN_STATUSES) {
      expect(canTransitionRun(status, status)).toBe(false)
    }
    for (const status of AGENT_STEP_STATUSES) {
      expect(canTransitionStep(status, status)).toBe(false)
    }
  })

  it("lets a paused run resume and a cancelled run do nothing", () => {
    expect(canTransitionRun("paused", "running")).toBe(true)
    expect(allowedRunTransitions("cancelled")).toHaveLength(0)
  })

  it("keeps every transition target inside the declared vocabulary", () => {
    for (const status of AGENT_RUN_STATUSES) {
      for (const target of allowedRunTransitions(status)) {
        expect(AGENT_RUN_STATUSES).toContain(target)
      }
    }
    for (const status of AGENT_STEP_STATUSES) {
      for (const target of allowedStepTransitions(status)) {
        expect(AGENT_STEP_STATUSES).toContain(target)
      }
    }
  })
})

describe("agent run backoff", () => {
  it("grows exponentially and stays bounded", () => {
    const base = 1_000
    const max = 60_000
    expect(backoffMs(0, { baseMs: base, maxMs: max })).toBe(1_000)
    expect(backoffMs(1, { baseMs: base, maxMs: max })).toBe(2_000)
    expect(backoffMs(2, { baseMs: base, maxMs: max })).toBe(4_000)
    // Clamped: a large attempt cannot produce Infinity or an unbounded delay.
    expect(backoffMs(50, { baseMs: base, maxMs: max })).toBe(max)
    expect(Number.isFinite(backoffMs(Number.MAX_SAFE_INTEGER, { baseMs: base, maxMs: max }))).toBe(true)
  })

  it("treats a negative or fractional attempt as the first attempt", () => {
    expect(backoffMs(-5, { baseMs: 100, maxMs: 10_000 })).toBe(100)
    expect(backoffMs(1.9, { baseMs: 100, maxMs: 10_000 })).toBe(200)
  })
})

describe("agent run retry budget", () => {
  it("retries while attempts remain and stops when they are exhausted", () => {
    expect(shouldRetry(0, 3)).toBe(true)
    expect(shouldRetry(2, 3)).toBe(true)
    expect(shouldRetry(3, 3)).toBe(false)
    expect(shouldRetry(4, 3)).toBe(false)
  })

  it("never treats a missing or non-positive budget as unlimited retries", () => {
    // An unlimited loop is exactly what the brief forbids, so a nonsense budget
    // must fail closed.
    expect(shouldRetry(0, 0)).toBe(false)
    expect(shouldRetry(0, -1)).toBe(false)
    expect(shouldRetry(0, Number.NaN)).toBe(false)
    expect(shouldRetry(0, Number.POSITIVE_INFINITY)).toBe(false)
  })

  it("keeps the declared maximum attempt limit sane", () => {
    expect(MAX_ATTEMPTS_LIMIT).toBeGreaterThanOrEqual(1)
    expect(MAX_ATTEMPTS_LIMIT).toBeLessThanOrEqual(100)
  })
})

describe("agent run event handling", () => {
  it("moves the run only for the events that carry a decision", () => {
    expect(runStatusForEvent("USER_APPROVAL_GRANTED")).toBe("running")
    expect(runStatusForEvent("USER_APPROVAL_REJECTED")).toBe("cancelled")
    // Informational events do not move a run; they only enqueue work.
    expect(runStatusForEvent("DOCUMENT_READY")).toBeNull()
    expect(runStatusForEvent("CASE_UPDATED")).toBeNull()
    expect(runStatusForEvent("SERVICE_REQUEST_CREATED")).toBeNull()
    expect(runStatusForEvent("DEADLINE_APPROACHING")).toBe("running")
  })

  it("refuses an event that would resurrect a terminal run", () => {
    // A late approval must not restart a cancelled run.
    expect(eventAppliesToRun("USER_APPROVAL_GRANTED", "cancelled")).toBe(false)
    expect(eventAppliesToRun("USER_APPROVAL_GRANTED", "completed")).toBe(false)
    expect(eventAppliesToRun("DOCUMENT_READY", "completed")).toBe(false)
    expect(eventAppliesToRun("DOCUMENT_READY", "dead_letter")).toBe(false)
  })

  it("accepts an informational event for a live run and a decision for a waiting run", () => {
    expect(eventAppliesToRun("DOCUMENT_READY", "queued")).toBe(true)
    expect(eventAppliesToRun("DOCUMENT_READY", "running")).toBe(true)
    expect(eventAppliesToRun("USER_APPROVAL_GRANTED", "awaiting_approval")).toBe(true)
    expect(eventAppliesToRun("USER_APPROVAL_REJECTED", "awaiting_approval")).toBe(true)
  })

  it("declares exactly the six required event types", () => {
    expect(AGENT_RUN_EVENT_TYPES).toHaveLength(6)
    expect(new Set(AGENT_RUN_EVENT_TYPES).size).toBe(6)
  })
})

describe("agent run references", () => {
  it("only allows references to existing HORIZON entities", () => {
    // A reference kind is a pointer to another HORIZON row, never a container for
    // content, so the vocabulary is closed and small.
    expect(RUN_REFERENCE_KINDS).toEqual([
      "case",
      "document",
      "fact",
      "draft",
      "service_request",
      "assistant_message",
    ])
  })
})
