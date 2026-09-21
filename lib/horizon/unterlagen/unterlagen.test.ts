import { describe, expect, it } from "vitest"
import { findDeadlineEvidence, DEADLINE_EVIDENCE_KINDS } from "./deadline"
import {
  assessDocumentRisk,
  classifyDocument,
  DOCUMENT_KINDS,
  isDocumentKind,
  recommendNextAction,
  RISK_CAVEATS,
} from "./classify"
import { analyseDocumentText, DOCUMENT_KIND_FACT_KEY } from "./analysis"
import { unterlagenCopy, getUnterlagenCopy } from "./copy"

describe("P16 deadline evidence", () => {
  it("returns unknown rather than a date for text with no deadline", () => {
    const result = findDeadlineEvidence("Sehr geehrte Damen und Herren, wir informieren Sie.")
    expect(result.kind).toBe("unknown")
    expect(result.date).toBeNull()
    expect(result.requiresUserVerification).toBe(true)
  })

  it("returns unknown for empty and non-string input", () => {
    for (const input of ["", "   ", null as unknown as string, undefined as unknown as string]) {
      const result = findDeadlineEvidence(input)
      expect(result.kind).toBe("unknown")
      expect(result.date).toBeNull()
    }
  })

  it("reads a printed numeric date beside deadline wording and quotes the line", () => {
    const text = "Zahlung bis zum 15.03.2026 auf unser Konto.\nMit freundlichen Grüßen"
    const result = findDeadlineEvidence(text)
    expect(result.kind).toBe("printed")
    expect(result.date).toBe("2026-03-15")
    expect(result.quote).toContain("15.03.2026")
    expect(result.requiresUserVerification).toBe(false)
  })

  it("reads a printed written-out date", () => {
    const result = findDeadlineEvidence("Die Frist endet am 3. März 2026.")
    expect(result.kind).toBe("printed")
    expect(result.date).toBe("2026-03-03")
  })

  it("does not treat a bare date without deadline wording as a deadline", () => {
    const result = findDeadlineEvidence("Berlin, den 01.02.2026\nBetreff: Ihre Anfrage")
    expect(result.kind).toBe("unknown")
    expect(result.date).toBeNull()
  })

  it("calculates a deadline from a stated period and reference date, flagged for verification", () => {
    const result = findDeadlineEvidence("Datum: 10.01.2026\nBitte antworten Sie innerhalb von zwei Wochen.")
    expect(result.kind).toBe("calculated")
    expect(result.date).toBe("2026-01-24")
    expect(result.rule).toContain("2 Wochen")
    expect(result.rule).toContain("2026-01-10")
    expect(result.requiresUserVerification).toBe(true)
  })

  it("calculates days and months from a stated period", () => {
    const days = findDeadlineEvidence("Datum: 01.03.2026\nZahlung innerhalb von 14 Tagen.")
    expect(days.date).toBe("2026-03-15")

    const months = findDeadlineEvidence("Datum: 31.01.2026\nKündigung innerhalb von 1 Monat.")
    // Calendar-aware: 31.01 + 1 month lands on the last day of February.
    expect(months.date).toBe("2026-02-28")
  })

  it("rolls a month across a leap year correctly", () => {
    const result = findDeadlineEvidence("Datum: 31.01.2028\nFrist innerhalb von 1 Monat.")
    expect(result.date).toBe("2028-02-29")
  })

  it("refuses an impossible printed date instead of accepting it", () => {
    const result = findDeadlineEvidence("Frist bis zum 31.02.2026.")
    expect(result.date).toBeNull()
  })

  it("refuses a period with no reference date rather than assuming today", () => {
    const result = findDeadlineEvidence("Bitte antworten Sie innerhalb von zwei Wochen.")
    expect(result.kind).toBe("unknown")
    expect(result.date).toBeNull()
  })

  it("prefers a printed date over a calculated one", () => {
    const text = "Frist bis zum 20.02.2026.\nDatum: 01.02.2026\nZahlung innerhalb von 4 Wochen."
    expect(findDeadlineEvidence(text).kind).toBe("printed")
  })

  it("exposes exactly the three evidence kinds", () => {
    expect(DEADLINE_EVIDENCE_KINDS).toEqual(["printed", "calculated", "unknown"])
  })

  it("is deterministic for the same input", () => {
    const text = "Zahlung bis zum 15.03.2026."
    expect(findDeadlineEvidence(text)).toEqual(findDeadlineEvidence(text))
  })
})

