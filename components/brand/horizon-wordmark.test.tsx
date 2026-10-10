import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BrandText, HorizonWordmark } from "./horizon-wordmark"

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>)
const wordmarks = (markup: string) => markup.split('class="horizon-wordmark"').length - 1

describe("HorizonWordmark", () => {
  it("draws the logo letterforms and keeps the word for screen readers and copy", () => {
    const markup = html(<HorizonWordmark />)
    expect(markup).toContain('class="horizon-wordmark"')
    expect(markup).toContain('<span class="sr-only">Horizon</span>')
  })
})

describe("BrandText", () => {
  it("turns every product name into the wordmark", () => {
    const markup = html(<BrandText text="HORIZON liest das Dokument. Danach fragt HORIZON nach." />)
    expect(wordmarks(markup)).toBe(2)
    expect(markup).not.toContain("HORIZON")
  })

  it("drops 'by VZG' in running text", () => {
    const markup = html(<BrandText text="Über HORIZON by VZG" />)
    expect(wordmarks(markup)).toBe(1)
    expect(markup).not.toContain("by VZG")
  })

  it("keeps 'by VZG' in official texts", () => {
    const markup = html(<BrandText official text="HORIZON by VZG ist kein Versicherer." />)
    expect(wordmarks(markup)).toBe(1)
    expect(markup).toContain(" by VZG ist kein Versicherer.")
  })

  it("leaves other words and non-strings alone", () => {
    expect(html(<BrandText text="HORIZONcontrol bleibt Text" />)).toBe("HORIZONcontrol bleibt Text")
    expect(html(<BrandText text={42} />)).toBe("42")
  })
})

describe("wordmark asset", () => {
  it("is the cropped logo without the registration mark and 'by VZG'", () => {
    const png = readFileSync(join(process.cwd(), "public/logo-horizon-wordmark.png"))
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    expect(width / height).toBeCloseTo(929 / 161, 2)
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
    expect(css).toContain("aspect-ratio: 929 / 161;")
  })
})

describe("no raw product name in rendered markup", () => {
  // JSX text that spells the name in the body font. Header logo, footer and
  // official texts use the wordmark too, so nothing is exempt here.
  const files = [
    "components/marketing/animated-hero.tsx",
    "components/layout/global-footer.tsx",
    "components/layout/horizon-sidebar.tsx",
    "components/finance/workspace-shell.tsx",
    "components/finance/dashboard-workspace.tsx",
    "components/finance/contract-center-workspace.tsx",
    "components/marketing/product-opportunity-board.tsx",
    "app/auth/login/page.tsx",
    "app/auth/sign-up/page.tsx",
    "app/not-found.tsx",
  ]

  it.each(files)("%s", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8")
    expect(source).not.toMatch(/>[^<{}]*HORIZON[^<{}]*</)
    expect(source).not.toMatch(/^\s+HORIZON by VZG\s*$/m)
  })
})
