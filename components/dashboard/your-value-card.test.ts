import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(join(process.cwd(), "components/dashboard/your-value-card.tsx"), "utf8")

describe("your value card copy", () => {
  it("promises a saving only after a confirmed switch, never after an offer", () => {
    expect(source).not.toMatch(/показваме едва когато има реална оферта|zeigen wir erst, wenn ein echtes Angebot vorliegt/)
    expect(source).toContain("смяната към по-ниска цена е потвърдена")
    expect(source).toContain("der Wechsel zu einem niedrigeren Preis bestätigt ist")
  })

  it("draws the product name as the wordmark in the heading", () => {
    expect(source).toMatch(/<BrandText text=\{de \? "Was HORIZON für dich im Blick behält" : "Какво HORIZON следи за теб"\} \/>/)
  })
})
