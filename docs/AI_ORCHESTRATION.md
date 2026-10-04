# Multi-model and connector orchestration

The repository now contains 32 project-local skills: 10 foundation skills and 22 orchestration, connector, safety, and operations skills. They describe reusable behavior; they do not create provider accounts, API keys, MCP sessions, or production permissions.

Provider selection uses a local-first policy. Ollama is attempted before cloud providers. If the local call fails or times out, the router may use Gemini for visual inputs or OpenRouter for text only when `AI_ALLOW_CLOUD_FALLBACK=true` is present in the environment. The default is false so personal documents are not sent to a cloud provider accidentally.

## Safe parallel model pattern

```text
task envelope
    -> independent read-only workers
    -> normalized evidence packets
    -> disagreement / provenance review
    -> one coordinator
    -> one writer on an isolated branch
    -> tests and release gate
```

All configured models may participate when the host supplies them and their data policies permit the task. “All models at once” is not a safe default: models may have different context, tools, cost, latency, and permissions. The coordinator must record which workers actually ran and must not claim a quorum when a worker timed out or was unavailable.

Parallel writers are prohibited for the same module. External writes, connector mutations, deployments, account changes, and messages require the existing approval boundaries.

## Automatic routing and vision handoff

Use `pnpm ai:route "task"` for the automatic path. Add `--image <path>` or `--image-data <base64>` when an image is attached. The router detects visual terms, image/PDF attachments, and model capability errors before assignment. It routes ordinary code to the coder, simple code to the fast coder, planning to the planner, architecture to the strongest installed reasoning worker, review to the reviewer, and visual work to `vision-scanner` using local `qwen3-vl:8b`.

For UI implementation with a visual input, the pipeline is `coder -> vision-scanner -> coder`. The vision worker returns a structured handoff and the final coder receives the original request, workspace, branch, task ID, initial report, and visual findings. If the vision model is unavailable, the router returns `VISION_BLOCKED`; it never fabricates inspection and never silently falls back to a text-only worker.

Each router run also writes a local redacted journal under `.openhands/runtime/ai-runs/`. It stores only task ID, workspace, branch, pipeline, current step, completed steps, retry count, timestamps, and controlled error status. Prompts, document contents, images, tokens, and provider responses are never persisted there.

## Browser visual QA

`pnpm ai:ui-qa --url http://localhost:3000/bg --reference <reference.png> --requirements "..."` starts or detects the local app, opens the real page with Playwright, captures deterministic desktop/tablet/mobile screenshots, and sends the reference plus current screenshot to the local vision worker. It supports up to four passes and writes defect payloads for an optional `--fix-command` hook through `AI_UI_QA_DEFECTS_FILE`. Without an authoritative reference, the runner refuses to claim visual PASS. The router can invoke the same runner automatically when `--url` is supplied for a UI implementation task.

## Connector and plugin contract

Before activation, every connector or plugin needs:

- provider and pinned version;
- read/write capabilities and least-privilege scopes;
- data classes it may receive;
- authentication and secret storage mechanism;
- timeout, retry, rate-limit, and rollback behavior;
- owner, approval boundary, and smoke test;
- disable path and evidence that secrets are not logged.

The registry is intentionally declarative until a concrete provider is selected. Do not add guessed credentials, arbitrary MCP endpoints, or unreviewed plugins to the repository.

## Current additions

The 22 additional skills are:

`horizon-multi-model-orchestrator`, `horizon-model-routing`, `horizon-consensus-review`, `horizon-connector-registry`, `horizon-plugin-lifecycle`, `horizon-mcp-operations`, `horizon-permission-boundary`, `horizon-parallel-work`, `horizon-task-decomposition`, `horizon-test-generation`, `horizon-api-contracts`, `horizon-data-redaction`, `horizon-observability`, `horizon-cost-latency`, `horizon-retry-resilience`, `horizon-browser-agent`, `horizon-supabase-audit`, `horizon-render-ops`, `horizon-accessibility`, `horizon-performance`, `horizon-incident-response`, and `horizon-knowledge-retrieval`.
