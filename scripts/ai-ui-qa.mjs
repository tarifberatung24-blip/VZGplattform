import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"
import { chromium } from "playwright"
import { runVisionComparison } from "./ai-router.mjs"

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
}

function parseArgs(args) {
  const result = { viewport: "all", maxIterations: 2, cwd: process.cwd(), start: true, fixCommand: "" }
  const task = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--url") result.url = args[++index]
    else if (arg === "--reference") result.reference = args[++index]
    else if (arg === "--requirements") result.requirements = args[++index]
    else if (arg === "--viewport") result.viewport = args[++index]
    else if (arg === "--max-iterations") result.maxIterations = Math.min(4, Math.max(1, Number(args[++index])))
    else if (arg === "--cwd") result.cwd = args[++index]
    else if (arg === "--fix-command") result.fixCommand = args[++index]
    else if (arg === "--no-start") result.start = false
    else task.push(arg)
  }
  result.requirements = result.requirements || task.join(" ").trim()
  return result
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "manual" })
    return { ok: response.status >= 200 && response.status < 500, status: response.status }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function startLocalApp(cwd) {
  const isWindows = process.platform === "win32"
  const command = isWindows ? (process.env.ComSpec || "cmd.exe") : "pnpm"
  const args = isWindows ? ["/d", "/s", "/c", "pnpm dev --hostname 127.0.0.1"] : ["dev", "--hostname", "127.0.0.1"]
  const child = spawn(command, args, { cwd, detached: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
  let log = ""
  const collect = (chunk) => { log = `${log}${chunk.toString()}`.slice(-4000) }
  child.stdout?.on("data", collect)
  child.stderr?.on("data", collect)
  return { child, getLog: () => log }
}

async function waitForUrl(url, timeoutMs = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const result = await probe(url)
    if (result.ok) return result
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return probe(url)
}

async function launchBrowser() {
  const errors = []
  for (const options of [{ channel: "chrome" }, { channel: "msedge" }, {}]) {
    try { return await chromium.launch({ ...options, headless: true }) } catch (error) { errors.push(error instanceof Error ? error.message : String(error)) }
  }
  throw new Error(`No Chromium-compatible browser found. ${errors.join(" | ")}`)
}

async function waitForVisualStability(page) {
  await page.waitForLoadState("domcontentloaded")
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
    for (const image of Array.from(document.images)) {
      if (!image.complete) await new Promise((resolve) => { image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true }) })
    }
  })
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }" }).catch(() => {})
  await page.waitForTimeout(500)
}

async function readBase64(filePath) {
  return (await fs.readFile(filePath)).toString("base64")
}

async function resizeImageBase64(page, value, mimeType = "image/png", maxSide = 1024) {
  return page.evaluate(async ({ value: encoded, mimeType: type, max }) => {
    const image = new Image()
    image.src = `data:${type};base64,${encoded}`
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.82).split(",")[1]
  }, { value, mimeType, max: maxSide })
}

async function runFixCommand(command, payload, cwd) {
  if (!command) return { status: "not-configured" }
  const defectsPath = path.join(payload.artifactDir, `iteration-${payload.iteration}-defects.json`)
  await fs.writeFile(defectsPath, JSON.stringify(payload, null, 2), "utf8")
  return new Promise((resolve) => {
    const child = spawn(command, [], { cwd, shell: true, env: { ...process.env, AI_UI_QA_DEFECTS_FILE: defectsPath, AI_UI_QA_ITERATION: String(payload.iteration) }, stdio: "inherit", windowsHide: true })
    child.once("exit", (code) => resolve({ status: code === 0 ? "applied" : "failed", code, defectsPath }))
  })
}

export async function runUiQa(options) {
  if (!options?.url) throw new Error("UI QA requires --url")
  const viewNames = options.viewport === "all" ? Object.keys(VIEWPORTS) : [options.viewport]
  for (const name of viewNames) if (!VIEWPORTS[name]) throw new Error(`Unknown viewport: ${name}`)
  const artifactDir = options.artifactDir || await fs.mkdtemp(path.join(os.tmpdir(), "vzg-ui-qa-"))
    const referenceBase64 = options.reference ? await readBase64(options.reference) : ""
  let appProcess = null
  let browser = null
  const iterations = []
  try {
    let target = await probe(options.url)
    if (!target.ok && options.start) {
      const started = startLocalApp(options.cwd || process.cwd())
      appProcess = started.child
      target = await waitForUrl(options.url)
      if (!target.ok) target.startLog = started.getLog()
    }
    if (!target.ok) return { status: "blocked", reason: "target-url-unavailable", target, artifactDir, iterations }
    browser = await launchBrowser()
    const context = await browser.newContext({ deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" })
    try {
      const maxIterations = Math.min(2, Math.max(1, options.maxIterations || 2))
      const transformPage = await context.newPage()
      const referenceMime = /\.jpe?g$/i.test(options.reference || "") ? "image/jpeg" : "image/png"
      const compactReference = referenceBase64 ? await resizeImageBase64(transformPage, referenceBase64, referenceMime) : ""
      await transformPage.close()
      for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        const passResults = []
        for (const viewportName of viewNames) {
          const viewport = VIEWPORTS[viewportName]
          const page = await context.newPage()
          await page.setViewportSize(viewport)
          await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 60000 })
          await waitForVisualStability(page)
          const overflow = await page.evaluate(() => ({ horizontal: document.documentElement.scrollWidth > window.innerWidth + 1, vertical: document.documentElement.scrollHeight > window.innerHeight + 1 }))
          const screenshotPath = path.join(artifactDir, `iteration-${iteration}-${viewportName}.png`)
          await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" })
          const currentBase64 = await readBase64(screenshotPath)
          const compactCurrent = await resizeImageBase64(page, currentBase64, "image/png")
          const comparison = await runVisionComparison({ task: options.requirements || "Perform visual QA against the reference.", referenceBase64: compactReference, currentBase64: compactCurrent, source: screenshotPath, timeoutMs: Number(process.env.AI_MODEL_TIMEOUT_MS || 90000) })
          if (overflow.horizontal) comparison.overflow_clipping = [...comparison.overflow_clipping, "Horizontal document overflow exceeds viewport width."]
          passResults.push({ viewport: viewportName, dimensions: viewport, screenshotPath, overflow, comparison })
          await page.close()
        }
        const failed = passResults.some((item) => item.comparison.status !== "pass")
        iterations.push({ iteration, results: passResults, status: failed ? "fail" : "pass" })
        if (!failed) return { status: "pass", artifactDir, iterations }
        if (iteration >= maxIterations) break
        let coderHandoff = null
        if (typeof options.onDefects === "function") coderHandoff = await options.onDefects({ iteration, artifactDir, requirements: options.requirements, results: passResults })
        const fix = await runFixCommand(options.fixCommand, { iteration, artifactDir, requirements: options.requirements, results: passResults }, options.cwd || process.cwd())
        if (fix.status !== "applied" && !coderHandoff) return { status: "fail", artifactDir, iterations, fix }
        iterations[iterations.length - 1].coderHandoff = coderHandoff ? { status: "success", report: coderHandoff } : null
      }
      return { status: "fail", artifactDir, iterations }
    } finally { await context.close() }
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (appProcess) appProcess.kill()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const result = await runUiQa(options)
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.status === "pass" ? 0 : 2
}

if (process.argv[1]?.endsWith("ai-ui-qa.mjs")) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
