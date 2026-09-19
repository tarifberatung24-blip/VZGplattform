# VZGplattform AI Workflow

## Canonical Identity

- **LEGAL ENTITY:** `Tarifberater24`
- **EXPERT BRAND:** `VZG CONSULT`
- **PRODUCT:** `HORIZON by VZG`
- **CODEBASE:** `VZGplattform`

Do not use these four names interchangeably. Details are in `PROJECT_RULES.md`.

## Standard Workflow

1. READ
2. DEFINE SCOPE
3. INSPECT LATEST MAIN
4. CREATE FOCUSED BRANCH
5. IMPLEMENT SMALL CHANGE
6. VALIDATE
7. OPEN PR
8. REVIEW
9. OWNER APPROVES
10. MERGE
11. DEPLOY IF AUTHORIZED
12. VERIFY
13. HANDOFF

Never allow two agents to modify the same module at the same time. Do not invent missing data. Deployment and merge require explicit owner approval.

## Roles

- **CHATGPT:** architecture, orchestration, planning, prompt design, review
- **AIONUI:** local multi-agent workspace / control interface
- **OPENHANDS:** focused repository implementation, testing, branches, PRs
- **OPENCLAW:** reusable local AI agent, usable through AionUi when available
- **MANUS:** research, source gathering, setup work
- **GORDON:** Docker diagnostics and environment optimization
- **v0:** optional approved UI/design implementation source
- **GITHUB MAIN:** source of truth — `tarifberatung24-blip/VZGplattform` (`main`)
- **RENDER:** current production deployment, from GitHub `main`

## Product Principle

`HORIZON by VZG` follows:

`DATA → UNDERSTANDING → RISK / OPPORTUNITY ANALYSIS → DECISION SUPPORT → ACTION → MONITORING`

User-facing execution follows:

`ANALYZE → EXPLAIN → REVIEW → USER APPROVES → EXECUTE`

Critical logic is deterministic, versioned, source-backed, and explainable. Missing data must be surfaced as a blocker, never filled with invented tax outcomes, savings, eligibility, OCR, API responses, or government/form mappings.

## Required Task Completion Report

```text
TASK:
STATUS:
FILES CHANGED:
COMMIT:
TYPECHECK:
BUILD:
TESTS:
DEPLOYMENT:
HTTP CHECK:
BLOCKERS:
NOT IMPLEMENTED:
NEXT RECOMMENDED STEP:
```