describe("P16 classification", () => {
  it("classifies a Bescheid from its printed cues", () => {
    const result = classifyDocument("Bescheid über die Bewilligung\nWiderspruchsbelehrung")
    expect(result.kind).toBe("behoerdenbescheid")
    expect(result.evidence).toBeTruthy()
  })

  it("classifies a Kündigung ahead of the general authority wording", () => {
    const result = classifyDocument("Kündigung des Vertrags zum nächstmöglichen Zeitpunkt")
    expect(result.kind).toBe("kuendigung")
  })

  it("classifies a Mahnung", () => {
    expect(classifyDocument("Letzte Mahnung vor rechtlichen Schritten").kind).toBe("mahnung")
  })

  it("returns unclear with no evidence when nothing matches", () => {
    const result = classifyDocument("Lorem ipsum dolor sit amet")
    expect(result.kind).toBe("unclear")
    expect(result.evidence).toBeNull()
    expect(result.alternatives).toEqual([])
  })

  it("returns unclear for empty text", () => {
    expect(classifyDocument("").kind).toBe("unclear")
  })

  it("quotes the surrounding line rather than the bare cue", () => {
    const result = classifyDocument("Betreffzeile\nIhre Rechnung Nr. 4711\nEnde")
    expect(result.evidence).toContain("Rechnung")
  })

  it("lists the other matching kinds as alternatives", () => {
    const result = classifyDocument("Rechnung\nBetreff: Mahnung")
    expect(result.alternatives.length).toBeGreaterThan(0)
  })

  it("accepts only the declared kinds", () => {
    expect(isDocumentKind("rechnung")).toBe(true)
    expect(isDocumentKind("Rechnung")).toBe(false)
    expect(isDocumentKind(null)).toBe(false)
    expect(DOCUMENT_KINDS).toContain("unclear")
  })
})

describe("P16 risk assessment", () => {
  it("reports cannot_determine for text too short to assess", () => {
    const result = assessDocumentRisk("Kurz")
    expect(result.state).toBe("cannot_determine")
    expect(result.caveat).toBe(RISK_CAVEATS.cannot_determine)
  })

  it("reports cannot_determine for empty text", () => {
    expect(assessDocumentRisk("").state).toBe("cannot_determine")
  })

  it("reports no_obvious_signals for ordinary text, with a caveat that is not a clearance", () => {
    const result = assessDocumentRisk(
      "Sehr geehrte Damen und Herren, anbei erhalten Sie Ihre Unterlagen zur Prüfung.",
    )
    expect(result.state).toBe("no_obvious_signals")
    expect(result.signals).toEqual([])
    expect(result.caveat).toBe(RISK_CAVEATS.no_obvious_signals)
    // The caveat must not read as a reassurance.
    expect(result.caveat.toLowerCase()).not.toContain("sicher")
    expect(result.caveat.toLowerCase()).toContain("keine freigabe")
  })

  it("detects pressure wording and quotes the exact phrase", () => {
    const result = assessDocumentRisk(
      "Sie müssen die Zahlung innerhalb von 24 Stunden leisten, sonst wird Ihr Konto gesperrt.",
    )
    expect(result.state).toBe("signals_detected")
    expect(result.signals.length).toBeGreaterThan(0)
    expect(result.signals[0].quote).toBeTruthy()
  })

  it("detects gift-card and crypto payment demands", () => {
    const gift = assessDocumentRisk(
      "Bitte bezahlen Sie den Betrag mit Geschenkkarte und senden Sie uns den Code.",
    )
    expect(gift.state).toBe("signals_detected")

    const crypto = assessDocumentRisk(
      "Überweisen Sie den Betrag in Bitcoin an die angegebene Wallet-Adresse.",
    )
    expect(crypto.state).toBe("signals_detected")
  })

  it("never accuses a sender of fraud in any state", () => {
    const states = [
      assessDocumentRisk("Sehr geehrte Damen und Herren, wir bitten um Zahlung."),
      assessDocumentRisk("Zahlung innerhalb von 2 Stunden oder Konto wird gesperrt."),
      assessDocumentRisk("kurz"),
    ]
    for (const assessment of states) {
      const text = `${assessment.caveat} ${assessment.signals.map((s) => s.quote).join(" ")}`.toLowerCase()
      expect(text).not.toContain("betrug begangen")
      expect(text).not.toContain("kriminell")
      expect(text).not.toContain("straftat")
    }
  })

  it("gives every state its own caveat", () => {
    expect(Object.keys(RISK_CAVEATS).sort()).toEqual(
      ["cannot_determine", "no_obvious_signals", "signals_detected"].sort(),
    )
  })
})

