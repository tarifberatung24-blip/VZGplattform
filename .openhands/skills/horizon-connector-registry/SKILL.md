---
name: horizon-connector-registry
description: Register and audit external connectors with explicit capabilities, scopes, owners, and failure modes.
---

Use when adding GitHub, Supabase, Render, browser, email, calendar, storage, payment, or research connectors.

Document provider, read/write capabilities, required scopes, data classes, authentication mechanism, timeout, retry policy, and human approval boundary. Default new connectors to read-only and least privilege. Never place credentials in skills, logs, prompts, or repository files.
