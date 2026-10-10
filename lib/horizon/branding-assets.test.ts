import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The PWA manifest and the root metadata are user-visible branding: their icon
 * URLs are shipped to the browser and shown on install. A retired product
 * codename survived in the icon filenames, so this pins the active brand there
 * and asserts every referenced icon actually exists.
 */
const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8")

describe("PWA / metadata icon branding", () => {
  const manifest = read("public/manifest.json")
  const layout = read("app/layout.tsx")

  it("does not ship a retired codename in an icon URL", () => {
    for (const source of [manifest, layout]) expect(source.toLowerCase()).not.toContain("finanzbg")
  })

  it("references HORIZON-branded icons that exist", () => {
    const referenced = [...manifest.matchAll(/\/icons\/[A-Za-z0-9._-]+/g), ...layout.matchAll(/\/icons\/[A-Za-z0-9._-]+/g)].map((match) => match[0])
    expect(referenced.length).toBeGreaterThan(0)
    for (const url of referenced) {
      expect(url).toContain("/icons/horizon-")
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true)
    }
  })
})
