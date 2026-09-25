import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The draft export is a user-facing artifact: the downloaded file carries a
 * filename, so that filename is customer-visible branding. A retired product
 * codename leaked into it during migration, so this pins the active brand in the
 * one route that sets a download name.
 */
const route = readFileSync(
  join(process.cwd(), "app/api/office/drafts/[id]/export/route.ts"),
  "utf8",
)

describe("draft export filename branding", () => {
  it("does not ship a retired codename in the download name", () => {
    expect(route).not.toContain("kintex-draft")
    expect(route.toLowerCase()).not.toContain("kintex")
  })

  it("names the downloaded file after the active brand", () => {
    expect(route).toContain('filename="HORIZON-by-VZG-draft-v${result.draft.version}.txt"')
  })
})
