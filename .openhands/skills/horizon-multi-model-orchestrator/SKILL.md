---
name: horizon-multi-model-orchestrator
description: Coordinate independent model analyses for one task and produce one evidence-backed decision.
---

Use for complex reviews where multiple configured models are available.

Fan out read-only analysis with the same task envelope, repository snapshot, phase scope, and output schema. Collect results with model name, version, timestamp, tool permissions, and confidence. Deduplicate claims, identify disagreement, and ask a coordinator to synthesize.
Only one approved writer may edit a file. Never let parallel workers make competing commits, migrations, deployments, or external messages. If no model registry is configured, report that multi-model mode is unavailable instead of pretending it ran.
