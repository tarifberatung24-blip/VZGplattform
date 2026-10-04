import crypto from "node:crypto"
import fs from "node:fs/promises"
import process from "node:process"
import { execFileSync } from "node:child_process"
import { createRunState, saveRunState, transitionRun } from "./ai-run-state.mjs"

const config = JSON.parse(await fs.readFile(new URL("../config/ai/local-models.json", import.meta.url), "utf8"))

const VISUAL_TERMS = /(?:image|photo|picture|screenshot|screen shot|png|jpg|jpeg|webp|scanned?\s+pdf|pdf\s+page|ocr|visual|look at|what is visible|compare (?:this )?screenshot|match (?:this )?screenshot|layout comparison|design reference|implement (?:this )?design|make (?:the )?(?:site|page|ui) look like|compare ui|diagram|visual qa|ui screenshot)/i
const CAPABILITY_FAILURE = /(?:does not support image understanding|model does not support images|vision unsupported|cannot process image|unsupported image input|image input.*unsupported|vision.*(?:unavailable|unsupported))/i
const CODE_TERMS = /(?:code|coding|implement|implementation|debug|bug|fix|refactor|function|route|component|typescript|javascript|sql|test)/i
const FAST_TERMS = /(?:simple|small|quick|minor|rename|typo|one[- ]line|format|trivial)/i
const PLAN_TERMS = /(?:plan|planning|roadmap|decompose|reason|explain|strategy|steps)/i
const ARCH_TERMS = /(?:architecture|architectural|design system|trade[- ]off|boundary|scalab|schema design)/i
const REVIEW_TERMS = /(?:review|validate|validation|audit|check|inspect|quality|regression)/i
const UI_TERMS = /(?:ui|ux|frontend|front[- ]end|homepage|dashboard|responsive|accessibility|layout|visual|design reference|web design)/i

function modelById(id) {
  return config.models.find((entry) => entry.id === id) || null
}

function installedModelSet(installedModels = []) {
  return new Set(installedModels)
}

function cloudFallbackAllowed() {
  return process.env.AI_ALLOW_CLOUD_FALLBACK === "true"
}

export function hasVisualRequirement(request = {}) {
  const task = String(request.task || "")
  const attachments = Array.isArray(request.attachments) ? request.attachments : []
  return attachments.some((item) => {
    const value = `${item.mimeType || ""} ${item.name || ""} ${item.path || ""}`
    return /image\/(png|jpe?g|webp)/i.test(value) || /\.(png|jpe?g|webp|pdf)$/i.test(value)
  }) || VISUAL_TERMS.test(task) || CAPABILITY_FAILURE.test(String(request.capabilityError || request.priorError || ""))
}

export function routeTask(request = {}, installedModels = []) {
  const task = String(request.task || "")
  const visual = hasVisualRequirement(request)
  const ui = UI_TERMS.test(task)
  const installed = installedModelSet(installedModels)
  const vision = modelById("vision-scanner")

  if (visual && !installed.has(vision?.model) && !(cloudFallbackAllowed() && process.env.GEMINI_API_KEY)) {
    return {
      status: "VISION_BLOCKED",
      reason: "qwen3-vl:8b is not installed or unavailable",
      requiresVision: true,
      role: "vision-scanner",
      model: vision?.model || "qwen3-vl:8b",
      pipeline: []
    }
  }

  if (visual) {
    const visualRole = { role: "vision-scanner", model: vision.model }
    if (ui && (CODE_TERMS.test(task) || /implement|fix|build|create/i.test(task))) {
      return { status: "routed", requiresVision: true, role: "vision-scanner", model: vision.model, pipeline: ["coder", "vision-scanner", "coder"] }
    }
    return { status: "routed", requiresVision: true, ...visualRole, pipeline: ["vision-scanner"] }
  }

  if (FAST_TERMS.test(task) && CODE_TERMS.test(task)) return { status: "routed", requiresVision: false, role: "fast-coder", model: modelById("fast-coder").model, pipeline: ["fast-coder"] }
  if (CODE_TERMS.test(task)) return { status: "routed", requiresVision: false, role: "coder", model: modelById("coder").model, pipeline: ["coder"] }
  if (ARCH_TERMS.test(task)) {
    const preferred = ["architect", "planner"].map(modelById).find((entry) => installed.has(entry?.model)) || modelById("architect")
    return { status: "routed", requiresVision: false, role: preferred.id, model: preferred.model, pipeline: [preferred.id] }
  }
  if (REVIEW_TERMS.test(task)) return { status: "routed", requiresVision: false, role: "reviewer", model: modelById("reviewer").model, pipeline: ["reviewer"] }
  if (PLAN_TERMS.test(task)) return { status: "routed", requiresVision: false, role: "planner", model: modelById("planner").model, pipeline: ["planner"] }
  return { status: "routed", requiresVision: false, role: "planner", model: modelById("planner").model, pipeline: ["planner"] }
}

