import { describe, expect, it } from "vitest"
import { recommendGuideIntent } from "./situation-router"

describe("recommendGuideIntent", () => {
  it("routes common Bulgarian and German descriptions to a task without deciding eligibility", () => {
    expect(recommendGuideIntent("Искам да кандидатствам за Kindergeld").intent).toBe("fill_official_form")
    expect(recommendGuideIntent("Ich muss bis Freitag antworten").intent).toBe("reply_to_authority")
    expect(recommendGuideIntent("Искам да прекратя договор").intent).toBe("cancel_contract")
    expect(recommendGuideIntent("Ich habe einen Brief vom Finanzamt").intent).toBe("understand_document")
  })

  it("keeps an unclear description in the neutral path", () => {
    expect(recommendGuideIntent("Не знам какво се случва").intent).toBe("unsure")
  })

  it("opens a platform destination only for the matching explicit topic", () => {
    expect(recommendGuideIntent("Искам по-евтина тарифа за ток").destination).toEqual({ kind: "contracts" })
    expect(recommendGuideIntent("Ich brauche Hilfe vom Jobcenter").destination).toEqual({ kind: "module", module: "jobcenter" })
    expect(recommendGuideIntent("Termin bei der Arbeitsagentur").destination).toEqual({ kind: "module", module: "agentur_fuer_arbeit" })
    expect(recommendGuideIntent("Сметката ми за ток е висока").destination).toEqual({ kind: "guide_case" })
  })
})
