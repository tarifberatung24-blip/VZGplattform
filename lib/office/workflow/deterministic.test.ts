import { describe, expect, it } from "vitest"
import { DeterministicTranslator } from "./deterministic"

describe("DeterministicTranslator", () => {
  it("returns unchanged German copy when no translation is needed", async () => {
    const translator = new DeterministicTranslator()
    await expect(translator.translate({ subject: "Anfrage", body: "Text", locale: "de" }))
      .resolves.toEqual({ subject: "Anfrage", body: "Text" })
  })

  it("never labels untranslated German copy as a translation", async () => {
    const translator = new DeterministicTranslator()
    await expect(translator.translate({ subject: "Anfrage", body: "Text", locale: "bg" }))
      .rejects.toThrow("AI_TRANSLATION_PROVIDER_REQUIRED")
  })
})