export function structuredVisionResult(value, source = "unknown") {
  let parsed = value
  if (typeof value === "string") {
    const candidate = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] || value
    try { parsed = JSON.parse(candidate) } catch { return { handoff: "vision", status: "invalid-structured-result", source, observations: [], visible_text: [], layout_findings: [], ui_issues: [], recommended_actions: [], confidence: 0 } }
  }
  const result = parsed && typeof parsed === "object" ? parsed : {}
  return {
    handoff: "vision",
    status: result.status === "success" ? "success" : "invalid-structured-result",
    source: result.source || source,
    observations: Array.isArray(result.observations) ? result.observations : [],
    visible_text: Array.isArray(result.visible_text) ? result.visible_text : [],
    layout_findings: Array.isArray(result.layout_findings) ? result.layout_findings : [],
    ui_issues: Array.isArray(result.ui_issues) ? result.ui_issues : [],
    recommended_actions: Array.isArray(result.recommended_actions) ? result.recommended_actions : [],
    confidence: typeof result.confidence === "number" ? Math.max(0, Math.min(1, result.confidence)) : 0
  }
}

function parseModelJson(value) {
  if (typeof value !== "string") return value
  const candidate = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] || value
  try { return JSON.parse(candidate) } catch { return null }
}

export function structuredVisualComparison(value, source = "unknown") {
  const result = parseModelJson(value)
  if (!result || typeof result !== "object") {
    return {
      status: "fail",
      source,
      similarity_assessment: "The vision worker did not return valid structured comparison JSON.",
      layout: [], spacing: [], typography: [], colors: [], missing_elements: [], incorrect_elements: [],
      overflow_clipping: [], responsive_issues: [], priority_fixes: ["Repeat visual comparison with a valid structured response."]
    }
  }
  return {
    status: result.status === "pass" ? "pass" : "fail",
    source: result.source || source,
    similarity_assessment: typeof result.similarity_assessment === "string" ? result.similarity_assessment : "",
    layout: Array.isArray(result.layout) ? result.layout : [],
    spacing: Array.isArray(result.spacing) ? result.spacing : [],
    typography: Array.isArray(result.typography) ? result.typography : [],
    colors: Array.isArray(result.colors) ? result.colors : [],
    missing_elements: Array.isArray(result.missing_elements) ? result.missing_elements : [],
    incorrect_elements: Array.isArray(result.incorrect_elements) ? result.incorrect_elements : [],
    overflow_clipping: Array.isArray(result.overflow_clipping) ? result.overflow_clipping : [],
    responsive_issues: Array.isArray(result.responsive_issues) ? result.responsive_issues : [],
    priority_fixes: Array.isArray(result.priority_fixes) ? result.priority_fixes : []
  }
}

export function resolveCapabilityFailure(request, installedModels) {
  return routeTask({ ...request, capabilityError: request.capabilityError || "model does not support image understanding" }, installedModels)
}

export function isVisionCapabilityError(error) {
  return CAPABILITY_FAILURE.test(String(error?.message || error || ""))
}

