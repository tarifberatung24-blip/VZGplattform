import test from "node:test"
import assert from "node:assert/strict"
import { structuredVisualComparison } from "./ai-router.mjs"

test("visual comparison normalizes a passing structured response", () => {
  const result = structuredVisualComparison(JSON.stringify({ status: "pass", similarity_assessment: "No material defects.", layout: [], priority_fixes: [] }), "current.png")
  assert.equal(result.status, "pass")
  assert.equal(result.source, "current.png")
})

test("visual comparison keeps concrete defect arrays", () => {
  const result = structuredVisualComparison(JSON.stringify({ status: "fail", layout: ["Hero is 80px too far right."], spacing: ["24px gap is 8px too large."], priority_fixes: ["Move hero left by approximately 80px."] }), "current.png")
  assert.equal(result.status, "fail")
  assert.deepEqual(result.layout, ["Hero is 80px too far right."])
  assert.deepEqual(result.priority_fixes, ["Move hero left by approximately 80px."])
})
