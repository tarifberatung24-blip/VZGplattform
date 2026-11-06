import { describe, expect, it } from "vitest"
import { businessProfileInputSchema } from "./validation"

const valid = { business_name: "Musterbetrieb", legal_form: "einzelunternehmen", industry: "Handwerk" }

describe("businessProfileInputSchema", () => {
  it("accepts the minimum valid business identity", () => {
    expect(businessProfileInputSchema.safeParse(valid).success).toBe(true)
  })
  it("normalizes blank optional text to null", () => {
    const result = businessProfileInputSchema.safeParse({ ...valid, vat_id: "  " })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.vat_id).toBeNull()
  })
  it("rejects unknown fields and invalid legal forms", () => {
    expect(businessProfileInputSchema.safeParse({ ...valid, admin: true }).success).toBe(false)
    expect(businessProfileInputSchema.safeParse({ ...valid, legal_form: "trust" }).success).toBe(false)
  })
  it("rejects impossible employee counts and oversized lists", () => {
    expect(businessProfileInputSchema.safeParse({ ...valid, employee_count: -1 }).success).toBe(false)
    expect(businessProfileInputSchema.safeParse({ ...valid, business_goals: Array(7).fill("grow") }).success).toBe(false)
  })
})
