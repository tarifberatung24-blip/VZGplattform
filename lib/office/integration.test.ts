import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("VZGoffice module integration", () => {
  it("exposes localized Office pages and namespaced API routes", () => {
    const routes = [
      "app/[locale]/office/page.tsx",
      "app/[locale]/office/cases/[id]/page.tsx",
      "app/api/office/cases/route.ts",
      "app/api/office/cases/[id]/workflow/route.ts",
      "app/api/office/documents/[id]/signed-url/route.ts",
      "app/api/office/drafts/[id]/approve/route.ts",
    ]
    for (const route of routes) expect(existsSync(path.join(root, route))).toBe(true)
  })

  it("keeps Office API calls isolated from platform API paths", () => {
    const page = read("app/[locale]/office/page.tsx")
    const workspace = read("components/office/case-workspace.tsx")
    expect(page).toContain("@/components/office/case-workspace")
    expect(workspace).toContain("/api/office/cases")
    expect(workspace).toContain("/api/office/drafts")
    expect(workspace).not.toContain("/api/cases")
  })

  it("links the module from the authenticated Dashboard and externalizes native OCR packages", () => {
    expect(read("components/dashboard/smart-dashboard-preview.tsx")).toContain("href={`/${locale}/office`}")
    expect(read("next.config.mjs")).toContain('"@napi-rs/canvas"')
  })
})
