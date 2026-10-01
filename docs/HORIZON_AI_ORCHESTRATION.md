# HORIZON AI / Agent Orchestration Contract

Status: **FOUNDATION / FREE-FIRST / NOT YET A PRODUCTION PROVIDER CUTOVER**

This document is subordinate to `docs/HORIZON_MASTER_MAP.md`, `PROJECT_RULES.md`,
`AGENTS.md`, and `AI_WORKFLOW.md`.

## Owner directive: FREE + STRONG first

The routing priority is now explicit:

```text
FREE + STRONG
  -> FREE + FAST
  -> FREE SPECIALIST / MULTIMODAL
  -> TRIAL CREDIT
  -> PAID ONLY WITH EXPLICIT APPROVAL
```

No paid provider is a default. Bedrock/OpenAI are escalation capacity, not the
normal HORIZON route.

### Current free/strong anchor

The existing Groq integration is the shortest path to a strong zero-cost default
because HORIZON already uses `@ai-sdk/groq`.

Target free aliases:

```text
horizon-free-strong      -> Groq openai/gpt-oss-120b
horizon-free-fast        -> Groq openai/gpt-oss-20b
horizon-free-multimodal  -> Groq qwen/qwen3.8-27b
```

The actual model IDs remain configuration, not business logic.

Google Gemini free-tier and OpenRouter free models are secondary free targets for
non-sensitive workloads after adapters and canaries exist. They are not treated
as production-ready merely because they are free.

Cerebras remains useful as an existing specialist adapter, but its publicly
advertised free access is trial credit, so it is not classified as a durable
free primary.

## Scope declaration

- **ACTIVE_PHASE:** cross-phase architecture/governance integration explicitly requested by the owner.
- **ALLOWED_FILES:** AI orchestration policy, AI workflow documentation, environment examples and tests.
- **FROZEN_FILES / SYSTEMS:** Supabase schema/RLS, authentication, production credentials, Render deployment,
  payment systems, existing P1–P17 business logic, provider keys.
- **OUT_OF_SCOPE:** production deploy, schema migration, secret creation, live provider cutover, OpenClaw work.

## 1. Separation of planes

### Product runtime

```text
HORIZON Next.js
  -> HORIZON AI Runtime
  -> FREE-FIRST routing policy
      -> current/free Groq
      -> local self-hosted model when viable
      -> Gemini free target
      -> OpenRouter free target
      -> trial specialist
      -> paid escalation only if owner approved
```

Authentication, RLS, deterministic calculations, user approvals and execution
remain application responsibilities. A model is never allowed to grant itself
authority.

### Engineering agents

```text
Owner / ChatGPT
  -> OpenHands focused implementation worker
  -> GitHub branch / PR / CI
  -> owner review
  -> merge/deploy only when explicitly authorized
```

AionUI is the local control interface. Manus is research/setup. Gordon is
infrastructure diagnostics. v0 is an optional approved UI source. OpenClaw is
deferred by owner instruction in this pass.

### Automation/action plane

Activepieces is the currently documented bounded automation system. n8n can be
added only by an explicit architecture decision.

All action flows preserve:

```text
ANALYZE -> EXPLAIN -> REVIEW -> USER APPROVES -> EXECUTE
```

## 2. Cost routing

For non-sensitive/public/repository workloads:

```text
1. Groq free strong
2. local self-hosted if quality/latency is acceptable
3. Gemini free target
4. OpenRouter free target
5. Cerebras trial specialist
6. paid provider ONLY when paidEscalationApproved = true
```

Paid escalation is a switch, not a fallback side effect.

## 3. Personal data

"Free" does not override privacy.

Customer/case/document data can contain personal or sensitive personal data.
A free-tier quota failure must not silently move that data to another external
provider.

Preferred zero-API-cost direction:

```text
verified local/self-hosted model -> allowed after quality/privacy approval
otherwise -> BLOCK
paid privacy-approved route -> only with explicit paid + personal-data approval
```

This rule is implemented in `lib/horizon/ai/orchestration.ts`.

## 4. Why the free targets are not equivalent

- **Groq:** already integrated in HORIZON, so it is the practical first target.
  Free-plan limits exist for GPT-OSS 120B/20B and Qwen 3.8 27B.
- **Gemini free tier:** useful for free multimodal/fast work, but free-tier data
  treatment is different from paid tier, therefore keep it out of customer PII
  by default.
- **OpenRouter free:** useful as a low-volume free fallback; the free plan has
  tighter request limits and does not provide the same policy/routing controls
  as paid plans.
- **Cerebras:** current adapter is valuable, but its free access is trial credit.
- **Bedrock/OpenAI paid APIs:** quality/privacy escalation only, not default.

## 5. Agent authority levels

| Level | Authority | Typical use |
| --- | --- | --- |
| L0 | read only | audit / inspect |
| L1 | plan only | architecture / proposal |
| L2 | sandbox write + tests | bounded implementation |
| L3 | branch/commit/PR | repository worker |
| L4 | privileged engineering actions behind approval | exceptional migrations/config |
| L5 | orchestration of workers | coordination only; does not imply production mutation rights |

A high orchestration level never implies database, deployment, secret or payment
authority.

## 6. System ownership

| System | Responsibility |
| --- | --- |
| GitHub `main` | source of truth |
| Render | production deployment |
| Supabase | auth, RLS, application data |
| HORIZON Next.js | product policy, deterministic rules, approval gates |
| HORIZON AI Runtime | FREE-FIRST model selection and data-class policy |
| LiteLLM gateway (target) | common interface/routing, not product authority |
| Groq | current free-first external runtime |
| Local open model | privacy-sensitive zero-API-cost target when viable |
| Gemini/OpenRouter | free non-sensitive targets after adapters/canaries |
| Cerebras | current trial-credit specialist |
| Bedrock/OpenAI | paid escalation only |
| Activepieces | bounded automation |
| OTel collector | traces/metrics correlation with redaction |

## 7. Required audit envelope

```text
run_id
trace_id
task / phase
agent or runtime component
provider alias
model alias
cost class
prompt version
data class
approval flags
tools/actions attempted
tokens / cost / latency where available
result
```

Never log API keys, cookies, browser storage or raw production documents by
default.

## 8. Migration sequence

### Pass A — FREE-FIRST foundation
- free/strong provider priority
- paid escalation disabled by default
- fail-closed customer-data routing
- machine-readable routing policy
- tests

### Pass B — runtime adapter
- introduce one `HorizonAiRuntime`
- move assistant/chat/routing/interviewer/extraction/drafting behind it
- preserve existing Groq/Cerebras behavior until parity tests pass
- split tasks into strong / fast / multimodal model aliases

### Pass C — free adapters
- Groq strong model canary
- Groq fast model canary
- Groq multimodal canary
- implement Gemini free adapter for non-sensitive workloads
- implement OpenRouter free adapter for low-volume non-sensitive fallback
- evaluate a local open model on available VZG hardware

### Pass D — observability
- trace/model/cost-class provenance
- quota visibility
- free-tier exhaustion events
- no raw customer payload in traces

### Pass E — paid escalation, optional
Only if the owner explicitly enables it:
- add paid gateway routes
- fixed per-run budget
- canary first
- no automatic paid spend

## 9. Acceptance rule

A provider/model becomes active only after a reproducible HORIZON canary proves:
quality, schema compliance, latency, rate-limit behavior, data-class safety and
cost classification. "Free" alone is not enough, and "premium" alone is not a
reason to choose it.
