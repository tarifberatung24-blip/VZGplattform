---
name: horizon-model-routing
description: Select models by task type, risk, latency, and available tools rather than blindly invoking every model.
---

Use when choosing workers for coding, UI, research, security, extraction, or review.

Route by capability and verified availability. The executable router is `scripts/ai-router.mjs`; it accepts task text, image attachments, and capability errors. Require a fast path for low-risk tasks and a quorum path for high-impact decisions. Visual inputs always use `vision-scanner` (`qwen3-vl:8b`) first; never silently send an image to a text-only model. Include explicit fallback and timeout behavior. Do not send secrets or customer data to a model/provider whose data policy and scope are unknown.
