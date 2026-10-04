---
name: horizon-incident-response
description: Triage failures across models, tools, app routes, storage, and deployment with safe containment and evidence.
---

Use for outages, data-integrity concerns, runaway loops, connector failures, or unexpected external actions.

Contain first: stop autonomous writes, disable the failing connector or worker, and preserve correlation IDs and minimal safe evidence. Classify impact and affected scope. Reproduce with synthetic data, identify the first bad boundary, add a regression test, and document recovery. Do not erase logs or rewrite history to hide a failure.
