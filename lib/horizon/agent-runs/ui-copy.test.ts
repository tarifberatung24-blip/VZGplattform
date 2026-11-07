import { describe, expect, it } from "vitest"
import { runConsoleCopy } from "./ui-copy"

describe("Run Console copy", () => {
  it("keeps the same keys in both locales", () => {
    const bg = Object.keys(runConsoleCopy.bg).sort()
    const de = Object.keys(runConsoleCopy.de).sort()
    expect(de).toEqual(bg)
  })

  it("has no empty string in either locale", () => {
    for (const [locale, copy] of Object.entries(runConsoleCopy)) {
      for (const [key, value] of Object.entries(copy)) {
        expect(value, `${locale}.${key} must not be empty`).toBeTruthy()
      }
    }
  })

  it("translates independently rather than copying one locale into the other", () => {
    // A handful of keys that must differ; a word-for-word copy would be a
    // translation bug, not a style choice.
    expect(runConsoleCopy.bg.title).not.toBe(runConsoleCopy.de.title)
    expect(runConsoleCopy.bg.refresh).not.toBe(runConsoleCopy.de.refresh)
    expect(runConsoleCopy.bg.cancel).not.toBe(runConsoleCopy.de.cancel)
  })
})
