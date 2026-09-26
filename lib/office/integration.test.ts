import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

/**
 * N7 removed the VZGoffice *pages* (`/{locale}/office`, its case detail) and their client
 * workspace, redirecting the routes to the HORIZON guide. The namespaced API surface is backend,
 * not navigation, so it stays: other HORIZON surfaces read and write through it.
 */
describe("VZGoffice module integration", () => {
  it("keeps the namespaced Office API routes", () => {
    const routes = [
      "app/api/office/cases/route.ts",
      "app/api/office/cases/[id]/workflow/route.ts",
      "app/api/office/documents/[id]/signed-url/route.ts",
      "app/api/office/drafts/[id]/approve/route.ts",
    ]
    for (const route of routes) expect(existsSync(path.join(root, route))).toBe(true)
  })

  it("keeps Office API calls isolated from platform API paths", () => {
    const cases = read("app/api/office/cases/route.ts")
    expect(cases).toContain("@/lib/office/repositories/cases")
    expect(cases).not.toContain("@/lib/horizon/")
  })

  it("no longer ships the Office pages that N7 redirected", () => {
    for (const route of ["app/[locale]/office/page.tsx", "app/[locale]/office/cases/[id]/page.tsx", "components/office/case-workspace.tsx"]) {
      expect(existsSync(path.join(root, route))).toBe(false)
    }
  })

  it("externalizes native OCR packages", () => {
    expect(read("next.config.mjs")).toContain('"@napi-rs/canvas"')
  })
})
