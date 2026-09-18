# CLINE START HERE

This directory is a **reference/source pack only**. Do not modify production code, schema, migrations, environment variables, deployment configuration, or provider credentials because of these files alone.

## Reading order

1. Read the repository root `PROJECT_RULES.md` first.
2. Read the pinned BlackRock blueprints under `blackrock/`.
3. Read the Claude Capital references under `claude/`, including `CAPITAL_LAYER_PLAN.md`, `types.ts`, `strategy-engine.ts`, `roadmap.ts`, and `capital-foundation.sql`.
4. Read `claude/HAMMEL_VZG_CAPITAL_PRODUCT_VISION.txt` for the product concept.
5. Use `BLACKROCK_SOURCE_MAP.md` to translate blueprint concepts into VZG concepts.

## Non-negotiable interpretation rules

- Use BlackRock material only as an **architectural and workflow reference**.
- Do not copy BlackRock branding, product names, trademarks, visual identity, or proprietary claims into VZG.
- Do not claim BlackRock, Aladdin, or Advisor Center affiliation or endorsement.
- AI must not perform financial mathematics. Deterministic, versioned engines calculate amounts, projections, feasibility, and scenarios.
- The lifecycle is: **draft → advisor review → publish → customer**.
- Use versioning, provenance, audit events, idempotency, SHA-256 payload hashing, and publish validation.
- Keep advisor/customer data separated and enforce strict RLS.
- Missing data must be explicit; do not invent values or silently substitute assumptions.
- Provider adapters are disabled by default and require entitlement and capability approval before activation.
- No trading, purchases, official submissions, or other consequential actions are implied by this reference pack.

When implementing anything later, first prove that the requested change is allowed by `PROJECT_RULES.md`, identify the smallest production-safe diff, and keep this directory separate from runtime code.
