import { describe, expect, it } from "vitest"
import { emptyCanonicalTaxReturn } from "@/lib/canonical-tax-model"
import { getPdfReadiness, getSelectedFormStatus } from "@/lib/tax-pipeline"

describe("tax PDF readiness", () => {
  it("uses the verified HORIZON PDF mappings instead of a permanent blocked flag", () => {
    const canonical = emptyCanonicalTaxReturn()
    const readiness = getPdfReadiness(canonical)

    expect(readiness.status).toBe("READY_FOR_USER_USE")
    expect(readiness.issues).toEqual([])
    expect(readiness.forms[0]).toMatchObject({
      identifier: "034037_25",
      templateId: "fms-2025-est-1-a",
      mappingStatus: "FIELD_MAPPING_VERIFIED",
      fillable: true,
    })
  })

  it("blocks an unknown or unmapped form rather than pretending it is fillable", () => {
    const canonical = emptyCanonicalTaxReturn()
    canonical.selectedForms = ["unknown-form"]
    const readiness = getPdfReadiness(canonical)
    expect(readiness.status).toBe("BLOCKED")
    expect(readiness.issues[0]?.code).toBe("PDF_MAPPING_UNAVAILABLE")
  })

  it("reports verified mapping state for every supported 2025 selected form", () => {
    const forms = getSelectedFormStatus(["034037_25", "034025_25", "034027d_25"])
    expect(forms.every((form) => form.fillable)).toBe(true)
    expect(forms.every((form) => form.mappingStatus === "FIELD_MAPPING_VERIFIED")).toBe(true)
  })
})