describe("P16 next action", () => {
  it("prioritises verifying an unverified deadline above everything else", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "calculated", requiresUserVerification: true },
        risk: "signals_detected",
        unconfirmedFactCount: 3,
      }),
    ).toBe("verify_deadline")
  })

  it("puts risk review ahead of missing facts", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "unknown", requiresUserVerification: true },
        risk: "signals_detected",
        unconfirmedFactCount: 2,
      }),
    ).toBe("review_risk_signals")
  })

  it("asks for facts before preparing a reply", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "printed", requiresUserVerification: false },
        risk: "no_obvious_signals",
        unconfirmedFactCount: 1,
      }),
    ).toBe("confirm_facts")
  })

  it("prepares a reply when a printed deadline is confirmed", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "printed", requiresUserVerification: false },
        risk: "no_obvious_signals",
        unconfirmedFactCount: 0,
      }),
    ).toBe("prepare_reply")
  })

  it("says no action is evident rather than inventing one", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "unknown", requiresUserVerification: true },
        risk: "no_obvious_signals",
        unconfirmedFactCount: 0,
      }),
    ).toBe("no_action_evident")
  })

  it("does not treat a printed deadline as needing verification", () => {
    expect(
      recommendNextAction({
        deadline: { kind: "printed", requiresUserVerification: false },
        risk: "cannot_determine",
        unconfirmedFactCount: 0,
      }),
    ).toBe("prepare_reply")
  })
})

describe("P16 analysis assembly", () => {
  it("returns a complete shape for an empty document", () => {
    const analysis = analyseDocumentText({ text: "" })
    expect(analysis.kind).toBe("unclear")
    expect(analysis.deadline.kind).toBe("unknown")
    expect(analysis.risk.state).toBe("cannot_determine")
    expect(analysis.userCorrected).toBe(false)
  })

  it("assembles classification, deadline and risk from one text", () => {
    const analysis = analyseDocumentText({
      text: "Bescheid\nFrist bis zum 15.03.2026.\nBitte zahlen Sie innerhalb von 2 Stunden oder das Konto wird gesperrt.",
    })
    expect(analysis.kind).toBe("behoerdenbescheid")
    expect(analysis.deadline.kind).toBe("printed")
    expect(analysis.risk.state).toBe("signals_detected")
  })

  it("lets a user correction override the computed kind and flags it", () => {
    const analysis = analyseDocumentText({
      text: "Rechnung Nr. 4711",
      correctedKind: "vertrag",
    })
    expect(analysis.kind).toBe("vertrag")
    expect(analysis.userCorrected).toBe(true)
    // A corrected label must not present the engine's evidence as its own basis.
    expect(analysis.kindEvidence).toBeNull()
  })

  it("does not flag a correction when the user confirms the computed kind", () => {
    const analysis = analyseDocumentText({ text: "Rechnung Nr. 4711", correctedKind: "rechnung" })
    expect(analysis.userCorrected).toBe(false)
  })

  it("derives the next action from the assembled evidence", () => {
    const analysis = analyseDocumentText({
      text: "Datum: 10.01.2026\nBitte antworten Sie innerhalb von zwei Wochen.",
    })
    expect(analysis.nextAction).toBe("verify_deadline")
  })

  it("exposes a stable fact key for the user correction", () => {
    expect(DOCUMENT_KIND_FACT_KEY).toBe("document_kind")
  })

  it("is deterministic for the same input", () => {
    const input = { text: "Bescheid über die Ablehnung\nWiderspruchsbelehrung" }
    expect(analyseDocumentText(input)).toEqual(analyseDocumentText(input))
  })
})

describe("P16 copy", () => {
  it("covers both active UI languages", () => {
    expect(Object.keys(unterlagenCopy).sort()).toEqual(["bg", "de"])
  })

  it("labels every document kind in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      for (const kind of DOCUMENT_KINDS) {
        expect(getUnterlagenCopy(locale).kinds[kind]).toBeTruthy()
      }
    }
  })

  it("labels every deadline kind and risk state in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getUnterlagenCopy(locale)
      for (const kind of DEADLINE_EVIDENCE_KINDS) expect(copy.deadlineKinds[kind]).toBeTruthy()
      for (const state of ["signals_detected", "no_obvious_signals", "cannot_determine"] as const) {
        expect(copy.riskStates[state]).toBeTruthy()
      }
    }
  })

  it("labels every next action in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getUnterlagenCopy(locale)
      for (const action of [
        "verify_deadline",
        "review_risk_signals",
        "confirm_facts",
        "prepare_reply",
        "translate_document",
        "no_action_evident",
      ] as const) {
        expect(copy.nextActions[action]).toBeTruthy()
      }
    }
  })

  it("states in both languages that no obvious signals is not a clearance", () => {
    expect(getUnterlagenCopy("de").riskStates.no_obvious_signals).toContain("keine Freigabe")
    expect(getUnterlagenCopy("bg").riskStates.no_obvious_signals).toContain("не е разрешение")
  })

  it("states in both languages that a calculated deadline needs verification", () => {
    expect(getUnterlagenCopy("de").deadlineVerify).toContain("geprüft")
    expect(getUnterlagenCopy("bg").deadlineVerify).toContain("проверен")
  })

  it("keeps official German documents in German in both languages", () => {
    expect(getUnterlagenCopy("de").languageNote).toContain("Original")
    expect(getUnterlagenCopy("bg").languageNote).toContain("оригинала")
  })
})
