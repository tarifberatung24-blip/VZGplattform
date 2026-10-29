import { describe, expect, it } from "vitest"
import { pathAliasTarget, pathAliases } from "./path-aliases"

/**
 * The synonym map exists so that a German word a reader actually types lands on the
 * page that answers it. These tests hold the two properties that make it safe: no
 * entry may point at a path that does not exist, and no entry may point at itself.
 */
describe("path aliases", () => {
  it("never redirects a path to itself", () => {
    for (const [from, to] of Object.entries(pathAliases)) {
      expect(to, `${from} points at itself`).not.toBe(from)
    }
  })

  it("sends every synonym to a real route, never to another synonym", () => {
    for (const [from, to] of Object.entries(pathAliases)) {
      // A chain would resolve in one extra hop and hide a typo in the target, so the
      // target must be a canonical path. Every target here is a real route.
      expect(pathAliases[to], `${from} -> ${to} is itself an alias`).toBeUndefined()
    }
  })

  it("resolves a known synonym and leaves an unknown path alone", () => {
    expect(pathAliasTarget("/buergeramt")).toBe("/contact")
    expect(pathAliasTarget("/anmeldung")).toBe("/ratgeber/anmeldung")
    expect(pathAliasTarget("/not-a-real-path")).toBeNull()
    expect(pathAliasTarget("/")).toBeNull()
  })
})
