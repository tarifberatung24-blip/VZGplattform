---
name: horizon-security-review
description: Review HORIZON changes for auth, tenant isolation, secrets, unsafe logging, and approval bypasses.
---

Use before merging changes that touch auth, APIs, documents, cases, storage, integrations, or user actions.

Check authentication and authorization independently, owner scoping, server-side validation, RLS assumptions, secret handling, redirect safety, and auditability.
Reject client-only authorization and any path that executes a consequential action without user approval.
Use synthetic test identities and fixtures. Never expose environment values, service-role credentials, tokens, private URLs, or customer content.
