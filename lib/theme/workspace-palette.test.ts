import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8").replace(/\r\n/g, "\n")

/** Custom property names declared in the first rule whose selector starts with `selector`. */
function tokens(selector: string): Set<string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`rule not found: ${selector}`)
  const open = css.indexOf("{", start)
  const close = css.indexOf("\n}", open)
  return new Set([...css.slice(open, close).matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]))
}

const light = tokens('.kintex-workspace,\n[data-slot="sidebar"][data-mobile="true"] {')
const dark = tokens('.dark .kintex-workspace,\n.dark [data-slot="sidebar"][data-mobile="true"],\n.dark .kintex-workspace .paper {')
const paper = tokens("\n.paper {")

describe("workspace palette", () => {
  it("has a dark value for every token of the light palette", () => {
    const missing = [...light].filter((name) => name !== "--radius" && !dark.has(name))
    expect(missing).toEqual([])
  })

  it("has a dark value for every paper variable, so a dark sheet is never half light", () => {
    const missing = [...paper].filter((name) => name.startsWith("--paper-") && !dark.has(name))
    expect(missing).toEqual([])
  })

  it("keeps the dashboard status tones in both themes", () => {
    const lightTones = tokens("\n.horizon-dashboard {")
    const darkTones = tokens("\n.dark .horizon-dashboard {")
    for (const name of [...lightTones].filter((token) => token.startsWith("--tone-"))) {
      expect(darkTones.has(name), name).toBe(true)
    }
  })
})
