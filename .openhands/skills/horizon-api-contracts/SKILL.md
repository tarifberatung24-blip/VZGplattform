---
name: horizon-api-contracts
description: Keep API request, response, error, auth, and version contracts explicit and regression-tested.
---

Use for route handlers, server actions, webhooks, integrations, or client-server mismatches.

Define schemas at the boundary, reject unknown or invalid data where appropriate, and return stable error categories without leaking internals. Test authentication, authorization, idempotency, retries, and backward compatibility. Never use a client-provided owner ID as authorization.
