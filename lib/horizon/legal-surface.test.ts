import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("P1 legal surface regressions", () => {
  it("keeps Impressum server-safe and locale-aware", () => {
    const source = read("app/impressum/page.tsx")
    expect(source).not.toContain('useLanguage')
    expect(source).toContain('headers')
    expect(source).toContain('x-locale')
    expect(source).toContain('Tarifberater24')
  })

  it("does not present n8n as an active public processor", () => {
    const products = read("components/marketing/product-opportunity-board.tsx")
    const modules = read("components/finance/module-page.tsx")
    const roadmap = read("lib/kintex-smart-dashboard.ts")
    expect(products).not.toContain("n8n Workflow")
    expect(modules).not.toContain("n8n workflow подрежда")
    expect(roadmap).not.toContain('title: "n8n Intake Workflow", status: "ACTIVE"')
  })

  it("keeps legal pages bilingual and canonical branding visible", () => {
    const legal = read("components/marketing/legal-page.tsx")
    const layout = read("app/layout.tsx")
    const request = read("components/marketing/service-request-wizard.tsx")
    const zayavka = read("app/zayavka/page.tsx")

    expect(legal).toContain('introBg: "Условия за използване на платформата HORIZON от частни потребители."')
    expect(legal).toContain('introBg: "Прозрачност за препоръки и външни партньорски предложения."')
    expect(legal).toContain('introBg: "Информация за договори с HORIZON by VZG и за външни партньорски предложения."')
    expect(layout).not.toContain("https://finanzberaterbg.de")
    expect(request).not.toContain("FinanzBG Angebotsdesk")
    expect(zayavka).not.toContain("Заявка за оферта | FinanzBG")
  })

  it("keeps footer legal links localized", () => {
    const footer = read("components/layout/global-footer.tsx")
    expect(footer).toContain("localizedPath(link.href, locale)")
  })
})
