import test from "node:test"
import assert from "node:assert/strict"
import { hasVisualRequirement, resolveCapabilityFailure, routeTask, structuredVisionResult } from "./ai-router.mjs"

const installed = ["qwen3.5:9b", "gemma4:26b", "deepseek-coder-v2:latest", "qwen2.5-coder:3b", "qwen3-vl:8b"]

test("normal coding task routes to coder", () => {
  assert.equal(routeTask({ task: "implement the upload validation" }, installed).role, "coder")
})

test("image task routes to vision first", () => {
  const route = routeTask({ task: "analyze this screenshot", attachments: [{ name: "screen.png", mimeType: "image/png" }] }, installed)
  assert.deepEqual(route.pipeline, ["vision-scanner"])
})

test("capability failure triggers automatic vision handoff", () => {
  const route = resolveCapabilityFailure({ task: "continue the task", attachments: [{ name: "screen.png", mimeType: "image/png" }] }, installed)
  assert.equal(route.role, "vision-scanner")
  assert.equal(route.requiresVision, true)
})

test("parent continuation pipeline is returned for visual UI implementation", () => {
  const route = routeTask({ task: "fix the UI based on this screenshot", attachments: [{ name: "screen.png", mimeType: "image/png" }] }, installed)
  assert.deepEqual(route.pipeline, ["coder", "vision-scanner", "coder"])
})

test("ordinary text task does not invoke vision", () => {
  assert.equal(hasVisualRequirement({ task: "explain this TypeScript function" }), false)
  assert.equal(routeTask({ task: "explain this TypeScript function" }, installed).requiresVision, false)
})

test("missing vision model is a controlled blocker", () => {
  const route = routeTask({ task: "inspect this image", attachments: [{ name: "screen.png", mimeType: "image/png" }] }, installed.filter((model) => model !== "qwen3-vl:8b"))
  assert.equal(route.status, "VISION_BLOCKED")
})

test("vision results are normalized without inventing facts", () => {
  const result = structuredVisionResult('{"handoff":"vision","status":"success","observations":["visible button"],"confidence":0.8}', "screen.png")
  assert.deepEqual(result.observations, ["visible button"])
  assert.deepEqual(result.visible_text, [])
  assert.equal(result.confidence, 0.8)
})
