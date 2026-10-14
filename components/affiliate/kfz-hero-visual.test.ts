import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8")

describe("Kfz hero visual", () => {
  const source = read("components/affiliate/kfz-hero-visual.tsx")

  it("draws the vehicle as an inline vector instead of a raster asset", () => {
    expect(source).toContain("<svg")
    expect(source).not.toContain("next/image")
    expect(source).not.toMatch(/\.(png|jpe?g|webp)/)
  })

  it("stays hidden from assistive technology", () => {
    expect(source).toContain('aria-hidden="true"')
    expect(source).toContain('focusable="false"')
    expect(source).not.toMatch(/<svg[^>]*aria-label/)
  })

  it("ships no leftover hero-car raster in the public folder", () => {
    expect(() => read("public/images/kfz-hero-car.png")).toThrow()
  })
})
