import { describe, expect, it } from "vitest"
import { negotiationCopy, getNegotiationCopy } from "./copy"
import {
  DECISION_ACTIONS,
  NEGOTIATION_STATES,
  SAVINGS_STATES,
  VERIFICATION_RESULTS,
} from "./contract"

const locales = ["bg", "de"] as const

/** Every string reachable from the copy object, keyed by its dotted path. */
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (accumulator, [key, child]) => ({
        ...accumulator,
        ...flatten(child, prefix ? `${prefix}.${key}` : key),
      }),
      {},
    )
  }
  return {}
}

describe("negotiation copy — BG/DE parity", () => {
  it("has exactly the same keys in both languages", () => {
    const bg = Object.keys(flatten(negotiationCopy.bg)).sort()
    const de = Object.keys(flatten(negotiationCopy.de)).sort()
    expect(bg).toEqual(de)
  })

  it("has no empty string in either language", () => {
    for (const locale of locales) {
      const entries = flatten(negotiationCopy[locale])
      for (const [key, value] of Object.entries(entries)) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0)
      }
    }
  })

  it("labels every decision action, state, savings state and verification result", () => {
    for (const locale of locales) {
      const copy = getNegotiationCopy(locale)
      for (const action of DECISION_ACTIONS) expect(copy.actions[action].length).toBeGreaterThan(0)
      for (const state of NEGOTIATION_STATES) expect(copy.states[state].length).toBeGreaterThan(0)
      for (const state of SAVINGS_STATES) expect(copy.savingsStates[state].length).toBeGreaterThan(0)
      for (const result of VERIFICATION_RESULTS) expect(copy.verificationResults[result].length).toBeGreaterThan(0)
    }
  })

  it("does not contain a visible English string in the German copy", () => {
    // A short, targeted guard against the most likely regression: an action label
    // left in English. It checks the labels a user actually clicks, not prose.
    const de = negotiationCopy.de
    for (const action of DECISION_ACTIONS) {
      expect(de.actions[action]).not.toBe(action)
    }
  })
})

describe("negotiation copy — no promises", () => {
  it("never claims a bill will be lowered", () => {
    for (const locale of locales) {
      const copy = getNegotiationCopy(locale)
      expect(copy.legalNote.toLowerCase()).not.toContain("we will lower")
      expect(copy.legalNote.toLowerCase()).not.toContain("wir senken")
    }
  })

  it("states the no-credentials rule in both languages", () => {
    expect(negotiationCopy.de.noCredentials).toContain("Passwörter")
    expect(negotiationCopy.bg.noCredentials).toContain("пароли")
  })

  it("states that automated execution is disabled in both languages", () => {
    expect(negotiationCopy.de.modeAutomatedDisabled.length).toBeGreaterThan(0)
    expect(negotiationCopy.bg.modeAutomatedDisabled.length).toBeGreaterThan(0)
  })
})
