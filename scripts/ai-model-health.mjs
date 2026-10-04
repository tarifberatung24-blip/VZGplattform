import fs from "node:fs/promises"
import process from "node:process"

const configPath = new URL("../config/ai/local-models.json", import.meta.url)
const config = JSON.parse(await fs.readFile(configPath, "utf8"))
const baseUrl = process.env.AI_OLLAMA_URL || config.baseUrl
const timeoutMs = Number(process.env.AI_MODEL_TIMEOUT_MS || 30000)

function timeoutSignal() {
  return AbortSignal.timeout(timeoutMs)
}

async function getInstalled() {
  const response = await fetch(`${baseUrl}/api/tags`, { signal: timeoutSignal() })
  if (!response.ok) throw new Error(`Ollama tags request failed: HTTP ${response.status}`)
  const body = await response.json()
  return new Set((body.models || []).map((model) => model.name))
}

async function probe(entry, installed) {
  if (!installed.has(entry.model)) return { ...entry, status: "missing" }
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: timeoutSignal(),
      body: JSON.stringify({
        model: entry.model,
        stream: false,
        think: false,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: entry.system },
          { role: "user", content: "Health check. Respond with exactly OK." }
        ]
      })
    })
    if (!response.ok) return { ...entry, status: "unhealthy", error: `HTTP ${response.status}` }
    const body = await response.json()
    const content = body.message?.content?.trim() || ""
    return { ...entry, status: content ? "healthy" : "unhealthy", response: content.slice(0, 80) }
  } catch (error) {
    return { ...entry, status: "unhealthy", error: error instanceof Error ? error.message : String(error) }
  }
}

try {
  const installed = await getInstalled()
  const results = []
  for (const entry of config.models) results.push(await probe(entry, installed))
  const summary = {
    provider: config.provider,
    baseUrl,
    healthy: results.filter((item) => item.status === "healthy").length,
    missing: results.filter((item) => item.status === "missing").length,
    unhealthy: results.filter((item) => item.status === "unhealthy").length,
    models: results
  }
  console.log(JSON.stringify(summary, null, 2))
  process.exitCode = summary.healthy > 0 && summary.unhealthy === 0 ? 0 : 1
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
