---
name: horizon-retry-resilience
description: Make agent and connector workflows reliable under timeouts, rate limits, stale sessions, and partial failure.
---

Use for network tools, MCP, model calls, uploads, webhooks, or background jobs.

Use bounded exponential backoff with jitter only for retryable failures. Make writes idempotent or require a reconciliation check before retrying. Add circuit breaking for repeated failures and preserve the original error and correlation ID. Never retry a consequential action blindly.
