import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

const DEFAULT_DIR = path.join(".openhands", "runtime", "ai-runs")

function safeRunId(value) {
  const candidate = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "")
  return candidate || crypto.randomUUID()
}

export function runStatePath(root = process.cwd(), taskId) {
  return path.join(root, DEFAULT_DIR, `${safeRunId(taskId)}.json`)
}

export function createRunState({ taskId, workspace, gitBranch, pipeline = [] } = {}) {
  const id = safeRunId(taskId)
  return {
    schemaVersion: 1,
    taskId: id,
    workspace: workspace || process.cwd(),
    gitBranch: gitBranch || "unknown",
    pipeline: Array.isArray(pipeline) ? pipeline : [],
    status: "created",
    currentStep: null,
    completedSteps: [],
    retryCount: 0,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function saveRunState(state, root = process.cwd()) {
  const next = { ...state, updatedAt: new Date().toISOString() }
  const target = runStatePath(root, next.taskId)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.tmp-${process.pid}`
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  await fs.rename(temporary, target)
  return next
}

export async function readRunState(taskId, root = process.cwd()) {
  try {
    return JSON.parse(await fs.readFile(runStatePath(root, taskId), "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT") return null
    throw error
  }
}

export async function transitionRun(state, { status, currentStep, completedStep, retry, error } = {}, root = process.cwd()) {
  const completedSteps = completedStep && !state.completedSteps.includes(completedStep)
    ? [...state.completedSteps, completedStep]
    : state.completedSteps
  return saveRunState({
    ...state,
    ...(status ? { status } : {}),
    ...(currentStep === undefined ? {} : { currentStep }),
    completedSteps,
    retryCount: retry ? state.retryCount + 1 : state.retryCount,
    error: error || null,
  }, root)
}

