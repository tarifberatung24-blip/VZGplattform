import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createRunState, readRunState, transitionRun } from "./ai-run-state.mjs"

test("run journal persists safe progress and does not require prompt content", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "vzg-ai-run-"))
  let state = createRunState({ taskId: "task-1", workspace: root, gitBranch: "test", pipeline: ["coder", "vision-scanner", "coder"] })
  state = await transitionRun(state, { status: "running", currentStep: "coder" }, root)
  state = await transitionRun(state, { completedStep: "coder", currentStep: "vision-scanner" }, root)
  const persisted = await readRunState("task-1", root)
  assert.equal(persisted.status, "running")
  assert.equal(persisted.currentStep, "vision-scanner")
  assert.deepEqual(persisted.completedSteps, ["coder"])
  assert.equal("prompt" in persisted, false)
})

