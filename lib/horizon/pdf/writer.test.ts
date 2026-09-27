import { describe, expect, it } from "vitest"
import { readTemplateBytes } from "./writer"

describe("registered PDF template boundary", () => {
  it("refuses paths outside public/forms", async () => {
    await expect(readTemplateBytes("package.json")).resolves.toEqual({
      ok: false,
      detail: "template_path_not_registered",
    })
  })

  it("refuses traversal out of public/forms", async () => {
    await expect(readTemplateBytes("public/forms/../../package.json")).resolves.toEqual({
      ok: false,
      detail: "template_path_not_registered",
    })
  })
})
