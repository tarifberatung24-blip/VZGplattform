# VZGplattform AI Workflow

## Canonical Identity

- **LEGAL ENTITY:** `Tarifberater24`
- **EXPERT BRAND:** `VZG CONSULT`
- **PRODUCT:** `HAMMAL by VZG`
- **CODEBASE:** `VZGplattform`

Do not use these four names interchangeably. Details are in `PROJECT_RULES.md`.

## Standard Workflow

1. READ
2. DEFINE SCOPE
3. INSPECT EXISTING IMPLEMENTATION
4. IMPLEMENT IN SMALL PASSES
5. DO NOT INVENT MISSING DATA
6. VALIDATE LOCALLY
7. COMMIT
8. DEPLOY
9. VERIFY REAL ROUTES
10. HANDOFF

Never allow two agents to modify the same module at the same time.

## Roles

- **CHATGPT:** architecture, orchestration, planning, prompt design, review
- **v0:** Next.js product implementation, UI, application flows
- **MANUS:** research, complex engineering, backend/integration work
- **GITHUB COPILOT:** repository-level fixes, debugging, code review
- **GITHUB MAIN:** source of truth — `tarifberatung24-blip/VZGplattform` (`main`)
- **VERCEL:** production deployment

## Product Principle

`HAMMAL by VZG` follows:

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
