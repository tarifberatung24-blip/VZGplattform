import { afterEach, describe, expect, it, vi } from "vitest"
import { IMPACT_SCRIPT_URL, IMPACT_SITE_VERIFICATION_TEXT, IMPACT_VERIFICATION_SNIPPET, loadImpact } from "./impact"

describe("impact.com snippet", () => {
  it("is the snippet impact.com handed out, with the account's script address", () => {
    expect(IMPACT_SCRIPT_URL).toBe("https://utt.impactcdn.com/P-A7950557-e342-4625-872f-e947bd3cf9e11.js")
    expect(IMPACT_VERIFICATION_SNIPPET).toContain(`('${IMPACT_SCRIPT_URL}','script','impactStat',document,window)`)
    expect(IMPACT_VERIFICATION_SNIPPET).toContain("impactStat('transformLinks');impactStat('trackImpression');")
  })
})

describe("impact.com site verification", () => {
  it("is the text segment impact.com handed out", () => {
    expect(IMPACT_SITE_VERIFICATION_TEXT).toBe("Impact-Site-Verification: dd538627-44a2-40d2-88a1-df8d8b1ac9ac")
  })
})

describe("loadImpact", () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubBrowser() {
    const appended: Array<{ src?: string; async?: boolean }> = []
    const win: Record<string, unknown> = {}
    vi.stubGlobal("window", win)
    vi.stubGlobal("document", {
      createElement: () => ({}),
      head: { appendChild: (node: { src?: string; async?: boolean }) => appended.push(node) },
    })
    return { win, appended }
  }

  it("adds the script once and queues the two calls", () => {
    const { win, appended } = stubBrowser()
    loadImpact()
    loadImpact()
    expect(appended).toHaveLength(1)
    expect(appended[0].src).toBe(IMPACT_SCRIPT_URL)
    expect(win.ire_o).toBe("impactStat")
    const queue = (win.impactStat as unknown as { a: unknown[][] }).a
    expect(queue.map((call) => call[0])).toEqual(["transformLinks", "trackImpression"])
  })
})
