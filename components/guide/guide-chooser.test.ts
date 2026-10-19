import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const chooserSource = readFileSync(
  resolve(process.cwd(), "components/guide/guide-chooser.tsx"),
  "utf8",
)

describe("GuideChooser", () => {
  it("renders every guide entry, including the service-selection path", () => {
    expect(chooserSource).toContain("{guideIntents.map((entry) => {")
    expect(chooserSource).not.toContain('entry.intent !== "unsure"')
  })
})