async function installedModels(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Ollama tags request failed: HTTP ${response.status}`)
  return (await response.json()).models?.map((item) => item.name) || []
}

async function imagePayload(attachment) {
  if (attachment.data) return attachment.data.replace(/^data:image\/(?:png|jpe?g|webp);base64,/i, "")
  if (!attachment.path) throw new Error("visual attachment needs path or data")
  if (/\.pdf$/i.test(attachment.path)) throw new Error("PDF input must be rasterized to an image page before vision handoff")
  return (await fs.readFile(attachment.path)).toString("base64")
}

function mimeFor(attachment) {
  if (attachment.mimeType) return attachment.mimeType
  if (/\.jpe?g$/i.test(attachment.path || "")) return "image/jpeg"
  if (/\.webp$/i.test(attachment.path || "")) return "image/webp"
  return "image/png"
}

async function callModel(entry, userContent, images = [], timeoutMs = 120000, baseUrl = process.env.AI_OLLAMA_URL || config.baseUrl, requestOptions = {}) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: entry.model,
      stream: false,
      think: false,
      keep_alive: "10m",
      ...(requestOptions.json ? { format: "json" } : {}),
      options: { temperature: 0.1, num_ctx: 4096, num_batch: 512, num_thread: 12, num_predict: requestOptions.json ? 64 : 320 },
      messages: [{ role: "system", content: entry.system }, { role: "user", content: userContent, ...(images.length ? { images } : {}) }]
    })
  })
  if (!response.ok) throw new Error(`model ${entry.model} failed: HTTP ${response.status}`)
  return (await response.json()).message?.content || ""
}

async function callGeminiVision({ task, referenceBase64, currentBase64, timeoutMs }) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [
        { text: task },
        { inline_data: { mime_type: "image/png", data: referenceBase64 } },
        { inline_data: { mime_type: "image/jpeg", data: currentBase64 } }
      ] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 256, temperature: 0 }
    })
  })
  if (!response.ok) throw new Error(`Gemini vision failed: HTTP ${response.status}`)
  const payload = await response.json()
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || ""
}

async function callGeminiAttachment({ task, images, timeoutMs }) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [
        { text: task },
        ...images.map((data) => ({ inline_data: { mime_type: "image/png", data } }))
      ] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 512, temperature: 0 }
    })
  })
  if (!response.ok) throw new Error(`Gemini vision failed: HTTP ${response.status}`)
  const payload = await response.json()
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || ""
}

async function callOpenRouter(entry, userContent, timeoutMs) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://horizon.vzg-consult.de",
      "X-Title": "HORIZON by VZG"
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || entry.model,
      temperature: 0.1,
      messages: [{ role: "system", content: entry.system }, { role: "user", content: userContent }]
    })
  })
  if (!response.ok) throw new Error(`OpenRouter failed: HTTP ${response.status}`)
  return (await response.json()).choices?.[0]?.message?.content || ""
}

async function callRoutedModel(entry, userContent, images = [], timeoutMs = 120000, baseUrl, requestOptions = {}) {
  try {
    return await callModel(entry, userContent, images, timeoutMs, baseUrl, requestOptions)
  } catch (localError) {
    if (!cloudFallbackAllowed()) throw localError
    if (images.length && process.env.GEMINI_API_KEY) {
      return callGeminiAttachment({ task: userContent, images, timeoutMs })
    }
    if (!images.length && process.env.OPENROUTER_API_KEY) {
      return callOpenRouter(entry, userContent, timeoutMs)
    }
    throw localError
  }
}

export async function runVisionComparison({ task, referenceBase64, currentBase64, source = "ui-qa", baseUrl = process.env.AI_OLLAMA_URL || config.baseUrl, timeoutMs = 90000 }) {
  let installed = []
  try {
    installed = await installedModels(baseUrl)
  } catch (error) {
    if (!cloudFallbackAllowed() || !process.env.GEMINI_API_KEY) throw error
  }
  const visionEntry = modelById("vision-scanner")
  const candidateModels = [config.visualQaModel, config.visualQaEscalationModel, visionEntry?.model].filter(Boolean)
  const visualQaModel = candidateModels.find((model) => installed.includes(model))
  const visualQaEntry = visionEntry && visualQaModel === visionEntry.model ? visionEntry : { ...visionEntry, model: visualQaModel }
  if (!visionEntry || (!visualQaModel && !(cloudFallbackAllowed() && process.env.GEMINI_API_KEY))) {
    return { status: "VISION_BLOCKED", source, similarity_assessment: `${candidateModels[0] || "vision model"} is not installed or unavailable.`, layout: [], spacing: [], typography: [], colors: [], missing_elements: [], incorrect_elements: [], overflow_clipping: [], responsive_issues: [], priority_fixes: [] }
  }
  if (!referenceBase64) {
    return { status: "fail", source, similarity_assessment: "No authoritative reference image was supplied; visual match cannot be claimed.", layout: [], spacing: [], typography: [], colors: [], missing_elements: [], incorrect_elements: [], overflow_clipping: [], responsive_issues: [], priority_fixes: ["Provide the authoritative reference screenshot."] }
  }
  const prompt = `Return only compact valid JSON. Compare image 1 (reference) with image 2 (current) for: ${task}. List only concrete visible defects, with pixel or relative estimates when possible. Schema: {"status":"pass|fail","similarity_assessment":"...","layout":[],"spacing":[],"typography":[],"colors":[],"missing_elements":[],"incorrect_elements":[],"overflow_clipping":[],"responsive_issues":[],"priority_fixes":[]}. No material defects means pass.`
  if (visualQaModel) {
    try {
      const raw = await callModel(visualQaEntry, prompt, [referenceBase64, currentBase64], timeoutMs, baseUrl, { json: true })
      return structuredVisualComparison(raw, source)
    } catch (localError) {
      if (!cloudFallbackAllowed() || !process.env.GEMINI_API_KEY) throw localError
    }
  }
  const raw = await callGeminiVision({ task: `${prompt}\n${task}`, referenceBase64, currentBase64, timeoutMs })
  return structuredVisualComparison(raw, source)
}

async function buildRequest(task, imagePaths, imageData) {
  const attachments = imagePaths.map((path) => ({ path, name: path, mimeType: mimeFor({ path }) }))
  if (imageData) attachments.push({ data: imageData, name: "inline-image.png", mimeType: "image/png" })
  return { task, attachments, workspace: process.cwd(), gitBranch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(), taskId: crypto.randomUUID() }
}

async function main() {
  const args = process.argv.slice(2)
  const imagePaths = []
  let imageData = ""
  let uiUrl = ""
  let referencePath = ""
  const taskParts = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--image") imagePaths.push(args[++index])
    else if (args[index] === "--image-data") imageData = args[++index]
    else if (args[index] === "--url") uiUrl = args[++index]
    else if (args[index] === "--reference") referencePath = args[++index]
    else taskParts.push(args[index])
  }
  const request = await buildRequest(taskParts.join(" ").trim(), imagePaths, imageData)
  if (!request.task) throw new Error("Usage: node scripts/ai-router.mjs [--image path|--image-data base64] <task>")
  const baseUrl = process.env.AI_OLLAMA_URL || config.baseUrl
  const modelTimeoutMs = Number(process.env.AI_MODEL_TIMEOUT_MS || 120000)
  let installed = []
  try {
    installed = await installedModels(baseUrl)
  } catch (error) {
    if (!cloudFallbackAllowed()) throw error
  }
  let route = routeTask(request, installed)
  let runState = createRunState({ taskId: request.taskId, workspace: request.workspace, gitBranch: request.gitBranch })
  runState = await saveRunState(runState, request.workspace)
  runState = await transitionRun(runState, { status: route.status === "routed" ? "running" : "blocked", currentStep: route.pipeline[0] || null }, request.workspace)
  runState = await saveRunState({ ...runState, pipeline: route.pipeline }, request.workspace)
  if (route.status === "VISION_BLOCKED") {
    await transitionRun(runState, { status: "blocked", error: route.reason }, request.workspace)
    console.log(JSON.stringify({ request, route, parentContinuation: "VISION_BLOCKED" }, null, 2))
    process.exitCode = 2
    return
  }

  const entries = Object.fromEntries(config.models.map((entry) => [entry.id, entry]))
  const visionEntry = entries["vision-scanner"]
  let visionResult = null
  let initialReport = ""
  const primaryId = route.pipeline[0] === "vision-scanner" ? "vision-scanner" : route.pipeline[0]
  const primary = entries[primaryId]

  if (uiUrl && route.pipeline.length === 3 && route.pipeline[1] === "vision-scanner") {
    const { runUiQa } = await import("./ai-ui-qa.mjs")
    const uiQa = await runUiQa({
      url: uiUrl,
      reference: referencePath,
      requirements: request.task,
      cwd: request.workspace,
      maxIterations: 2,
      onDefects: async (payload) => {
        const continuation = `Continue the SAME parent task in ${request.workspace} on branch ${request.gitBranch}. Apply the concrete visual QA defects below, then return a concise implementation report. Do not ask for a model switch.\nOriginal task: ${request.task}\nTask ID: ${request.taskId}\nStructured visual defects:\n${JSON.stringify(payload.results)}`
        return { status: "success", report: await callRoutedModel(primary, continuation, [], modelTimeoutMs, baseUrl) }
      },
      fixCommand: process.env.AI_UI_QA_FIX_COMMAND || ""
    })
    await transitionRun(runState, { status: uiQa.status === "pass" ? "completed" : "failed", currentStep: null, completedStep: "vision-scanner", error: uiQa.status === "pass" ? null : "visual QA did not pass" }, request.workspace)
    console.log(JSON.stringify({ request, route, uiQa, parentContinuation: uiQa.status === "pass" ? "success" : "visual-qa-failed" }, null, 2))
    process.exitCode = uiQa.status === "pass" ? 0 : 2
    return
  }

  // UI implementation deliberately starts with a text/code pass, then performs
  // visual QA, then sends the findings back to the same implementation role.
  if (route.pipeline.length === 3 && route.pipeline[1] === "vision-scanner") {
    runState = await transitionRun(runState, { currentStep: "coder" }, request.workspace)
    try {
      initialReport = await callRoutedModel(primary, `${request.task}\nA visual input is attached to the parent task, but you are the implementation worker. Plan or implement the non-visual code pass without claiming to have inspected the image.` , [], modelTimeoutMs, baseUrl)
      runState = await transitionRun(runState, { completedStep: "coder", currentStep: "vision-scanner" }, request.workspace)
    } catch (error) {
      if (!isVisionCapabilityError(error)) throw error
      route = resolveCapabilityFailure(request, installed)
      initialReport = ""
    }
  }

  if (route.requiresVision) {
    if (!request.attachments.length) throw new Error("Visual task requires --image path or an attachment data payload")
    const images = await Promise.all(request.attachments.map(imagePayload))
    const prompt = `Return only valid JSON. Analyze the supplied visual input for this original task: ${request.task}. Previous implementation report (may be empty): ${initialReport}. Schema: {"handoff":"vision","status":"success","source":"local-attachment","observations":[],"visible_text":[],"layout_findings":[],"ui_issues":[],"recommended_actions":[],"confidence":0.0}. Do not infer details that are not visible.`
    try {
      visionResult = structuredVisionResult(await callRoutedModel(visionEntry, prompt, images, modelTimeoutMs, baseUrl), request.attachments.map((item) => item.name).join(","))
      runState = await transitionRun(runState, { completedStep: "vision-scanner", currentStep: route.pipeline.length === 3 ? "coder" : null }, request.workspace)
    } catch (error) {
      visionResult = { handoff: "vision", status: "VISION_BLOCKED", source: "local-attachment", observations: [], visible_text: [], layout_findings: [], ui_issues: [], recommended_actions: [], confidence: 0, error: error instanceof Error ? error.message : String(error) }
      await transitionRun(runState, { status: "blocked", error: visionResult.error }, request.workspace)
    }
    if (visionResult.status !== "success" || route.pipeline.length === 1) {
      console.log(JSON.stringify({ request, route, vision: visionResult, parentContinuation: route.pipeline.length === 1 ? "not-needed" : "blocked" }, null, 2))
      process.exitCode = visionResult.status === "success" ? 0 : 2
      return
    }
  }

  const continuation = visionResult ? `Original task: ${request.task}\nWorkspace: ${request.workspace}\nBranch: ${request.gitBranch}\nTask ID: ${request.taskId}\nInitial implementation report:\n${initialReport}\nStructured vision findings:\n${JSON.stringify(visionResult)}\nContinue the original task and apply concrete visual corrections. Do not ask the user to switch models.` : request.task
  const report = await callRoutedModel(primary, continuation, [], modelTimeoutMs, baseUrl)
  await transitionRun(runState, { status: "completed", currentStep: null, completedStep: primaryId }, request.workspace)
  console.log(JSON.stringify({ request, route, vision: visionResult, parentContinuation: "success", report }, null, 2))
}

if (process.argv[1] && process.argv[1].endsWith("ai-router.mjs")) await main()
