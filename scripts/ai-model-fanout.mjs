import fs from "node:fs/promises"
import process from "node:process"

const task = process.argv.slice(2).join(" ").trim()
if (!task) {
  console.error("Usage: node scripts/ai-model-fanout.mjs <task>")
  process.exit(2)
}

const config = JSON.parse(await fs.readFile(new URL("../config/ai/local-models.json", import.meta.url), "utf8"))
const baseUrl = process.env.AI_OLLAMA_URL || config.baseUrl
const timeoutMs = Number(process.env.AI_MODEL_TIMEOUT_MS || 120000)
const maxConcurrency = Math.max(1, Number(process.env.AI_MAX_CONCURRENCY || 2))

const installedResponse = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(30000) })
if (!installedResponse.ok) throw new Error(`Ollama tags request failed: HTTP ${installedResponse.status}`)
const installed = new Set((await installedResponse.json()).models?.map((model) => model.name) || [])
const workers = config.models.filter((entry) => installed.has(entry.model))

async function run(entry) {
  const started = Date.now()
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: entry.model,
        stream: false,
        think: false,
        options: { temperature: 0.1 },
        messages: [
          { role: "system", content: entry.system },
          { role: "user", content: `Return a concise evidence-based worker report for this task:\n\n${task}` }
        ]
      })
    })
    if (!response.ok) return { id: entry.id, model: entry.model, status: "failed", error: `HTTP ${response.status}` }
    const body = await response.json()
    return {
      id: entry.id,
      model: entry.model,
      purpose: entry.purpose,
      status: "ok",
      elapsedMs: Date.now() - started,
      report: body.message?.content || ""
    }
  } catch (error) {
    return {
      id: entry.id,
      model: entry.model,
      status: "failed",
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

const results = []
let cursor = 0
async function worker() {
  while (cursor < workers.length) {
    const entry = workers[cursor++]
    results.push(await run(entry))
  }
}
await Promise.all(Array.from({ length: Math.min(maxConcurrency, workers.length) }, worker))

console.log(JSON.stringify({
  task,
  provider: config.provider,
  requestedWorkers: config.models.length,
  availableWorkers: workers.length,
  maxConcurrency,
  note: "Reports are independent evidence packets. A coordinator must review disagreement before any write.",
  results
}, null, 2))
